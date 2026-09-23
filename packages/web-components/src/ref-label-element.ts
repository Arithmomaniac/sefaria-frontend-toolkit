import { ref, type CoreRefResponse } from "@arithmomaniac/sefaria-client";
import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";

import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import { getPreparedState, setPreparedState } from "./prepared-state.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import {
  createRefLabelViewModel,
  type RefLabelDataViewModel,
  type RefLabelViewModel,
} from "./ref-label.js";

/** Label language rendered by `<sefaria-ref-label>`. */
export type RefLabelLanguage = "english" | "hebrew" | "both";

/** Custom element that renders supplied or acquired reference-label data. */
export class SefariaRefLabel extends SefariaElement {
  /** Lit property metadata for declarative data and presentation. */
  static override properties = {
    sref: { type: String, useDefault: true },
    data: { attribute: false },
    acquisition: { attribute: false },
    labelLanguage: { attribute: "label-language", useDefault: true },
    linked: { type: Boolean },
  };

  /** Reference-label typography, link, focus, and containment styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        min-width: 0;
        max-width: 100%;
      }

      .label,
      a {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      a {
        color: var(--_sefaria-link);
      }

      a:focus-visible {
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 0.2em;
      }

      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .english {
        font-family: var(--_sefaria-font-english);
      }

      .both {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.35em;
      }
    `,
  ];

  /** Reference loaded when authoritative supplied data is absent. */
  declare sref: string;

  /** Authoritative corrected reference response data. */
  declare data: unknown | undefined;

  /** Optional element-specific acquisition source. */
  declare acquisition: SefariaAcquisition | undefined;

  /** Label language selected by the host. */
  declare labelLanguage: RefLabelLanguage;

  /** Whether data-state labels render as canonical links. */
  declare linked: boolean;

