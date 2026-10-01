import { related, type CoreLinkResponse } from "@arithmomaniac/sefaria-client";
import { css, html, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";
import type { SefariaDataSource } from "./data-source.js";
import { resolveSefariaDataSource } from "./data-source-state.js";
import { optionalStringConverter } from "./attribute-converters.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import { createConnectionsQuery } from "./connections-request.js";
import { getPreparedState, setPreparedState } from "./prepared-state.js";
import {
  SefariaElement,
  type SefariaElementStatus,
} from "./sefaria-element.js";
import type {
  ConnectionEntry,
  ConnectionsRequest,
  ConnectionsViewModel,
} from "./connections-panel.js";
import { createConnectionsViewModel } from "./connections-panel.js";
import {
  assertVocalizationMode,
  deriveSafeHtmlDisplay,
} from "./vocalization-display.js";

/**
 * Lists the commentaries and other texts that Sefaria connects to a reference. It groups them by category.
 *
 * @empty The element shows its empty state when no text connections remain after the element leaves out sheet links. A response with only sheets is empty too. The message is `No text connections were returned.`
 * @fires sefaria-connections-category-change - Asks to show a different connection category. Call `preventDefault()` to stop the panel from switching to that category and returning to the first page.
 * @eventDetail sefaria-connections-category-change - `category` is the chosen category's ID, or `null` for all categories.
 * @fires sefaria-connections-preview-request - Requests connection previews. The element loads them unless a listener cancels the event. Call `preventDefault()` to stop the panel from loading previews itself. If you don't call it, a panel that loads from `sref` requests the connections again with their text.
 * @eventDetail sefaria-connections-preview-request - No fields.
 * @fires sefaria-connections-page-change - Asks to show a different page of connections. Call `preventDefault()` to stop the panel from changing page.
 * @eventDetail sefaria-connections-page-change - `page` is the zero-based page number.
 * @fires sefaria-connection-select - Reports that a reader selected one connected reference. Call `preventDefault()` to do nothing. The panel has no default action for this event.
 * @eventDetail sefaria-connection-select - `id` is the connection's ID. `targetRef` is the connected text's reference.
 * @fires sefaria-connections-panel-error - Reports a failure while loading or validating data from `sref`.
 * @eventDetail sefaria-connections-panel-error - `error` is the original failure. `sref` is the reference that was loading.
 */
export class SefariaConnectionsPanel extends SefariaElement {
  /** Declarative data, request selection, and presentation properties. */
  static override properties = {
    sref: { type: String, useDefault: true },
    source: { attribute: false },
    withText: { type: Boolean, attribute: "with-text" },
    category: { type: String, converter: optionalStringConverter },
    page: { type: Number, useDefault: true },
    showPreviews: { type: Boolean, attribute: "show-previews" },
    vocalizationMode: {
      type: String,
      attribute: "vocalization-mode",
      useDefault: true,
    },
  };
  /** Responsive styles confined to the panel's shadow root. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border-radius: var(--_sefaria-panel-radius);
      }
      nav {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-block: 0.5rem 1rem;
      }
      button {
        font: inherit;
        color: inherit;
        background: transparent;
        border: 1px solid var(--_sefaria-border);
        border-radius: var(--_sefaria-control-radius);
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        max-width: 100%;
        overflow-wrap: anywhere;
      }
      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      button[aria-pressed="true"] {
        font-weight: bold;
        border-width: 2px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      article {
        border-block-start: 1px solid var(--_sefaria-border);
        padding-block: 1rem;
        overflow-wrap: anywhere;
      }
      .open {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        text-align: start;
      }
      .english {
        font-family: var(--_sefaria-font-english);
      }
      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }
      .preview {
        margin-block: 0.7rem;
      }
      .metadata {
        font-size: 0.8em;
        color: var(--_sefaria-fg-muted);
      }
      h3 {
        font-size: 1em;
        overflow-wrap: anywhere;
      }
    `,
  ];
  /** The Sefaria reference to load when `data` isn't set. */
  declare sref: string;
  /** Where this element gets its data, instead of the shared data source. */
  declare source: SefariaDataSource | undefined;
  /** Whether the links include the connected texts. */
  declare withText: boolean;
  /** Category of the loaded links to show. */
  declare category: string | undefined;
  /** Zero-based page of the loaded links to show. */
  declare page: number;
  /** Shows or hides the text previews already loaded, without fetching more. */
  declare showPreviews: boolean;
  /** How much Hebrew vowel and cantillation marking to keep in previews. `none` removes both. */
  declare vocalizationMode: VocalizationMode;

  #displayViewModel: ConnectionsViewModel | undefined;
  #displayMode: VocalizationMode | undefined;
  #displayHtml = new Map<string, string>();
  #capture:
    | {
        readonly payload: CoreLinkResponse;
        readonly status: 200 | 400;
        readonly request: ConnectionsRequest;
      }
    | undefined;
  #active:
    | {
        readonly id: number;
        readonly controller: AbortController;
      }
    | undefined;
  #nextOperationId = 1;
  #declarativeActive = false;
  #resumeOnConnect = false;
  #committedViewModel: ConnectionsViewModel | undefined;
  #ownedViewModel: ConnectionsViewModel | undefined;
  #statusOverride: SefariaElementStatus | undefined;

  constructor() {
    super();
    this.sref = "";
    this.source = undefined;
    this.withText = true;
    this.category = undefined;
    this.page = 0;
    this.showPreviews = true;
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
        new DOMException("Connections panel disconnected.", "AbortError"),
      );
      this.#active = undefined;
      this.#resumeOnConnect = true;
    }
    super.disconnectedCallback();
  }

  /** Loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. */
  get status(): SefariaElementStatus {
    return this.#statusOverride ?? statusOf(this.#viewModel);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("sref") ||
      changed.has("source") ||
      changed.has("withText")
    ) {
      this.#resumeOnConnect = false;
      this.#reconcile();
    } else if (changed.has("category") || changed.has("page")) {
      this.#reproject();
    }
  }

  protected override render() {
    assertVocalizationMode(this.vocalizationMode);
    const vm = this.#viewModel;
    if (!vm) return nothing;
    if (vm.state === "error") return html`<p role="alert">${vm.message}</p>`;
    if (vm.state !== "data")
      return html`<p role="status" aria-live="polite">${vm.message}</p>`;
    return html`
      <h2>Connections for ${vm.reference}</h2>
      <nav aria-label="Connection categories">
        <button
          type="button"
          aria-pressed=${vm.category === null}
          @click=${() => this.#emit("sefaria-connections-category-change", { category: null })}
        >
          Overview
        </button>
        ${vm.categories.map(
          (category) =>
            html`<button
              type="button"
              aria-pressed=${vm.category === category.id}
              @click=${() => this.#emit("sefaria-connections-category-change", { category: category.id })}
            >
              ${category.id} (${category.count})
            </button>`,
        )}
      </nav>
      ${
        this.showPreviews && !vm.previewsIncluded
          ? html`<p>Preview text was not requested.</p>
              <button
                type="button"
                @click=${() => this.#emit("sefaria-connections-preview-request", {})}
              >
                Load previews
              </button>`
          : nothing
      }
      ${
        vm.category === null
          ? html`<p>${vm.total} text connections. Select a category.</p>`
          : html` <p role="status">
                Page ${vm.page + 1}: ${vm.entries.length} of ${vm.total}
                ${vm.category} connections
              </p>
              ${vm.entries.length === 0 ? html`<p>No entries on this page.</p>` : nothing}
              ${repeat(
                vm.entries,
                (entry) => entry.id,
                (entry) => this.#entry(entry),
              )}
              <nav aria-label="Connection pages">
                <button
                  type="button"
                  ?disabled=${vm.page === 0}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: 0 })}
                >
                  First page
                </button>
                <button
                  type="button"
                  ?disabled=${vm.page === 0}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: vm.page - 1 })}
                >
                  Previous
                </button>
                <button
                  type="button"
                  ?disabled=${(vm.page + 1) * vm.pageSize >= vm.total}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: vm.page + 1 })}
                >
                  More
                </button>
              </nav>`
      }
    `;
  }

  #entry(entry: ConnectionEntry) {
    const preview = entry.preview;
    return html`<article>
      <h3>${entry.book}</h3>
      <button
        class="open"
        type="button"
        aria-label=${`Open ${entry.targetRef} in context`}
        @click=${() => this.#emit("sefaria-connection-select", { id: entry.id, targetRef: entry.targetRef })}
      >
        <span lang="en" dir="ltr">${entry.targetRef}</span
        ><span lang="he" dir="rtl">${entry.hebrewRef}</span>
      </button>
      ${
        !this.showPreviews
          ? nothing
          : preview.state === "available"
            ? html`
                ${preview.english ? html`<div class="preview english" lang="en" dir="ltr">${unsafeHTML(this.#safeHtml(preview.english.html))}</div>` : html`<p>No English-channel text.</p>`}
                ${preview.hebrew ? html`<div class="preview hebrew" lang="he" dir="rtl">${unsafeHTML(this.#safeHtml(preview.hebrew.html))}</div>` : html`<p>No Hebrew-channel text.</p>`}
                ${preview.english?.truncated || preview.hebrew?.truncated ? html`<p>Preview shortened. Open the connection to read more.</p>` : nothing}
                ${entry.editions.length ? html`<p class="metadata">Editions reported for this connection: ${entry.editions.join("; ")}</p>` : nothing}
                ${entry.licenses.length ? html`<p class="metadata">Licenses reported: ${entry.licenses.join("; ")}</p>` : nothing}
              `
            : html`<p>
                ${preview.state === "absent" ? "No preview text is available." : "Preview text was not requested."}
              </p>`
      }
    </article>`;
  }

  #safeHtml(html: string): string {
    if (
      this.#displayViewModel !== this.#viewModel ||
      this.#displayMode !== this.vocalizationMode
    ) {
      this.#displayViewModel = this.#viewModel;
      this.#displayMode = this.vocalizationMode;
      this.#displayHtml.clear();
    }
    const existing = this.#displayHtml.get(html);
    if (existing !== undefined) return existing;
    const displayed = deriveSafeHtmlDisplay(html, this.vocalizationMode);
    this.#displayHtml.set(html, displayed);
    return displayed;
  }

  #emit(name: string, detail: object): void {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
    const capture = this.#capture;
    if (capture === undefined) return;
    queueMicrotask(() => {
      if (event.defaultPrevented || this.#capture !== capture) return;
      if (name === "sefaria-connections-category-change") {
        const category = (detail as { readonly category: string | null })
          .category;
        this.category = category ?? undefined;
        this.page = 0;
      } else if (name === "sefaria-connections-page-change") {
        this.page = (detail as { readonly page: number }).page;
      } else if (
        name === "sefaria-connections-preview-request" &&
        capture.request.withText === false
      ) {
        this.withText = true;
      }
    });
  }

  #reconcile(): void {
    if (!this.isConnected) {
      this.#resumeOnConnect = true;
      return;
    }

    const sref = this.sref.trim();
    if (sref.length === 0) {
      this.#cancelActive("Connections inputs were cleared.");
      this.#capture = undefined;
      if (this.#declarativeActive) this.#clear();
      this.#declarativeActive = false;
      return;
    }

    this.#declarativeActive = true;
    this.#startLoad({ tref: sref, withText: this.withText });
  }

  #startLoad(request: ConnectionsRequest): void {
    this.#cancelActive("Superseded connections load.");
    const active = {
      id: this.#nextOperationId++,
      controller: new AbortController(),
    };
    this.#active = active;
    this.#publish({
      state: "loading",
      message: `Loading connections for ${request.tref}.`,
    });
    void this.#load(request, active);
  }

  async #load(
    request: ConnectionsRequest,
    active: { readonly id: number; readonly controller: AbortController },
  ): Promise<void> {
    try {
      const source = resolveSefariaDataSource(this.source);
      if (source.kind === "disabled") {
        throw new Error("Sefaria data loading is disabled.");
      }
      const response =
        source.kind === "client"
          ? await this.#loadFromClient(
              request,
              source.client,
              active.controller.signal,
            )
          : await this.#loadFromDataLoader(
              request,
              source.loader,
              active.controller.signal,
            );
      if (this.#active !== active) return;
      this.#captureAndProject(response.payload, response.status, request);
      if (this.#active !== active) return;
      this.#active = undefined;
    } catch (error) {
      if (this.#active !== active) return;
      this.#active = undefined;
      if (active.controller.signal.aborted) return;
      this.#publishDataSourceFailure(error, "Links loading failed.");
      this.dispatchEvent(
        new CustomEvent("sefaria-connections-panel-error", {
          bubbles: true,
          composed: true,
          detail: { error, sref: request.tref },
        }),
      );
    }
  }

  async #loadFromClient(
    request: ConnectionsRequest,
    client: Extract<SefariaDataSource, { kind: "client" }>["client"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    const result = await related.getLinks({
      client,
      path: { tref: request.tref },
      query: createConnectionsQuery(request),
      signal,
    });
    if (result.data !== undefined) {
      return { payload: result.data, status: 200 };
    }
    if (result.error !== undefined && result.response.status === 400) {
      return { payload: result.error, status: 400 };
    }
    throw new Error("The links request returned no data or documented error.");
  }

  async #loadFromDataLoader(
    request: ConnectionsRequest,
    loader: Extract<SefariaDataSource, { kind: "custom" }>["loader"],
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: number }> {
    if (loader.getLinks === undefined) {
      throw new Error("The selected data source does not support links.");
    }
    return await loader.getLinks(
      {
        sref: request.tref,
        withText: request.withText !== false,
      },
      signal,
    );
  }

  #captureAndProject(
    payload: unknown,
    status: number,
    request: ConnectionsRequest,
  ): void {
    if (status !== 200 && status !== 400) {
      throw new Error(`Unsupported links response status ${status}.`);
    }
    const validated = validateSuppliedComponentData<CoreLinkResponse>(
      { method: "GET", path: "/api/links/{tref}", status },
      payload,
    );
    this.#capture = {
      payload: structuredClone(validated),
      status,
      request: Object.freeze({ ...request }),
    };
    this.#reproject();
  }

  #reproject(): void {
    const capture = this.#capture;
    if (capture === undefined) return;
    try {
      this.#commit(
        createConnectionsViewModel(
          capture.payload,
          capture.request,
          {
            ...(this.category === undefined ? {} : { category: this.category }),
            page: this.page,
          },
          capture.status,
        ),
      );
    } catch (error) {
      this.#commit({
        state: "error",
        errorKind: "projection",
        message:
          error instanceof Error
            ? error.message
            : "Connections projection failed.",
      });
    }
  }

  #cancelActive(message: string): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.controller.abort(new DOMException(message, "AbortError"));
  }

  get #viewModel(): ConnectionsViewModel | undefined {
    return getPreparedState<ConnectionsViewModel>(this);
  }

  #publish(viewModel: ConnectionsViewModel | undefined): void {
    this.#statusOverride = undefined;
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }

  #commit(viewModel: ConnectionsViewModel): void {
    this.#committedViewModel = viewModel;
    this.#publish(viewModel);
  }

  #clear(): void {
    this.#capture = undefined;
    this.#committedViewModel = undefined;
    if (this.#viewModel === this.#ownedViewModel) this.#publish(undefined);
    this.#ownedViewModel = undefined;
  }

  #publishDataSourceFailure(error: unknown, fallback: string): void {
    this.#statusOverride = "error";
    const viewModel = this.#committedViewModel ?? {
      state: "error",
      errorKind: "load",
      message: error instanceof Error ? error.message : fallback,
    };
    this.#ownedViewModel = viewModel;
    setPreparedState(this, viewModel);
  }
}

function statusOf(
  viewModel: ConnectionsViewModel | undefined,
): SefariaElementStatus {
  if (viewModel === undefined) return "empty";
  if (viewModel.state === "data") return "ready";
  return viewModel.state;
}

if (!customElements.get("sefaria-connections-panel")) {
  customElements.define("sefaria-connections-panel", SefariaConnectionsPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-connections-panel": SefariaConnectionsPanel;
  }
}
