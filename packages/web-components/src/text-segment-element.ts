import type { CoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import { css, html, nothing, type PropertyValues } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import { optionalStringConverter } from "./attribute-converters.js";
import {
  acquireSelectedText,
  normalizeTranslationLanguage,
  normalizeTranslationFallback,
  type SelectedTextProgress,
} from "./translation-selection.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import { getPreparedState, setPreparedState } from "./prepared-state.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import type {
  TextSegmentDataViewModel,
  TextSegmentSelectedData,
  TextSegmentSelectedVersion,
  TextSegmentSelectedVersionInfo,
  TextSegmentViewModel,
} from "./text-segment.js";
import {
  createTextSegmentViewModel,
  projectTextSegmentValue,
  projectTextSegmentVersion,
} from "./text-segment.js";
import {
  assertVocalizationMode,
  deriveTextSegmentDisplay,
  type TextSegmentDisplay,
} from "./vocalization-display.js";

const NOTE_PLACEHOLDER_PATTERN = /<span data-sefaria-note="(\d+)"><\/span>/gu;

/** Custom element that renders supplied or acquired text-segment data. */
export class SefariaTextSegment extends SefariaElement {
  /** Lit property metadata for declarative data and presentation state. */
  static override properties = {
    sref: { type: String, useDefault: true },
    data: { attribute: false },
    acquisition: { attribute: false },
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
    versionLanguage: {
      type: String,
      attribute: "version-language",
      converter: optionalStringConverter,
    },
    versionTitle: {
      type: String,
      attribute: "version-title",
      converter: optionalStringConverter,
    },
    vocalizationMode: {
      type: String,
      attribute: "vocalization-mode",
      useDefault: true,
    },
  };

  /** Text-segment layout, typography, footnotes, and containment styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        /* A lone passage reads as page text unless the host sets a surface. */
        background: var(--sefaria-surface, transparent);
        max-width: 100%;
        min-width: 0;
      }

      article,
      .body,
      .body-part {
        max-width: 100%;
        min-width: 0;
      }

      .body,
      .body-part,
      .footnotes {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .body {
        line-height: 1.68;
      }

      article[lang|="he"],
      article[lang|="arc"] {
        font-family: var(--_sefaria-font-hebrew);
        font-size: 1.075em;
      }

      article[lang|="he"] .body,
      article[lang|="arc"] .body {
        line-height: 1.78;
      }

      article:not([lang|="he"]):not([lang|="arc"]) {
        font-family: var(--_sefaria-font-english);
      }

      .footnote-marker {
        margin-inline: 0.1em;
      }

      .footnotes {
        margin-block: 1rem 0;
        padding-inline-start: 1.5rem;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875em;
        line-height: 1.5;
        list-style: none;
      }

      .footnote-label {
        margin-inline-end: 0.35em;
      }
    `,
  ];

  /** The Sefaria reference to load when `data` isn't set. */
  declare sref: string;
  /** Sefaria API response data to render. When it's set, the element doesn't fetch anything. */
  declare data: unknown | undefined;
  /** Chooses how this element fetches data, instead of the default. */
  declare acquisition: SefariaAcquisition | undefined;
  /** Language of the edition to show, instead of the primary edition. */
  declare versionLanguage: string | undefined;
  /** Exact title of the edition to show, used together with `versionLanguage`. */
  declare versionTitle: string | undefined;
  /** Preferred translation language. Can't be combined with `versionLanguage`. */
  declare translationLanguage: string | undefined;
  /** What happens when the preferred translation language is missing: `default` loads Sefaria's default translation, `none` shows a "No <language> text." status. */
  declare translationFallback: "default" | "none";
  /** How much Hebrew vowel and cantillation marking to keep. `none` removes both. */
  declare vocalizationMode: VocalizationMode;

  #displayViewModel: TextSegmentDataViewModel | undefined;
  #displayMode: VocalizationMode | undefined;
  #displayValue: TextSegmentDisplay | undefined;
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
  #committedViewModel: TextSegmentViewModel | undefined;
  #ownedViewModel: TextSegmentViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.acquisition = undefined;
    this.versionLanguage = undefined;
    this.versionTitle = undefined;
    this.translationLanguage = undefined;
    this.translationFallback = "none";
    this.vocalizationMode = "taamim_and_nikkud";
  }

  /** Details of the edition currently shown. */
  get selectedVersion(): TextSegmentSelectedVersionInfo | undefined {
    const viewModel = this.#viewModel;
    return viewModel?.state === "data"
      ? {
          actualLanguage: viewModel.actualLanguage,
          direction: viewModel.direction,
        }
      : undefined;
  }

  /** Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. */
  get status(): SefariaElementStatus {
    return this.#statusOverride ?? statusOf(this.#viewModel);
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
        new DOMException("Text segment disconnected.", "AbortError"),
      );
      this.#active = undefined;
      this.#resumeOnConnect = true;
    }
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("sref") ||
      changed.has("data") ||
      changed.has("acquisition") ||
      changed.has("versionLanguage") ||
      changed.has("translationLanguage") ||
      changed.has("translationFallback") ||
      changed.has("versionTitle")
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
      case "empty":
        return html`<p role="status" aria-live="polite">
          ${viewModel.message}
        </p>`;
      case "error":
        return html`<p role="alert">${viewModel.message}</p>`;
      case "data":
        return this.#renderData(viewModel);
    }
  }

  #renderData(viewModel: TextSegmentDataViewModel) {
    const display = this.#display(viewModel);
    const hasFootnoteBodies = display.notes.some(
      (note) => note.contentHtml !== null,
    );
    const bodyHtml = decorateFootnotePlaceholders(
      display.bodyHtml,
      display.notes,
    );

    return html`
      <article lang=${viewModel.actualLanguage} dir=${viewModel.direction}>
        <div class="body">
          <span class="body-part">${unsafeHTML(bodyHtml)}</span>
        </div>
        ${
          hasFootnoteBodies
            ? html`<ol class="footnotes">
                ${display.notes.map((note) =>
                  note.contentHtml === null
                    ? nothing
                    : html`<li data-note-index=${note.key}>
                        <span class="footnote-label"
                          >${unsafeHTML(note.markerHtml)}</span
                        >
                        ${unsafeHTML(
                          decorateFootnotePlaceholders(
                            note.contentHtml,
                            display.notes,
                          ),
                        )}
                      </li>`,
                )}
              </ol>`
            : nothing
        }
      </article>
    `;
  }

  #display(viewModel: TextSegmentDataViewModel): TextSegmentDisplay {
    if (
      this.#displayValue === undefined ||
      this.#displayViewModel !== viewModel ||
      this.#displayMode !== this.vocalizationMode
    ) {
      this.#displayViewModel = viewModel;
      this.#displayMode = this.vocalizationMode;
      this.#displayValue = deriveTextSegmentDisplay(
        viewModel,
        this.vocalizationMode,
      );
    }
    return this.#displayValue;
  }

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }
    if (this.data !== undefined) {
      this.#declarativeActive = true;
      this.#cancelActive("Superseded by supplied text-segment data.");
      try {
        this.#commit(this.#project(this.data, 200));
      } catch (error) {
        this.#commit({
          state: "error",
          errorKind: "validation",
          message:
            error instanceof Error
              ? error.message
              : "Supplied text-segment data is invalid.",
        });
      }
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Text-segment inputs were cleared.");
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad(sref);
  }

  #startLoad(sref: string): void {
    this.#cancelActive("Superseded text-segment load.");
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
      const versions = [this.#serializedVersion()];
      const translationFallback = normalizeTranslationFallback(
        this.translationFallback,
      );
      const acquisition = resolveSefariaAcquisition(this.acquisition);
      if (acquisition.kind === "disabled") {
        throw new Error("Standalone Sefaria acquisition is disabled.");
      }

      const response = await acquireSelectedText(
        acquisition,
        sref,
        versions,
        this.translationLanguage,
        translationFallback,
        active.controller.signal,
        active.progress,
      );
      if (this.#active !== active) return;
      const viewModel = this.#project(response.payload, response.status);
      if (this.#active !== active) return;
      this.#active = undefined;
      this.#commit(viewModel);
    } catch (error) {
      if (this.#active !== active) return;
      this.#active = undefined;
      if (active.controller.signal.aborted) return;
      this.#publishAcquisitionFailure(error, "Text acquisition failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-text-segment-error", {
          bubbles: true,
          composed: true,
          detail: { error, sref },
        }),
      );
    }
  }

  #project(payload: unknown, status: number): TextSegmentViewModel {
    this.#serializedVersion();
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
    const translationFallback = normalizeTranslationFallback(
      this.translationFallback,
    );
    if (isSelectedTextSegmentData(payload)) {
      const selected = validateSelectedTextSegmentData(payload);
      if (
        this.translationLanguage !== undefined &&
        selected.version.languageFamilyName.toLowerCase() !==
          normalizeTranslationLanguage(this.translationLanguage)
      ) {
        throw new TypeError(
          "/version: selected data cannot establish preferred-translation fallback coverage.",
        );
      }
      return projectTextSegmentValue(
        selected,
        selected.version,
        selected.version.text,
      );
    }
    const validated = validateSuppliedComponentData<CoreV3TextsResponse>(
      { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
      payload,
    );
    if (this.translationLanguage !== undefined) {
      return createTextSegmentViewModel(validated, {
        tref: this.sref,
        version: {
          translationLanguage: this.translationLanguage,
          ...(this.versionTitle === undefined
            ? {}
            : { versionTitle: this.versionTitle }),
        },
        translationFallback,
      });
    }
    if (this.versionLanguage !== undefined) {
      return createTextSegmentViewModel(validated, {
        tref: this.sref,
        version: {
          language: this.versionLanguage,
          ...(this.versionTitle === undefined
            ? {}
            : { versionTitle: this.versionTitle }),
        },
      });
    }

    const primary = validated.versions.filter(
      (version) =>
        version.isPrimary === true &&
        (this.versionTitle === undefined ||
          version.versionTitle === this.versionTitle.replaceAll("_", " ")),
    );
    if (primary.length === 0) {
      return {
        state: "empty",
        ref: validated.ref,
        heRef: validated.heRef,
        message: "No primary text is available.",
        warnings: [],
      };
    }
    if (primary.length > 1) {
      return {
        state: "error",
        errorKind: "projection",
        message: `Text segment requires one primary version; found ${primary.length}.`,
      };
    }
    return projectTextSegmentVersion(validated, primary[0]!);
  }

  #serializedVersion(): string {
    if (
      this.translationLanguage !== undefined &&
      this.versionLanguage !== undefined
    ) {
      throw new TypeError(
        "translation-language and version-language cannot be combined.",
      );
    }
    const language =
      this.translationLanguage === undefined
        ? (this.versionLanguage?.trim().toLowerCase() ?? "primary")
        : normalizeTranslationLanguage(this.translationLanguage);
    if (language.length === 0) {
      throw new TypeError("Text segment version language must not be blank.");
    }
    if (this.versionTitle !== undefined && !this.versionTitle.trim()) {
      throw new TypeError("Text segment version title must not be blank.");
    }
    return this.versionTitle === undefined
      ? language
      : `${language}|${this.versionTitle}`;
  }

  #cancelActive(message: string): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.controller.abort(new DOMException(message, "AbortError"));
  }

  get #viewModel(): TextSegmentViewModel | undefined {
    return getPreparedState<TextSegmentViewModel>(this);
  }

  #publish(viewModel: TextSegmentViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: TextSegmentViewModel): void {
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
  viewModel: TextSegmentViewModel | undefined,
): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data") return "ready";
  return viewModel.state;
}

function isSelectedTextSegmentData(
  value: unknown,
): value is { readonly kind: "selected" } {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "selected"
  );
}

function validateSelectedTextSegmentData(value: {
  readonly kind: "selected";
}): TextSegmentSelectedData {
  const record = value as Readonly<Record<string, unknown>>;
  const version = readRecord(record.version, "/version");
  return {
    kind: "selected",
    ref: readString(record.ref, "/ref"),
    heRef: readString(record.heRef, "/heRef"),
    version: {
      versionTitle: readString(version.versionTitle, "/version/versionTitle"),
      language: readString(version.language, "/version/language"),
      actualLanguage: readString(
        version.actualLanguage,
        "/version/actualLanguage",
      ),
      languageFamilyName: readString(
        version.languageFamilyName,
        "/version/languageFamilyName",
      ),
      direction: readDirection(version.direction),
      text: readNullableString(version.text, "/version/text"),
    },
  };
}

function readRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${path} must be a string.`);
  }
  return value;
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null || typeof value === "string") return value;
  throw new TypeError(`${path} must be a string or null.`);
}

function readDirection(
  value: unknown,
): TextSegmentSelectedVersion["direction"] {
  if (value === "ltr" || value === "rtl") return value;
  throw new TypeError('/version/direction must be "ltr" or "rtl".');
}

function decorateFootnotePlaceholders(
  source: string,
  notes: TextSegmentDisplay["notes"],
): string {
  return source.replaceAll(
    NOTE_PLACEHOLDER_PATTERN,
    (placeholder, keyText: string) => {
      const key = Number(keyText);
      const note = notes[key];
      return note?.key === key
        ? `<sup class="footnote-marker" data-note-index="${key}">${note.markerHtml}</sup>`
        : placeholder;
    },
  );
}

if (!customElements.get("sefaria-text-segment")) {
  customElements.define("sefaria-text-segment", SefariaTextSegment);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-text-segment": SefariaTextSegment;
  }
}