  #active:
    | {
        readonly id: number;
        readonly controller: AbortController;
      }
    | undefined;
  #nextOperationId = 1;
  #declarativeActive = false;
  #resumeOnConnect = false;
  #committedViewModel: RefLabelViewModel | undefined;
  #ownedViewModel: RefLabelViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.acquisition = undefined;
    this.labelLanguage = "english";
    this.linked = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.#resumeOnConnect) {
      queueMicrotask(() => {
        if (this.isConnected && this.#resumeOnConnect) {
          this.#resumeOnConnect = false;
          this.#reconcile();
        }
      });
    }
  }

  override disconnectedCallback(): void {
    if (this.#active !== undefined) {
      this.#active.controller.abort(
        new DOMException("Reference label disconnected.", "AbortError"),
      );
      this.#active = undefined;
      this.#resumeOnConnect = true;
    }
    super.disconnectedCallback();
  }

  /** Coarse lifecycle state without exposing prepared rendering data. */
  get status(): SefariaElementStatus {
    return this.#statusOverride ?? statusOf(this.#viewModel);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("sref") ||
      changed.has("data") ||
      changed.has("acquisition")
    ) {
      this.#resumeOnConnect = false;
      this.#reconcile();
    }
  }

  protected override render() {
    const viewModel = this.#viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
      case "empty":
        return html`<span role="status" aria-live="polite">
          ${viewModel.message}
        </span>`;
      case "error":
        return html`<span role="alert">${viewModel.message}</span>`;
      case "data":
        return this.#renderData(viewModel);
    }
  }

  #renderData(viewModel: RefLabelDataViewModel): TemplateResult {
    const label = this.#renderLabel(viewModel);
    return this.linked
      ? html`<a href=${viewModel.url}>${label}</a>`
      : html`<span class="label">${label}</span>`;
  }

  #renderLabel(viewModel: RefLabelDataViewModel): TemplateResult {
    const english = html`<span class="english" lang="en" dir="ltr"
      >${viewModel.normalized}</span
    >`;
    const hebrew = html`<span class="hebrew" lang="he" dir="rtl"
      >${viewModel.hebrew}</span
    >`;

    switch (this.labelLanguage) {
      case "hebrew":
        return hebrew;
      case "both":
        return html`<span class="both">${english}${hebrew}</span>`;
      case "english":
      default:
        return english;
    }
  }

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }
    if (this.data !== undefined) {
      this.#declarativeActive = true;
      this.#cancelActive("Superseded by supplied reference-label data.");
      try {
        this.#commit(this.#project(this.data, 200, this.sref));
      } catch (error) {
        this.#commit({
          state: "error",
          errorKind: "validation",
          message:
            error instanceof Error
              ? error.message
              : "Supplied reference-label data is invalid.",
        });
      }
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Reference-label inputs were cleared.");
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad(sref);
  }

  #startLoad(sref: string): void {
    this.#cancelActive("Superseded reference-label load.");
    const active = {
      id: this.#nextOperationId++,
      controller: new AbortController(),
    };
    this.#active = active;
    this.#publish({
      state: "loading",
      message: `Loading ${sref}.`,
    });
    void this.#load(sref, active);
  }

  async #load(
    sref: string,
    active: { readonly id: number; readonly controller: AbortController },
  ): Promise<void> {
    try {
      const acquisition = resolveSefariaAcquisition(this.acquisition);
      if (acquisition.kind === "disabled") {
        throw new Error("Standalone Sefaria acquisition is disabled.");
      }
      const response =
        acquisition.kind === "client"
          ? await this.#loadFromClient(
              sref,
              acquisition.client,
              active.controller.signal,
            )
          : await this.#loadFromCapability(
              sref,
              acquisition.capability,
              active.controller.signal,
            );
      if (this.#active !== active) return;
      const viewModel = this.#project(response.payload, response.status, sref);
      if (this.#active !== active) return;
      this.#active = undefined;
      this.#commit(viewModel);
    } catch (error) {
      if (this.#active !== active) return;
      this.#active = undefined;
      if (active.controller.signal.aborted) return;
      this.#publishAcquisitionFailure(error, "Reference acquisition failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-ref-label-error", {
          bubbles: true,
          composed: true,
          detail: { error, sref },
        }),
      );
    }
  }

  async #loadFromClient(
    sref: string,
    client: Extract<SefariaAcquisition, { kind: "client" }>["client"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    const result = await ref.getRef({
      client,
      path: { tref: sref },
      signal,
    });
    if (result.data !== undefined) {
      return { payload: result.data, status: 200 };
    }
    if (result.error !== undefined && result.response?.status === 404) {
      return { payload: result.error, status: 404 };
    }
    throw new Error(
      "The reference request returned no data or documented error.",
    );
  }

  async #loadFromCapability(
    sref: string,
    capability: Extract<
      SefariaAcquisition,
      { kind: "capability" }
    >["capability"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    if (capability.resolveReference === undefined) {
      throw new Error(
        "The selected acquisition source does not support reference resolution.",
      );
    }
    return await capability.resolveReference({ sref }, signal);
  }

  #project(payload: unknown, status: number, sref: string): RefLabelViewModel {
    if (status === 404) {
      const validated = validateSuppliedComponentData<{
        readonly error: string;
      }>({ method: "GET", path: "/api/ref/{tref}", status }, payload);
      return {
        state: "error",
        errorKind: "http",
        status,
        message: validated.error,
      };
    }
    if (status !== 200) {
      throw new Error(`Unsupported reference response status ${status}.`);
    }
    const validated = validateSuppliedComponentData<CoreRefResponse>(
      { method: "GET", path: "/api/ref/{tref}", status },
      payload,
    );
    return createRefLabelViewModel(validated, {
      tref:
        sref.trim() ||
        (validated.is_ref ? validated.normalized : "Unresolved reference"),
    });
  }

  #cancelActive(message: string): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.controller.abort(new DOMException(message, "AbortError"));
  }

  get #viewModel(): RefLabelViewModel | undefined {
    return getPreparedState<RefLabelViewModel>(this);
  }

  #publish(viewModel: RefLabelViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: RefLabelViewModel): void {
    this.#committedViewModel = viewModel;
    this.#publish(viewModel);
  }

  #clear(): void {
    this.#committedViewModel = undefined;
    if (this.#viewModel === this.#ownedViewModel) this.#publish(undefined);
    this.#ownedViewModel = undefined;
  }

  #publishAcquisitionFailure(error: unknown, fallback: string): void {
    this.#statusOverride = "error";
    const viewModel = this.#committedViewModel ?? {
      state: "error",
      errorKind: "acquisition",
      message: error instanceof Error ? error.message : fallback,
    };
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }
}

function statusOf(
  viewModel: RefLabelViewModel | undefined,
): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data") return "ready";
  return viewModel.state;
}

if (!customElements.get("sefaria-ref-label")) {
  customElements.define("sefaria-ref-label", SefariaRefLabel);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-ref-label": SefariaRefLabel;
  }
}
