import { text, type CoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import {
  getPreparedState,
  prepared,
  setPreparedState,
} from "./prepared-state.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import "./source-card-element.js";
import {
  createPopupViewModel,
  type PopupRequest,
  type PopupViewModel,
} from "./popup.js";
import { assertVocalizationMode } from "./vocalization-display.js";

const POPUP_VERSIONS = ["primary", "translation"] as const;

/** Anchored dialog that renders supplied or acquired popup data. */
export class SefariaPopup extends SefariaElement {
  /** Lit property metadata for declarative data and interaction state. */
  static override properties = {
    sref: { type: String },
    data: { attribute: false },
    acquisition: { attribute: false },
    anchor: { attribute: false },
    open: { type: Boolean, reflect: true },
    vocalizationMode: { type: String, attribute: "vocalization-mode" },
  };

  /** Popup layout, viewport placement, and isolated dialog styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        position: fixed;
        inset: auto;
        z-index: 2147483647;
        display: none;
        width: min(38rem, calc(100vw - 1rem));
        max-height: min(42rem, calc(100vh - 1rem));
      }

      :host([open]) {
        display: block;
      }

      .dialog {
        position: relative;
        max-height: inherit;
        overflow: auto;
        border: 1px solid var(--_sefaria-border);
        border-block-start: 0.3rem solid var(--_sefaria-accent);
        border-radius: 0.75rem;
        background: var(--_sefaria-surface);
        box-shadow: var(--_sefaria-shadow);
        scrollbar-color: var(--_sefaria-border-strong) transparent;
      }

      .chrome {
        position: sticky;
        z-index: 2;
        inset-block-start: 0;
        display: flex;
        min-height: 3.5rem;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.55rem 0.75rem 0.55rem 1rem;
        border-block-end: 1px solid var(--_sefaria-border);
        background: color-mix(
          in srgb,
          var(--_sefaria-surface) 94%,
          transparent
        );
        backdrop-filter: blur(12px);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--_sefaria-fg-muted);
        font-family: system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .brand-mark {
        display: inline-block;
        width: 1.1rem;
        height: 1.1rem;
        border: 0.2rem solid var(--_sefaria-accent);
        border-radius: 50%;
      }

      .close-button {
        display: inline-grid;
        min-width: 2.75rem;
        min-height: 2.75rem;
        place-items: center;
        margin: 0;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        background: var(--_sefaria-surface);
        color: var(--_sefaria-fg);
        font: inherit;
        font-size: 1.25rem;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }

      .close-button:hover {
        border-color: var(--_sefaria-accent);
        background: var(--_sefaria-accent-soft);
      }

      .close-button:focus-visible {
        outline: 3px solid var(--_sefaria-accent);
        outline-offset: 2px;
        border-color: var(--_sefaria-accent);
      }

      sefaria-source-card {
        display: block;
        border: 0;
        border-radius: 0;
        padding-block-start: 0;
      }

      .notice {
        margin: 0;
        padding: 0 1.25rem 1.25rem;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875rem;
      }

      .state {
        margin: 0;
        padding: 2rem 1.25rem;
        line-height: 1.5;
      }

      .state[role="alert"] {
        color: var(--_sefaria-danger);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.45rem;
        min-height: 2.75rem;
        padding: 0.65rem 1.25rem;
        border-block-start: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
        color: var(--_sefaria-fg-muted);
        font-family: system-ui, sans-serif;
        font-size: 0.75rem;
      }

      .footer strong {
        color: var(--_sefaria-fg);
        font-weight: 600;
      }

      @media (max-width: 30rem) {
        :host {
          width: calc(100vw - 1rem);
        }

        .chrome {
          min-height: 3.25rem;
        }

        sefaria-source-card {
          --sefaria-font-scale: 0.95;
        }
      }
    `,
  ];

  /** Reference prepared while the connected popup is open or closed. */
  declare sref: string;

  /** Authoritative corrected v3 text response data. */
  declare data: unknown | undefined;

  /** Optional element-specific acquisition source. */
  declare acquisition: SefariaAcquisition | undefined;

  /** Host element used for placement and focus restoration. */
  declare anchor: HTMLElement | null;

  /** Whether the dialog is visible. */
  declare open: boolean;
  /** Hebrew vocalization preset applied to the nested source card. */
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
  #committedViewModel: PopupViewModel | undefined;
  #ownedViewModel: PopupViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.acquisition = undefined;
    this.anchor = null;
    this.open = false;
    this.vocalizationMode = "taamim_and_nikkud";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.#handleViewportChange);
    window.addEventListener("scroll", this.#handleViewportChange, true);
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
    window.removeEventListener("resize", this.#handleViewportChange);
    window.removeEventListener("scroll", this.#handleViewportChange, true);
    if (this.#active !== undefined) {
      this.#active.controller.abort(
        new DOMException("Popup disconnected.", "AbortError"),
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

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has("open")) {
      if (this.open) {
        this.#place();
        this.renderRoot
          .querySelector<HTMLButtonElement>(".close-button")
          ?.focus();
      } else if (changed.get("open") === true) {
        this.anchor?.focus();
      }
    }
    if (this.open && changed.has("anchor")) {
      this.#place();
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    assertVocalizationMode(this.vocalizationMode);
    if (!this.open) {
      return nothing;
    }

    return html`
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Sefaria source preview"
        @keydown=${this.#handleKeydown}
      >
        <header class="chrome">
          <span class="brand" aria-hidden="true">
            <span class="brand-mark"></span>
            Sefaria source
          </span>
          <button
            class="close-button"
            type="button"
            aria-label="Close source preview"
            @click=${this.#close}
          >
            ×
          </button>
        </header>
        ${this.#renderContent()}
        <footer class="footer">
          <span>Powered by</span>
          <strong>Sefaria</strong>
        </footer>
      </section>
    `;
  }

  #renderContent(): TemplateResult {
    const viewModel = this.#viewModel;
    if (viewModel === undefined) {
      return html`<p class="state" role="status">Loading source.</p>`;
    }
    if (viewModel.state === "loading") {
      return html`<p class="state" role="status" aria-live="polite">
        ${viewModel.message}
      </p>`;
    }
    if (viewModel.state === "error") {
      return html`<p class="state" role="alert">${viewModel.message}</p>`;
    }
    return html`
      <sefaria-source-card
        ${prepared(viewModel.card)}
        .vocalizationMode=${this.vocalizationMode}
      ></sefaria-source-card>
      ${
        viewModel.truncated
          ? html`<p class="notice" role="status">
              Showing the first 20 source positions.
            </p>`
          : nothing
      }
    `;
  }

  #close = (): void => {
    const accepted = this.dispatchEvent(
      new CustomEvent("sefaria-popup-close", {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    if (accepted) this.open = false;
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.#close();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = collectFocusable(this.renderRoot);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (
      first === undefined ||
      last === undefined ||
      (event.shiftKey && deepestActiveElement(this.shadowRoot) === first) ||
      (!event.shiftKey && deepestActiveElement(this.shadowRoot) === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  #handleViewportChange = (): void => {
    if (this.open) {
      this.#place();
    }
  };

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }
    if (this.data !== undefined) {
      this.#declarativeActive = true;
      this.#cancelActive("Superseded by supplied popup data.");
      try {
        this.#commit(this.#project(this.data, 200));
      } catch (error) {
        this.#commit({
          state: "error",
          errorKind: "validation",
          message:
            error instanceof Error
              ? error.message
              : "Supplied popup data is invalid.",
        });
      }
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Popup inputs were cleared.");
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad(sref);
  }

  #startLoad(sref: string): void {
    this.#cancelActive("Superseded popup load.");
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
      this.#publishAcquisitionFailure(error, "Popup acquisition failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-popup-error", {
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
    const result = await text.getV3Texts({
      client,
      path: { tref: sref },
      query: {
        version: [...POPUP_VERSIONS],
        return_format: "default",
      },
      signal,
    });
    if (result.data !== undefined) {
      return { payload: result.data, status: 200 };
    }
    if (result.error !== undefined && result.response !== undefined) {
      return { payload: result.error, status: result.response.status };
    }
    throw new Error("The popup v3 text request returned no result.");
  }

  async #loadFromCapability(
    sref: string,
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
      {
        sref,
        versions: POPUP_VERSIONS,
        returnFormat: "default",
      },
      signal,
    );
  }

  #project(payload: unknown, status: number, sref?: string): PopupViewModel {
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
      throw new Error(`Unsupported popup response status ${status}.`);
    }
    const validated = validateSuppliedComponentData<CoreV3TextsResponse>(
      { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
      payload,
    );
    const request: PopupRequest = {
      tref: sref?.trim() || validated.ref,
    };
    return createPopupViewModel(validated, request);
  }

  #cancelActive(message: string): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.controller.abort(new DOMException(message, "AbortError"));
  }

  get #viewModel(): PopupViewModel | undefined {
    return getPreparedState<PopupViewModel>(this);
  }

  #publish(viewModel: PopupViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: PopupViewModel): void {
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

  #place(): void {
    const anchor = this.anchor;
    if (anchor === null) {
      this.style.left = "0.5rem";
      this.style.top = "0.5rem";
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(608, window.innerWidth - margin * 2);
    const height = Math.min(
      this.getBoundingClientRect().height || 672,
      window.innerHeight - margin * 2,
    );
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin),
    );
    const below = rect.bottom + margin;
    const preferredTop =
      below + height <= window.innerHeight ? below : rect.top - height - margin;
    const top = Math.max(
      margin,
      Math.min(preferredTop, window.innerHeight - height - margin),
    );
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
  }
}

function statusOf(viewModel: PopupViewModel | undefined): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data") return "ready";
  return viewModel.state;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function collectFocusable(root: ParentNode): HTMLElement[] {
  const focusable: HTMLElement[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.matches(FOCUSABLE_SELECTOR)) {
      focusable.push(element);
    }
    if (element.shadowRoot !== null) {
      focusable.push(...collectFocusable(element.shadowRoot));
    }
  }
  return focusable;
}

function deepestActiveElement(root: ShadowRoot | null): Element | null {
  let active = root?.activeElement ?? null;
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

if (!customElements.get("sefaria-popup")) {
  customElements.define("sefaria-popup", SefariaPopup);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-popup": SefariaPopup;
  }
}
