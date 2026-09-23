import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import type {
  BilingualPairContentLanguage,
  BilingualPairLayout,
  BilingualPairSideOrder,
} from "./bilingual-pair.js";
import type { SefariaAcquisition } from "./acquisition.js";
import { resolveSefariaAcquisition } from "./acquisition-state.js";
import { bindReaderController } from "./bindings.js";
import {
  getPreparedState,
  getPreparedStatus,
  prepared,
  setPreparedState,
} from "./prepared-state.js";
import "./connections-panel-element.js";
import {
  createCapabilityReaderDataSource,
  createReaderController,
  createReaderEntrySeedFromRawData,
  createSefariaReaderDataSource,
  loadReaderControllerProgressively,
  type ReaderController,
  type ReaderControllerDataSource,
  type ReaderControllerSuspension,
} from "./reader-controller.js";
import type { ReaderPresentationPatch } from "./reader-session.js";
import "./source-card-element.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import type {
  ReaderPane,
  ReaderRawSeedData,
  ReaderViewModel,
} from "./reader.js";
import { assertVocalizationMode } from "./vocalization-display.js";

interface SourceSelectDetail {
  readonly position: readonly number[];
  readonly ref: string;
}

interface ConnectionsCategoryDetail {
  readonly category: string | null;
}

interface ConnectionsPageDetail {
  readonly page: number;
}

interface ConnectionSelectDetail {
  readonly id: string;
  readonly targetRef: string;
}

/**
 * Controlled or declarative reader surface for one semantic reader entry.
 *
 * @slot toolbar-actions - Host-owned actions placed after the Reader's built-in toolbar controls.
 * @csspart toolbar - Container for compact pane and host action controls.
 * @csspart history - Back and retained-history controls.
 * @csspart source-pane - Scrollable source-text pane.
 * @csspart connections-pane - Scrollable connections pane.
 */
export class SefariaReader extends SefariaElement {
  /** Lit property metadata for host-supplied rendering and interaction state. */
  static override properties = {
    sref: { type: String },
    data: { attribute: false },
    acquisition: { attribute: false },
    activePane: { type: String, attribute: "active-pane" },
    chatExport: { type: Boolean, attribute: "chat-export" },
    contentLanguage: { type: String, attribute: "content-language" },
    layout: { type: String },
    sideOrder: { type: String, attribute: "side-order" },
    showConnectionPreviews: {
      type: Boolean,
      attribute: "show-connection-previews",
    },
    vocalizationMode: { type: String, attribute: "vocalization-mode" },
  };

