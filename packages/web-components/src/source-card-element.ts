import { text, type CoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";
import { repeat } from "lit/directives/repeat.js";

import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import {
  bilingualPairStyles,
  renderBilingualPair,
  type BilingualPairContentLanguage,
  type BilingualPairLayout,
  type BilingualPairSide,
  type BilingualPairSideOrder,
} from "./bilingual-pair.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import {
  getPreparedState,
  prepared,
  setPreparedState,
} from "./prepared-state.js";
import "./ref-label-element.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import { assertVocalizationMode } from "./vocalization-display.js";
import type { RefLabelDataViewModel } from "./ref-label.js";
import type {
  SourceCardAttributionViewModel,
  SourceCardHeaderViewModel,
  SourceCardItemViewModel,
  SourceCardRequest,
  SourceCardViewModel,
} from "./source-card.js";
import { createSourceCardViewModel } from "./source-card.js";
import { serializeSourceCardSelectors } from "./source-card-request.js";

/** Custom element that renders supplied or acquired source-card data. */
export class SefariaSourceCard extends SefariaElement {
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
    hideAttributions: { type: Boolean, attribute: "hide-attributions" },
    showAddressLabels: { attribute: false },
    selectable: { type: Boolean },
    selectedPosition: { attribute: false },
  };

  /** Card structure, heading, collection, and shared pair styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        max-width: 100%;
        min-width: 0;
        border: 1px solid var(--_sefaria-border);
        border-radius: var(--_sefaria-panel-radius);
        padding: 1.25rem;
      }

      header {
        display: var(--_sefaria-source-card-header-display, block);
        margin-block-end: 1.25rem;
        padding-block-end: 0.75rem;
        border-block-end: 1px solid var(--_sefaria-border);
      }

      .payload-label {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.35rem 1rem;
        font-size: 1.125em;
        font-weight: 700;
        line-height: 1.3;
      }

      .english {
        font-family: var(--_sefaria-font-english);
      }

      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .items {
        display: grid;
        gap: 1.25rem;
      }

      .item {
        min-width: 0;
        max-width: 100%;
      }

      .item.selectable {
        position: relative;
        cursor: pointer;
      }

      .item-content {
        min-width: 0;
      }

      .item.selected {
        outline: 2px solid var(--_sefaria-border);
        outline-offset: 0.3rem;
      }

      .segment-label {
        width: 2rem;
        font-size: 0.8em;
        font-weight: 600;
        line-height: 1;
        color: inherit;
        background: transparent;
        border: 0;
        border-radius: var(--_sefaria-control-radius);
        padding: 0.2rem 0.3rem;
        align-self: start;
        cursor: pointer;
      }

      .pair-side {
        display: grid;
        gap: 0.65rem;
        align-items: start;
        min-width: 0;
      }

      .pair-side[data-pair-side="translation"] {
        grid-template-columns: minmax(0, 1fr);
      }

      .pair-side[data-pair-side="translation"][data-adornment="true"] {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .pair-side[data-pair-side="primary"] {
        grid-template-columns: minmax(0, 1fr);
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"] {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .pair-side[data-pair-side="translation"][data-adornment="true"]
        sefaria-text-segment {
        grid-column: 2;
        grid-row: 1;
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"]
        .segment-label {
        grid-column: 2;
        grid-row: 1;
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"]
        sefaria-text-segment {
        grid-column: 1;
        grid-row: 1;
      }

      .segment-label.english {
        font-family: var(--_sefaria-font-english);
      }

      .segment-label.hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .segment-select-control {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .segment-select-control:focus {
        position: static;
        width: auto;
        height: auto;
        margin: 0 0 0.5rem;
        padding: 0.35rem 0.5rem;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }

      .segment-label:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .item + .item {
        border-block-start: 1px solid var(--_sefaria-border);
        padding-block-start: 1.25rem;
      }

      .attributions {
        display: grid;
        gap: 0.45rem;
        margin-block-start: 1.25rem;
        padding: 1rem;
        border-block-start: 1px solid var(--_sefaria-border);
        border-radius: 0.4rem;
        background: var(--_sefaria-surface-muted);
        color: var(--_sefaria-fg-muted);
        font-size: 0.8125em;
      }

      .attribution {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35em;
        margin: 0;
        min-width: 0;
      }

      .attribution > * {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .attribution-label {
        font-weight: 600;
      }

      .version-title-link {
        color: var(--_sefaria-link);
        text-underline-offset: 0.16em;
      }

      .version-title-link:focus-visible {
        border-radius: 0.15em;
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 0.18em;
      }

      .version-source::before {
        content: "— ";
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

  /** Sides the host wants displayed for every pair. */
  declare contentLanguage: BilingualPairContentLanguage;

  /** Requested arrangement for every pair. */
  declare layout: BilingualPairLayout;

  /** Requested role order for every pair. */
  declare sideOrder: BilingualPairSideOrder;
  /** Hebrew vocalization preset applied to every displayed text leaf. */
  declare vocalizationMode: VocalizationMode;
  /** Whether compact address labels are visible beside rendered text sides. */
  declare showAddressLabels: boolean;
  /** Enables selection controls for items with proven canonical targets. */
  declare selectable: boolean;
  /** Host-controlled original position path, never a reference string. */
  declare selectedPosition: readonly number[] | undefined;

  /** Whether resolved edition attribution is intentionally omitted. */
  declare hideAttributions: boolean;

  #active:
    | {
        readonly id: number;
        readonly controller: AbortController;
      }
    | undefined;
  #nextOperationId = 1;
  #declarativeActive = false;
  #resumeOnConnect = false;
  #committedViewModel: SourceCardViewModel | undefined;
  #ownedViewModel: SourceCardViewModel | undefined;
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
    this.hideAttributions = false;
    this.showAddressLabels = true;
    this.selectable = false;
    this.selectedPosition = undefined;
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
        new DOMException("Source card disconnected.", "AbortError"),
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

  /** Reveals the selected control without requesting or changing data. */
  async revealSelection(): Promise<void> {
    await this.updateComplete;
    const control = this.renderRoot.querySelector<HTMLButtonElement>(
      '.segment-label[aria-pressed="true"], .segment-select-control[aria-pressed="true"]',
    );
    control?.scrollIntoView({ block: "nearest" });
    control?.focus({ preventScroll: true });
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
      case "empty":
        return html`
          ${this.#renderHeader(viewModel.header)}
          <p role="status" aria-live="polite">
            ${viewModel.absent.map((side) => side.message).join(" ")}
          </p>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
      case "data":
        return html`
          ${this.#renderHeader(viewModel.header)}
          <section class="items" aria-label="Source text">
            ${repeat(
              viewModel.items,
              (item) => positionKey(item.position),
              (item) => this.#renderItem(item),
            )}
          </section>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
    }
  }

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }
    if (this.data !== undefined) {
      this.#declarativeActive = true;
      this.#cancelActive("Superseded by supplied source-card data.");
      try {
        this.#commit(this.#project(this.data, 200));
      } catch (error) {
        this.#commit({
          state: "error",
          errorKind: "validation",
          message:
            error instanceof Error
              ? error.message
              : "Supplied source-card data is invalid.",
        });
      }
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Source-card inputs were cleared.");
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad(sref);
  }

  #startLoad(sref: string): void {
    this.#cancelActive("Superseded source-card load.");
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
      const versions = serializeSourceCardSelectors(request);
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
      this.#publishAcquisitionFailure(error, "Source acquisition failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-source-card-error", {
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
    request?: SourceCardRequest,
  ): SourceCardViewModel {
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
    return createSourceCardViewModel(
      validated,
      request ?? this.#request(this.sref.trim() || validated.ref),
    );
  }

  #request(sref: string): SourceCardRequest {
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

  get #viewModel(): SourceCardViewModel | undefined {
    return getPreparedState<SourceCardViewModel>(this);
  }

  #publish(viewModel: SourceCardViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: SourceCardViewModel): void {
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

  #renderItem(item: SourceCardItemViewModel): TemplateResult {
    const selectable = this.#isSelectable(item);
    const hiddenControl =
      selectable && !this.showAddressLabels
        ? this.#renderSelectionControl(
            item.position,
            item.ref!,
            "segment-select-control",
            "Show connections",
          )
        : nothing;

    return html`<div
      class=${this.#itemClass(item)}
      data-position=${positionKey(item.position)}
      @click=${(event: MouseEvent) => this.#handleItemClick(event, item)}
    >
      ${hiddenControl}
      <div class="item-content">
        ${renderBilingualPair(
          item.pair,
          {
            contentLanguage: this.contentLanguage,
            layout: this.layout,
            sideOrder: this.sideOrder,
            vocalizationMode: this.vocalizationMode,
            announceAbsent: false,
          },
          selectable && this.showAddressLabels
            ? (side) => this.#renderAddressLabel(item, side)
            : undefined,
        )}
      </div>
    </div>`;
  }

  #renderAddressLabel(
    item: SourceCardItemViewModel,
    side: BilingualPairSide,
  ): TemplateResult {
    const language = side === "primary" ? "hebrew" : "english";
    return this.#renderSelectionControl(
      item.position,
      item.ref!,
      `segment-label ${language}`,
      formatAddressLabel(item.addressLabel!, language),
      language === "hebrew" ? "he" : "en",
    );
  }

  #renderSelectionControl(
    position: readonly number[],
    ref: string,
    className: string,
    content: string,
    language?: string,
  ): TemplateResult {
    return html`<button
      type="button"
      class=${className}
      title=${ref}
      aria-label=${`Show connections for ${ref}`}
      aria-pressed=${
        this.selectedPosition !== undefined &&
        positionKey(position) === positionKey(this.selectedPosition)
      }
      @click=${(event: MouseEvent) => {
        event.stopPropagation();
        this.#selectItem(position, ref);
      }}
    >
      <span lang=${language ?? nothing}>${content}</span>
    </button>`;
  }

  #isSelectable(
    item: SourceCardItemViewModel,
  ): item is SourceCardItemViewModel & {
    readonly ref: string;
    readonly addressLabel: string;
  } {
    return (
      this.selectable &&
      item.ref !== undefined &&
      item.addressLabel !== undefined
    );
  }

  #itemClass(item: SourceCardItemViewModel): string {
    const classes = ["item"];
    if (this.#isSelectable(item)) classes.push("selectable");
    if (
      this.#isSelectable(item) &&
      this.selectedPosition !== undefined &&
      positionKey(item.position) === positionKey(this.selectedPosition)
    ) {
      classes.push("selected");
    }
    return classes.join(" ");
  }

  #handleItemClick(event: MouseEvent, item: SourceCardItemViewModel): void {
    if (!this.#isSelectable(item)) return;
    if (
      event
        .composedPath()
        .some(
          (target) =>
            target instanceof Element &&
            target.matches(
              "a, button, input, select, textarea, summary, [contenteditable='true']",
            ),
        )
    ) {
      return;
    }
    const selection = this.ownerDocument.getSelection();
    if (selection !== null && !selection.isCollapsed) return;
    this.#selectItem(item.position, item.ref);
  }

  #selectItem(position: readonly number[], ref: string): void {
    this.dispatchEvent(
      new CustomEvent("sefaria-source-select", {
        detail: { position: [...position], ref },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #renderHeader(header: SourceCardHeaderViewModel): TemplateResult {
    const label: RefLabelDataViewModel = {
      state: "data",
      normalized: header.ref,
      hebrew: header.heRef,
      urlRef: "",
      url: "",
      indexTitle: header.indexTitle,
      nodeType: "",
    };
    return html`<header>
      <sefaria-ref-label
        ${prepared(label)}
        label-language="both"
      ></sefaria-ref-label>
    </header>`;
  }

  #renderAttributions(
    attributions: readonly SourceCardAttributionViewModel[],
  ): TemplateResult | typeof nothing {
    if (this.hideAttributions) {
      return nothing;
    }
    const visible = attributions.filter(
      (attribution) =>
        this.contentLanguage === "both" ||
        this.contentLanguage === attribution.side,
    );
    if (visible.length === 0) {
      return nothing;
    }

    return html`<section class="attributions" aria-label="Text editions">
      ${visible.map((attribution) => this.#renderAttribution(attribution))}
    </section>`;
  }

  #renderAttribution(
    attribution: SourceCardAttributionViewModel,
  ): TemplateResult {
    const label =
      attribution.side === "primary" ? "Primary text:" : "Translation:";
    const sourceUrl = attribution.versionSourceUrl ?? null;
    const source =
      attribution.versionSource === null || sourceUrl !== null
        ? nothing
        : html`<span class="version-source"
            >${attribution.versionSource}</span
          >`;
    const title =
      sourceUrl === null
        ? html`<span class="version-title">${attribution.versionTitle}</span>`
        : html`<a
            class="version-title version-title-link"
            href=${sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            >${attribution.versionTitle}</a
          >`;

    return html`<p class="attribution" data-side=${attribution.side}>
      <span class="attribution-label">${label}</span>
      ${title} ${source}
    </p>`;
  }
}

