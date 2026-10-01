import type { CoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import { css, html, nothing, type PropertyValues } from "lit";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import type { SefariaDataSource } from "./data-source.js";
import { resolveSefariaDataSource } from "./data-source-state.js";
import { optionalStringConverter } from "./attribute-converters.js";
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
import {
  acquireSelectedText,
  normalizeTranslationFallback,
  type SelectedTextProgress,
} from "./translation-selection.js";

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
    sref: { type: String, useDefault: true },
    data: { attribute: false },
    source: { attribute: false },
    translationLanguage: {
      type: String,
      attribute: "translation-language",
      converter: optionalStringConverter,
    },
    translationFallback: {
      type: String,
      attribute: "translation-fallback",
      reflect: true,
      useDefault: true,
    },
    primaryVersionTitle: {
      type: String,
      attribute: "primary-version-title",
      converter: optionalStringConverter,
    },
    translationVersionTitle: {
      type: String,
      attribute: "translation-version-title",
      converter: optionalStringConverter,
    },
    contentLanguage: {
      type: String,
      attribute: "content-language",
      useDefault: true,
    },
    layout: { type: String, useDefault: true },
    sideOrder: {
      type: String,
      attribute: "side-order",
      useDefault: true,
    },
    vocalizationMode: {
      type: String,
      attribute: "vocalization-mode",
      useDefault: true,
    },
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

  /** The Sefaria reference to load when `data` isn't set. */
  declare sref: string;
  /** Sefaria API response data to render. When it's set, the element doesn't fetch anything. */
  declare data: unknown | undefined;
  /** Where this element gets its data, instead of the shared data source. */
  declare source: SefariaDataSource | undefined;
  /** Exact title of the edition to show as the primary text. */
  declare primaryVersionTitle: string | undefined;
  /** Exact title of the edition to show as the translation. */
  declare translationVersionTitle: string | undefined;
  /** Preferred translation language. `translationFallback` controls what happens when Sefaria has none. */
  declare translationLanguage: string | undefined;
  /** What happens when the preferred translation language is missing: `default` loads Sefaria's default translation, `none` shows a status such as "No french text.". */
  declare translationFallback: "default" | "none";

  /** Which text to show: `primary`, `translation` or `both`. */
  declare contentLanguage: BilingualSegmentContentLanguage;

  /** How the two texts are arranged: `auto`, `stacked` or `side-by-side`. */
  declare layout: BilingualSegmentLayout;

  /** Which text comes first side by side: `primary-first` or `translation-first`. */
  declare sideOrder: BilingualSegmentSideOrder;
  /** How much Hebrew vowel and cantillation marking to keep. `none` removes both. */
  declare vocalizationMode: VocalizationMode;

  #active:
    | {
        readonly id: number;
        readonly controller: AbortController;
        readonly progress: SelectedTextProgress;
      }
    | undefined;
  #nextOperationId = 1;
  #declarativeActive = false;
  #resumeOnConnect = false;
  #interruptedProgress: SelectedTextProgress | undefined;
  #committedViewModel: BilingualSegmentViewModel | undefined;
  #ownedViewModel: BilingualSegmentViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.source = undefined;
    this.primaryVersionTitle = undefined;
    this.translationVersionTitle = undefined;
    this.translationLanguage = undefined;
    this.translationFallback = "none";
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
      this.#interruptedProgress = this.#active.progress;
      this.#active.controller.abort(
        new DOMException("Bilingual segment disconnected.", "AbortError"),
      );
      this.#active = undefined;
      this.#resumeOnConnect = true;
    }
    super.disconnectedCallback();
  }

  /** Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. */
  get status(): SefariaElementStatus {
    return this.#statusOverride ?? statusOf(this.#viewModel);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("sref") ||
      changed.has("data") ||
      changed.has("source") ||
      changed.has("primaryVersionTitle") ||
      changed.has("translationLanguage") ||
      changed.has("translationFallback") ||
      changed.has("translationVersionTitle")
    ) {
      this.#interruptedProgress = undefined;
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
        return html`${renderBilingualPair(viewModel, {
          contentLanguage: this.contentLanguage,
          layout: this.layout,
          sideOrder: this.sideOrder,
          vocalizationMode: this.vocalizationMode,
        })}`;
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
      progress: this.#interruptedProgress ?? { fallback: false },
    };
    this.#interruptedProgress = undefined;
    this.#active = active;
    this.#publish({
      state: "loading",
      message: `Loading ${sref}.`,
    });
    void this.#load(sref, active);
  }

  async #load(
    sref: string,
    active: {
      readonly id: number;
      readonly controller: AbortController;
      readonly progress: SelectedTextProgress;
    },
  ): Promise<void> {
    try {
      const request = this.#request(sref);
      const versions = serializeBilingualSegmentSelectors(request);
      const source = resolveSefariaDataSource(this.source);
      if (source.kind === "disabled") {
        throw new Error("Sefaria data loading is disabled.");
      }
      const response = await acquireSelectedText(
        source,
        sref,
        versions,
        request.translationLanguage,
        request.translationFallback ?? "none",
        active.controller.signal,
        active.progress,
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
      this.#publishDataSourceFailure(error, "Bilingual text loading failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-bilingual-segment-error", {
          bubbles: true,
          composed: true,
          detail: { error, sref },
        }),
      );
    }
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
      ...(this.translationLanguage === undefined
        ? {}
        : { translationLanguage: this.translationLanguage }),
      translationFallback: normalizeTranslationFallback(
        this.translationFallback,
      ),
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

  #publishDataSourceFailure(error: unknown, fallback: string): void {
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