  /** Responsive reader composition and accessible navigation styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        position: relative;
        container-type: inline-size;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border: 1px solid var(--_sefaria-border);
        border-radius: var(--_sefaria-panel-radius);
        box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 8%);
      }

      button {
        max-width: 100%;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        padding: 0.5rem 0.8rem;
        color: inherit;
        background: var(--_sefaria-surface);
        font-family: var(--_sefaria-font-label-english);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }

      button:hover:not(:disabled) {
        border-color: var(--_sefaria-accent);
        color: var(--_sefaria-accent);
      }

      button:focus-visible,
      [data-current-heading="true"]:focus-visible {
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 2px;
      }

      button:disabled {
        cursor: default;
        opacity: 0.5;
      }

      .reader-header {
        display: grid;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-block-end: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
      }

      .history-row,
      .actions,
      .pane-switch {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }

      .history-row ol {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .history-row li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
      }

      .history-row li:not(:last-child)::after {
        content: "›";
        color: var(--_sefaria-fg-muted);
      }

      .back {
        color: var(--_sefaria-accent);
      }

      .crumb {
        border: 0;
        padding-inline: 0.25rem;
        color: var(--_sefaria-link);
        background: transparent;
        font-family: var(--_sefaria-font-english);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .crumb:hover:not(:disabled) {
        text-decoration: underline;
      }

      .current-crumb {
        color: var(--_sefaria-fg);
        font-family: var(--_sefaria-font-english);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
      }

      [data-current-heading="true"] {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.3;
      }

      .history-boundary {
        margin: 0;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875rem;
      }

      .root-loading {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        width: fit-content;
        margin: 0;
        color: var(--_sefaria-accent);
        font-family: var(--_sefaria-font-label-english);
        font-size: 0.9rem;
        font-weight: 700;
      }

      .root-loading[hidden] {
        display: none;
      }

      .root-loading::before {
        width: 0.8rem;
        height: 0.8rem;
        border: 2px solid
          color-mix(in srgb, var(--_sefaria-accent) 25%, transparent);
        border-block-start-color: var(--_sefaria-accent);
        border-radius: 50%;
        content: "";
        animation: reader-root-loading 0.8s linear infinite;
      }

      .initial-loading {
        display: grid;
        min-height: 14rem;
        place-items: center;
        padding: 2rem;
        background: var(--_sefaria-surface-muted);
      }

      .root-loading[data-initial="true"] {
        position: absolute;
        z-index: 1;
        inset: 0;
        justify-self: center;
        pointer-events: none;
      }

      .actions {
        justify-content: space-between;
      }

      .chat-export {
        border-color: var(--_sefaria-accent);
        color: var(--_sefaria-surface);
        background: var(--_sefaria-accent);
      }

      .chat-export:hover:not(:disabled) {
        color: var(--_sefaria-surface);
        filter: brightness(0.92);
      }

      .pane-switch {
        display: none;
        width: fit-content;
        padding: 0.2rem;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        background: var(--_sefaria-surface);
      }

      .pane-switch button {
        border: 0;
        background: transparent;
      }

      .pane-switch button[aria-pressed="true"] {
        color: var(--_sefaria-surface);
        background: var(--_sefaria-accent);
      }

      .panes {
        display: grid;
        grid-template-columns: minmax(0, 68fr) minmax(13rem, 32fr);
        align-items: stretch;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        padding: 0;
        background: var(--_sefaria-surface);
      }

      .pane {
        min-width: 0;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        padding: 1rem;
      }

      .pane[data-pane="connections"] {
        border-inline-start: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
      }

      sefaria-source-card {
        --_sefaria-source-card-header-display: none;

        display: block;
        padding: 0;
        border: 0;
        border-radius: 0;
      }

      .unavailable {
        min-height: 8rem;
        margin: 0;
        padding: 1rem;
        border: 1px dashed var(--_sefaria-border);
        border-radius: 0.75rem;
        color: var(--_sefaria-fg-muted);
      }

      @keyframes reader-root-loading {
        to {
          transform: rotate(1turn);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .root-loading::before {
          animation: none;
        }
      }

      @container (max-width: 40rem) {
        .actions {
          align-items: stretch;
        }

        .pane-switch {
          display: flex;
        }

        .panes {
          display: block;
          overflow-y: auto;
        }

        .pane[data-pane="connections"] {
          border-inline-start: 0;
        }

        .pane {
          overflow-y: visible;
        }

        .pane[data-active="false"] {
          display: none;
        }
      }
    `,
  ];

  /** Requested external Reader root, separate from current navigation. */
  declare sref: string;
  /** Transactional unknown raw Reader seed. */
  declare data: ReaderRawSeedData | undefined;
  /** Optional element-specific acquisition source. */
  declare acquisition: SefariaAcquisition | undefined;
  /** Host-controlled pane selected in compact presentation. */
  declare activePane: ReaderPane;
  /** Shows an explicit host-mediated chat export action when a target exists. */
  declare chatExport: boolean;
  /** Source-card roles displayed by the controlled reader. */
  declare contentLanguage: BilingualPairContentLanguage;
  /** Source-card bilingual arrangement. */
  declare layout: BilingualPairLayout;
  /** First source-card role in side-by-side layout. */
  declare sideOrder: BilingualPairSideOrder;
  /** Whether captured connection previews are visible. */
  declare showConnectionPreviews: boolean;
  /** Hebrew vocalization preset applied to source and preview text. */
  declare vocalizationMode: VocalizationMode;

