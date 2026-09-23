import { text, type CoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import { css, html, nothing, type PropertyValues } from "lit";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import {
  bilingualPairStyles,
  renderBilingualPair,
  type BilingualPairContentLanguage,
  type BilingualPairLayout,
  type BilingualPairSideOrder,
} from "./bilingual-pair.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import { getPreparedState, setPreparedState } from "./prepared-state.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import type {
  BilingualSegmentRequest,
  BilingualSegmentViewModel,
} from "./bilingual-segment.js";
import {
  createBilingualSegmentViewModel,
  serializeBilingualSegmentSelectors,
} from "./bilingual-segment.js";
import { assertVocalizationMode } from "./vocalization-display.js";

/** Sides an element renders for one `contentLanguage` value. */
export type BilingualSegmentContentLanguage = BilingualPairContentLanguage;

/** Arrangement of the two sides. */
export type BilingualSegmentLayout = BilingualPairLayout;

/** Which role occupies the first side-by-side track. */
export type BilingualSegmentSideOrder = BilingualPairSideOrder;

/** Custom element that renders supplied or acquired bilingual-segment data. */
export class SefariaBilingualSegment extends SefariaElement {
  /** Lit property metadata for declarative data and presentation state. */
  static override properties = {
    sref: { type: String },
    data: { attribute: false },
    acquisition: { attribute: false },
    primaryVersionTitle: {
      type: String,
      attribute: "primary-version-title",
    },
    translationVersionTitle: {
      type: String,
      attribute: "translation-version-title",
    },
    contentLanguage: { type: String, attribute: "content-language" },
    layout: { type: String },
    sideOrder: { type: String, attribute: "side-order" },
    vocalizationMode: { type: String, attribute: "vocalization-mode" },
  };

  /** Bilingual pairing, container-driven layout, and absent-side styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        max-width: 100%;
        min-width: 0;
      }
    `,
    bilingualPairStyles,
  ];

  /** Reference loaded when authoritative supplied data is absent. */
  declare sref: string;
  /** Authoritative corrected response-shaped data. */
  declare data: unknown | undefined;
  /** Optional element-specific acquisition source. */
  declare acquisition: SefariaAcquisition | undefined;
  /** Optional exact edition title for the primary role. */
  declare primaryVersionTitle: string | undefined;
  /** Optional exact edition title for the translation role. */
  declare translationVersionTitle: string | undefined;

  /** Sides the host wants displayed. */
  declare contentLanguage: BilingualSegmentContentLanguage;

  /** Requested arrangement of the two sides. */
  declare layout: BilingualSegmentLayout;

  /** Requested role order for a side-by-side arrangement. */
  declare sideOrder: BilingualSegmentSideOrder;
  /** Hebrew vocalization preset applied to both displayed roles. */
  declare vocalizationMode: VocalizationMode;

  #active:
    | {
        readonly id: number;
        readonly controller: AbortController;
      }
    | undefined;
  #nextOperationId = 1;
  #declarativeActive = false;
  #resumeOnConnect = false;
  #committedViewModel: BilingualSegmentViewModel | undefined;
  #ownedViewModel: BilingualSegmentViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.acquisition = undefined;
    this.primaryVersionTitle = undefined;
    this.translationVersionTitle = undefined;
    this.contentLanguage = "both";
    this.layout = "auto";
    this.sideOrder = "primary-first";
    this.vocalizationMode = "taamim_and_nikkud";
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
        new DOMException("Bilingual segment disconnected.", "AbortError"),
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
      changed.has("acquisition") ||
      changed.has("primaryVersionTitle") ||
      changed.has("translationVersionTitle")
    ) {
      this.#resumeOnConnect = false;
      this.#reconcile();
    }
  }

  protected override render() {
    assertVocalizationMode(this.vocalizationMode);
    const viewModel = this.#viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
        return html`<p role="status" aria-live="polite">
          ${viewModel.message}
        </p>`;
      case "error":
        return html`<p role="alert">${viewModel.message}</p>`;
      default:
        return renderBilingualPair(viewModel, {
          contentLanguage: this.contentLanguage,
          layout: this.layout,
          sideOrder: this.sideOrder,
          vocalizationMode: this.vocalizationMode,
        });
    }
  }

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }
    if (this.data !== undefined) {
      this.#declarativeActive = true;
      this.#cancelActive("Superseded by supplied bilingual-segment data.");
      try {
        this.#commit(this.#project(this.data, 200));
      } catch (error) {
        this.#commit({
          state: "error",
          errorKind: "validation",
          message:
            error instanceof Error
              ? error.message
              : "Supplied bilingual-segment data is invalid.",
        });
      }
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Bilingual-segment inputs were cleared.");
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad(sref);
  }

  #startLoad(sref: string): void {
    this.#cancelActive("Superseded bilingual-segment load.");
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
      const request = this.#request(sref);
      const versions = serializeBilingualSegmentSelectors(request);
      const acquisition = resolveSefariaAcquisition(this.acquisition);
      if (acquisition.kind === "disabled") {
        throw new Error("Standalone Sefaria acquisition is disabled.");
      }
      const response =
        acquisition.kind === "client"
          ? await this.#loadFromClient(
              sref,
              versions,
              acquisition.client,
              active.controller.signal,
            )
          : await this.#loadFromCapability(
              sref,
              versions,
              acquisition.capability,
              active.controller.signal,
            );
      if (this.#active !== active) return;
      const viewModel = this.#project(
        response.payload,
        response.status,
        request,
      );
      if (this.#active !== active) return;
      this.#active = undefined;
      this.#commit(viewModel);
    } catch (error) {
      if (this.#active !== active) return;
      this.#active = undefined;
      if (active.controller.signal.aborted) return;
      this.#publishAcquisitionFailure(
        error,
        "Bilingual text acquisition failed.",
      );
      this.dispatchEvent(
        new CustomEvent("sefaria-bilingual-segment-error", {
          bubbles: true,
          composed: true,
          detail: { error, sref },
        }),
      );
    }
  }

  async #loadFromClient(
    sref: string,
    versions: readonly string[],
    client: Extract<SefariaAcquisition, { kind: "client" }>["client"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    const result = await text.getV3Texts({
      client,
      path: { tref: sref },
      query: { version: [...versions], return_format: "default" },
      signal,
    });
    if (result.data !== undefined) {
      return { payload: result.data, status: 200 };
    }
    if (result.error !== undefined && result.response !== undefined) {
      return { payload: result.error, status: result.response.status };
    }
    throw new Error("The v3 texts request returned no result.");
  }

  async #loadFromCapability(
    sref: string,
    versions: readonly string[],
    capability: Extract<
      SefariaAcquisition,
      { kind: "capability" }
    >["capability"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    if (capability.getText === undefined) {
      throw new Error("The selected acquisition source does not support text.");
    }
    return await capability.getText(
      { sref, versions, returnFormat: "default" },
      signal,
    );
  }

  #project(
    payload: unknown,
    status: number,
    request?: BilingualSegmentRequest,
  ): BilingualSegmentViewModel {
    if (status === 400 || status === 404) {
      const validated = validateSuppliedComponentData<{
        readonly error: string;
      }>({ method: "GET", path: "/api/v3/texts/{tref}", status }, payload);
      return {
        state: "error",
        errorKind: "http",
        status,
        message: validated.error,
      };
    }
    if (status !== 200) {
      throw new Error(`Unsupported text response status ${status}.`);
    }
    const validated = validateSuppliedComponentData<CoreV3TextsResponse>(
      { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
      payload,
    );
    return createBilingualSegmentViewModel(
      validated,
      request ?? this.#request(this.sref.trim() || validated.ref),
    );
  }

  #request(sref: string): BilingualSegmentRequest {
    return {
      tref: sref,
      ...(this.primaryVersionTitle === undefined
        ? {}
        : { primary: { versionTitle: this.primaryVersionTitle } }),
      ...(this.translationVersionTitle === undefined
        ? {}
        : { translation: { versionTitle: this.translationVersionTitle } }),
    };
  }

  #cancelActive(message: string): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.controller.abort(new DOMException(message, "AbortError"));
  }

  get #viewModel(): BilingualSegmentViewModel | undefined {
    return getPreparedState<BilingualSegmentViewModel>(this);
  }

  #publish(viewModel: BilingualSegmentViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: BilingualSegmentViewModel): void {
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
      errorKind: "validation",
      message: error instanceof Error ? error.message : fallback,
    };
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }
}

function statusOf(
  viewModel: BilingualSegmentViewModel | undefined,
): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data" || viewModel.state === "partial") {
    return "ready";
  }
  return viewModel.state;
}

if (!customElements.get("sefaria-bilingual-segment")) {
  customElements.define("sefaria-bilingual-segment", SefariaBilingualSegment);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-bilingual-segment": SefariaBilingualSegment;
  }
}