function statusOf(
  viewModel: SourceCardViewModel | undefined,
): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data") return "ready";
  return viewModel.state;
}

function positionKey(position: readonly number[]): string {
  return position.length === 0 ? "root" : position.join(".");
}

function formatAddressLabel(
  label: string,
  language: "english" | "hebrew",
): string {
  if (language === "english" || !/^[1-9]\d*$/.test(label)) return label;
  const value = Number(label);
  if (!Number.isSafeInteger(value)) return label;
  return encodeHebrewNumeral(value);
}

function encodeHebrewNumeral(value: number): string {
  const groups: number[] = [];
  for (let remaining = value; remaining > 0;) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  return groups
    .flatMap((group, index) => {
      if (group === 0) return [];
      const letters = encodeHebrewGroup(group);
      return [
        index < groups.length - 1
          ? `${punctuateHebrewNumeral(letters)}\u05f3`.replace(
              "\u05f3\u05f3",
              "\u05f3",
            )
          : punctuateHebrewNumeral(letters),
      ];
    })
    .join("");
}

function encodeHebrewGroup(value: number): string {
  const hundreds = ["", "\u05e7", "\u05e8", "\u05e9"];
  const tens = [
    "",
    "\u05d9",
    "\u05db",
    "\u05dc",
    "\u05de",
    "\u05e0",
    "\u05e1",
    "\u05e2",
    "\u05e4",
    "\u05e6",
  ];
  const ones = [
    "",
    "\u05d0",
    "\u05d1",
    "\u05d2",
    "\u05d3",
    "\u05d4",
    "\u05d5",
    "\u05d6",
    "\u05d7",
    "\u05d8",
  ];
  let remaining = value;
  let result = "";
  while (remaining >= 400) {
    result += "\u05ea";
    remaining -= 400;
  }
  result += hundreds[Math.floor(remaining / 100)] ?? "";
  remaining %= 100;
  if (remaining === 15) return `${result}\u05d8\u05d5`;
  if (remaining === 16) return `${result}\u05d8\u05d6`;
  result += tens[Math.floor(remaining / 10)] ?? "";
  result += ones[remaining % 10] ?? "";
  return result;
}

function punctuateHebrewNumeral(letters: string): string {
  return letters.length === 1
    ? `${letters}\u05f3`
    : `${letters.slice(0, -1)}\u05f4${letters.slice(-1)}`;
}

if (!customElements.get("sefaria-source-card")) {
  customElements.define("sefaria-source-card", SefariaSourceCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-source-card": SefariaSourceCard;
  }
}