  #controller: ReaderController | undefined;
  #unbind: (() => void) | undefined;
  #errorUnsubscribe: (() => void) | undefined;
  #initial:
    | {
        readonly id: number;
        readonly controller: AbortController;
        readonly presentation: ReaderPresentationPatch;
      }
    | undefined;
  #rootPresentation: ReaderPresentationPatch | undefined;
  #nextOperationId = 1;
  #requestedRoot = "";
  #acquisitionOverride: SefariaAcquisition | undefined;
  #suspension: ReaderControllerSuspension | undefined;
  #resumeInitial = false;
  #declarativeActive = false;
  #processedData: ReaderRawSeedData | undefined;
  #seedCommitted = false;
  #readerError: string | undefined;
  #rootLoading = false;
  #renderedEntryId: string | undefined;

  constructor() {
    super();
    this.sref = "";
    this.data = undefined;
    this.acquisition = undefined;
    this.activePane = "source";
    this.chatExport = false;
    this.contentLanguage = "both";
    this.layout = "auto";
    this.sideOrder = "primary-first";
    this.showConnectionPreviews = true;
    this.vocalizationMode = "taamim_and_nikkud";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      if (this.#suspension !== undefined && this.#controller !== undefined) {
        const suspension = this.#suspension;
        this.#suspension = undefined;
        this.#resumeInitial = false;
        void this.#resume(suspension);
        return;
      }
      if (this.#resumeInitial) {
        this.#resumeInitial = false;
        this.#reconcile(true);
        return;
      }
      this.#reconcile(false, false);
    });
  }

  override disconnectedCallback(): void {
    if (this.#initial !== undefined) {
      this.#initial.controller.abort(
        new DOMException("Reader disconnected.", "AbortError"),
      );
      this.#initial = undefined;
      this.#resumeInitial = this.#controller === undefined;
    }
    if (this.#controller !== undefined) {
      this.#suspension = this.#controller.suspend();
    }
    super.disconnectedCallback();
  }

  /** Coarse Reader lifecycle state without exposing prepared rendering data. */
  get status(): SefariaElementStatus {
    const preparedStatus = getPreparedStatus(this);
    if (preparedStatus !== undefined) return preparedStatus;
    if (this.#readerError !== undefined) return "error";
    if (this.#rootLoading) return "loading";
    return this.#viewModel === undefined ? "empty" : "ready";
  }

  /** Stable identity of the current retained semantic Reader entry. */
  get currentEntryId(): string | undefined {
    return this.#viewModel?.currentEntryId;
  }

  /** Exact selected canonical target, when the current entry establishes one. */
  get selectedRef(): string | undefined {
    return this.#viewModel?.selectedTarget?.ref;
  }

  /** Whether a root source request is currently pending. */
  get rootLoading(): boolean {
    return this.#rootLoading;
  }

  /** Current Reader failure message, when the latest eligible operation failed. */
  get readerError(): string | undefined {
    return this.#readerError;
  }

  /** Whether Reader Back can activate a retained predecessor. */
  get canGoBack(): boolean {
    return this.#viewModel?.canGoBack ?? false;
  }

  /** Whether bounded retention removed older semantic history. */
  get historyTruncated(): boolean {
    return this.#viewModel?.historyTruncated ?? false;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("sref") ||
      changed.has("data") ||
      changed.has("acquisition")
    ) {
      this.#reconcile(changed.has("acquisition"), changed.has("sref"));
      return;
    }
    if (
      changed.has("contentLanguage") ||
      changed.has("layout") ||
      changed.has("sideOrder") ||
      changed.has("showConnectionPreviews") ||
      changed.has("vocalizationMode")
    ) {
      this.#synchronizePresentation();
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    assertVocalizationMode(this.vocalizationMode);
    const viewModel = this.#viewModel;
    const rootLoading =
      this.#rootLoading || getPreparedStatus(this) === "loading";
    if (viewModel === undefined) {
      return html`
        ${
          this.#readerError === undefined
            ? nothing
            : html`<p class="unavailable" role="alert">${this.#readerError}</p>`
        }
        <p
          class="root-loading"
          data-initial="true"
          role="status"
          aria-live="polite"
          ?hidden=${!rootLoading}
        >
          ${rootLoading ? "Opening Reader..." : nothing}
        </p>
        ${
          rootLoading
            ? html`<div
                class="initial-loading"
                role="region"
                aria-label="Reader content"
                aria-busy="true"
              ></div>`
            : nothing
        }
      `;
    }
    const activePane = this.#effectivePane(viewModel);
    const ancestors = viewModel.breadcrumbs.filter(
      (breadcrumb) => !breadcrumb.current,
    );
    return html`
      <header class="reader-header">
        <div class="history-row" part="history">
          <button
            class="back"
            data-action="back"
            type="button"
            ?disabled=${!viewModel.canGoBack}
            @click=${this.#back}
          >
            Back
          </button>
          <nav aria-label="Reader history" ?hidden=${ancestors.length === 0}>
            <ol>
              ${ancestors.map(
                (breadcrumb) =>
                  html`<li>
                    <button
                      class="crumb"
                      type="button"
                      @click=${() => this.#activate(breadcrumb.entryId)}
                    >
                      ${breadcrumb.label}
                    </button>
                  </li>`,
              )}
            </ol>
          </nav>
        </div>
        ${
          viewModel.historyTruncated
            ? html`<p class="history-boundary" role="status">
                Earlier reader history is no longer retained.
              </p>`
            : nothing
        }
        <h2 data-current-heading="true" tabindex="-1" aria-current="page">
          ${viewModel.label}
        </h2>
        <p
          class="root-loading"
          role="status"
          aria-live="polite"
          ?hidden=${!rootLoading}
        >
          ${rootLoading ? "Opening a new Reader location..." : nothing}
        </p>
        ${
          this.#readerError === undefined
            ? nothing
            : html`<p class="unavailable" role="alert">${this.#readerError}</p>`
        }
        <div class="actions" part="toolbar">
          <div class="pane-switch" role="group" aria-label="Reader panes">
            <button
              type="button"
              aria-pressed=${activePane === "source"}
              ?disabled=${viewModel.source === undefined}
              @click=${() => this.#pane("source")}
            >
              Text
            </button>
            <button
              type="button"
              aria-pressed=${activePane === "connections"}
              ?disabled=${viewModel.connections === undefined}
              @click=${() => this.#pane("connections")}
            >
              Connections
            </button>
          </div>
          ${
            this.chatExport && viewModel.selectedTarget !== undefined
              ? html`<button
                  class="chat-export"
                  type="button"
                  @click=${() => this.#chatExport(viewModel.selectedTarget!.ref)}
                >
                  Send ${viewModel.selectedTarget.ref} to chat
                </button>`
              : nothing
          }
          <slot name="toolbar-actions"></slot>
        </div>
      </header>
      <div class="panes" aria-busy=${String(rootLoading)}>
        <section
          class="pane"
          part="source-pane"
          data-pane="source"
          data-active=${activePane === "source"}
          aria-label="Source text"
        >
          ${this.#source(viewModel)}
        </section>
        <section
          class="pane"
          part="connections-pane"
          data-pane="connections"
          data-active=${activePane === "connections"}
          aria-label="Connections"
        >
          ${this.#connections(viewModel)}
        </section>
      </div>
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const currentEntryId = this.#viewModel?.currentEntryId;
    if (
      this.#renderedEntryId !== undefined &&
      currentEntryId !== undefined &&
      this.#renderedEntryId !== currentEntryId
    ) {
      requestAnimationFrame(() => {
        const heading = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-current-heading="true"]',
        );
        heading?.focus();
        heading?.scrollIntoView({ block: "nearest" });
      });
    }
    this.#renderedEntryId = currentEntryId;
  }

  #reconcile(force: boolean, srefChanged = false): void {
    if (!this.isConnected) return;
    const requestedRoot = this.sref.trim();
    if (this.data !== undefined) {
      if (this.data !== this.#processedData) {
        this.#processedData = this.data;
        this.#transactData(this.data, requestedRoot, srefChanged);
      }
      return;
    }
    this.#processedData = undefined;
    if (requestedRoot.length === 0) {
      if (this.#seedCommitted) return;
      if (this.#declarativeActive) this.#clearDeclarativeState();
      return;
    }
    if (
      !force &&
      requestedRoot === this.#requestedRoot &&
      (this.#controller !== undefined || this.#initial !== undefined)
    ) {
      return;
    }

    this.#declarativeActive = true;
    this.#seedCommitted = false;
    this.#setReaderError(undefined);
    this.#requestedRoot = requestedRoot;
    const acquisition = resolveSefariaAcquisition(this.acquisition);
    if (acquisition.kind === "disabled") {
      this.#publishError(
        new Error("Standalone Sefaria acquisition is disabled."),
        requestedRoot,
      );
      return;
    }

    if (
      !force &&
      this.#controller !== undefined &&
      this.#acquisitionOverride === this.acquisition
    ) {
      void this.#replaceRoot(requestedRoot);
      return;
    }

    this.#disposeController();
    this.#acquisitionOverride = this.acquisition;
    const dataSource =
      acquisition.kind === "client"
        ? createSefariaReaderDataSource(acquisition.client)
        : createCapabilityReaderDataSource(acquisition.capability);
    const active = {
      id: this.#nextOperationId++,
      controller: new AbortController(),
      presentation: { ...this.#presentation() },
    };
    this.#initial = active;
    this.#setRootLoading(true);
    void loadReaderControllerProgressively(
      { tref: requestedRoot },
      dataSource,
      (controller) => {
        if (this.#initial !== active || !this.isConnected) {
          controller.dispose();
          return;
        }
        this.#attachController(controller);
      },
      {
        signal: active.controller.signal,
        presentation: active.presentation,
      },
      true,
    )
      .then(() => {
        if (this.#initial === active) this.#initial = undefined;
      })
      .catch((error: unknown) => {
        if (this.#initial !== active) return;
        this.#initial = undefined;
        if (active.controller.signal.aborted) return;
        this.#setRootLoading(false);
        this.#publishError(error, requestedRoot);
      });
  }

  #transactData(
    data: ReaderRawSeedData,
    requestedRoot: string,
    srefChanged: boolean,
  ): void {
    const initial = this.#initial;
    this.#initial = undefined;
    initial?.controller.abort(
      new DOMException("Superseded by supplied Reader data.", "AbortError"),
    );
    this.#setRootLoading(false);
    try {
      const admitted = createReaderEntrySeedFromRawData(data);
      if (
        srefChanged &&
        requestedRoot.length > 0 &&
        admitted.sourceRequest !== undefined &&
        admitted.sourceRequest.tref !== requestedRoot
      ) {
        throw new TypeError(
          `Reader data source request ${admitted.sourceRequest.tref} conflicts with sref ${requestedRoot}.`,
        );
      }
      const controller = createReaderController(
        {
          ...admitted.seed,
          presentation: {
            ...this.#presentation(),
            ...admitted.seed.presentation,
          },
        },
        this.#createLazyDataSource(),
      );
      this.#declarativeActive = true;
      this.#seedCommitted = true;
      this.#setReaderError(undefined);
      this.#requestedRoot = requestedRoot || admitted.sourceRequest?.tref || "";
      this.#acquisitionOverride = this.acquisition;
      this.#attachController(controller);
      if (admitted.continueConnections) {
        const selectedRef = admitted.selectedRef;
        if (selectedRef === undefined) {
          throw new Error(
            "Reader source seed did not establish a selected reference.",
          );
        }
        void controller.loadInitialConnections(
          { tref: selectedRef, withText: true },
          {},
          new AbortController().signal,
        );
      }
    } catch (error) {
      this.#publishError(error, requestedRoot);
    }
  }

  #createLazyDataSource(): ReaderControllerDataSource {
    return {
      loadSource: async (request, signal) =>
        await this.#resolveDataSource().loadSource(request, signal),
      loadConnections: async (request, projection, signal) =>
        await this.#resolveDataSource().loadConnections(
          request,
          projection,
          signal,
        ),
    };
  }

  #resolveDataSource(): ReaderControllerDataSource {
    const acquisition = resolveSefariaAcquisition(this.acquisition);
    if (acquisition.kind === "disabled") {
      throw new Error("Standalone Sefaria acquisition is disabled.");
    }
    return acquisition.kind === "client"
      ? createSefariaReaderDataSource(acquisition.client)
      : createCapabilityReaderDataSource(acquisition.capability);
  }

  async #replaceRoot(sref: string): Promise<void> {
    const controller = this.#controller;
    if (controller === undefined) return;
    const presentation = { ...this.#presentation() };
    this.#rootPresentation = presentation;
    try {
      await controller.replaceRoot({ tref: sref }, { presentation });
    } catch (error) {
      this.#publishError(error, sref);
    } finally {
      if (this.#rootPresentation === presentation) {
        this.#rootPresentation = undefined;
      }
    }
  }

  async #resume(suspension: ReaderControllerSuspension): Promise<void> {
    const controller = this.#controller;
    if (controller === undefined || !this.isConnected) return;
    try {
      await controller.resume(suspension);
    } catch (error) {
      this.#publishError(error, this.#requestedRoot);
    }
  }

  #attachController(controller: ReaderController): void {
    if (this.#controller === controller) return;
    this.#disposeController();
    this.#controller = controller;
    this.#unbind = bindReaderController(this, controller);
    this.#errorUnsubscribe = controller.subscribe((snapshot) => {
      this.#setReaderError(
        snapshot.task.state === "error" ? snapshot.task.message : undefined,
      );
      this.#setRootLoading(snapshot.task.state === "loading-source");
    });
  }

  #presentation() {
    return {
      contentLanguage: this.contentLanguage,
      layout: this.layout,
      sideOrder: this.sideOrder,
      showConnectionPreviews: this.showConnectionPreviews,
      vocalizationMode: this.vocalizationMode,
    } as const;
  }

  #synchronizePresentation(): void {
    const next = this.#presentation();
    if (this.#initial !== undefined) {
      Object.assign(this.#initial.presentation, next);
    }
    if (this.#rootPresentation !== undefined) {
      Object.assign(this.#rootPresentation, next);
    }
    const controller = this.#controller;
    const currentEntryId = controller?.snapshot.reader.currentEntryId;
    if (controller === undefined || currentEntryId === undefined) return;
    const current = controller.snapshot.presentation;
    if (
      current.contentLanguage === next.contentLanguage &&
      current.layout === next.layout &&
      current.sideOrder === next.sideOrder &&
      current.showConnectionPreviews === next.showConnectionPreviews &&
      current.vocalizationMode === next.vocalizationMode
    ) {
      return;
    }
    controller.setPresentation({
      originEntryId: currentEntryId,
      patch: next,
    });
  }

  #clearDeclarativeState(): void {
    this.#initial?.controller.abort(
      new DOMException("Reader inputs were cleared.", "AbortError"),
    );
    this.#initial = undefined;
    this.#disposeController();
    this.#requestedRoot = "";
    this.#acquisitionOverride = undefined;
    this.#suspension = undefined;
    this.#resumeInitial = false;
    this.#rootPresentation = undefined;
    this.#declarativeActive = false;
    this.#processedData = undefined;
    this.#seedCommitted = false;
    this.#setReaderError(undefined);
    this.#setRootLoading(false);
    setPreparedState(this, undefined);
  }

  #disposeController(): void {
    this.#errorUnsubscribe?.();
    this.#errorUnsubscribe = undefined;
    this.#unbind?.();
    this.#unbind = undefined;
    this.#controller?.dispose();
    this.#controller = undefined;
  }

  #publishError(error: unknown, sref: string): void {
    this.#setReaderError(
      error instanceof Error ? error.message : "Reader acquisition failed.",
    );
    this.dispatchEvent(
      new CustomEvent("sefaria-reader-error", {
        bubbles: true,
        composed: true,
        detail: { error, sref },
      }),
    );
  }

  #source(viewModel: ReaderViewModel): TemplateResult {
    const source = viewModel.source;
    if (source === undefined) {
      return html`<p class="unavailable" role="status">
        Source text is not available for this entry.
      </p>`;
    }
    return html`<sefaria-source-card
      ${prepared(source.viewModel)}
      .selectedPosition=${source.selectedPosition}
      .contentLanguage=${this.contentLanguage}
      .layout=${this.layout}
      .sideOrder=${this.sideOrder}
      .vocalizationMode=${this.vocalizationMode}
      .showAddressLabels=${true}
      ?selectable=${source.viewModel.state === "data"}
      @sefaria-source-select=${this.#sourceSelect}
    ></sefaria-source-card>`;
  }

  #connections(viewModel: ReaderViewModel): TemplateResult {
    const connections = viewModel.connections;
    if (connections === undefined) {
      return html`<p class="unavailable" role="status">
        Connections are not available for this entry.
      </p>`;
    }
    if (connections.state === "unavailable") {
      return html`<p
        class="unavailable"
        role=${connections.reason === "failed" ? "alert" : "status"}
      >
        ${connections.message}
      </p>`;
    }
    return html`<sefaria-connections-panel
      ${prepared(connections.viewModel)}
      .showPreviews=${this.showConnectionPreviews}
      .vocalizationMode=${this.vocalizationMode}
      @sefaria-connections-category-change=${this.#category}
      @sefaria-connections-page-change=${this.#page}
      @sefaria-connection-select=${this.#connection}
      @sefaria-connections-preview-request=${this.#previews}
    ></sefaria-connections-panel>`;
  }

  #effectivePane(viewModel: ReaderViewModel): ReaderPane {
    if (viewModel.source === undefined && viewModel.connections !== undefined) {
      return "connections";
    }
    if (viewModel.connections === undefined && viewModel.source !== undefined) {
      return "source";
    }
    return this.activePane === "connections" ? "connections" : "source";
  }

  #back(): void {
    this.#emit("sefaria-reader-back", {});
  }

  #activate(entryId: string): void {
    const label = this.#viewModel?.breadcrumbs.find(
      (breadcrumb) => breadcrumb.entryId === entryId,
    )?.label;
    this.#emit("sefaria-reader-history-activate", { entryId, label });
  }

  #pane(pane: ReaderPane): void {
    this.#emit("sefaria-reader-pane-change", { pane });
  }

  #chatExport(targetRef: string): void {
    this.#emit("sefaria-reader-chat-export", { targetRef });
  }

  #sourceSelect(event: CustomEvent<SourceSelectDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-source-select", event.detail);
  }

  #category(event: CustomEvent<ConnectionsCategoryDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-category-change", event.detail);
  }

  #page(event: CustomEvent<ConnectionsPageDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-page-change", event.detail);
  }

  #connection(event: CustomEvent<ConnectionSelectDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connection-select", event.detail);
  }

  #previews(event: CustomEvent): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-preview-request", {});
  }

  #emit(name: string, detail: object): void {
    const originEntryId = this.#viewModel?.currentEntryId;
    if (originEntryId === undefined) return;
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { originEntryId, ...detail },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  get #viewModel(): ReaderViewModel | undefined {
    return getPreparedState<ReaderViewModel>(this);
  }

  #setReaderError(error: string | undefined): void {
    if (this.#readerError === error) return;
    this.#readerError = error;
    this.requestUpdate();
  }

  #setRootLoading(loading: boolean): void {
    if (this.#rootLoading === loading) return;
    this.#rootLoading = loading;
    this.toggleAttribute("root-loading", loading);
    this.requestUpdate();
  }
}

if (!customElements.get("sefaria-reader")) {
  customElements.define("sefaria-reader", SefariaReader);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-reader": SefariaReader;
  }
}
