import { css, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { VocalizationMode } from "@arithmomaniac/sefaria-text-transform";

import { SefariaElement } from "./sefaria-element.js";
import type {
  TextSegmentDataViewModel,
  TextSegmentViewModel,
} from "./text-segment.js";
import {
  assertVocalizationMode,
  deriveTextSegmentDisplay,
  type TextSegmentDisplay,
} from "./vocalization-display.js";

const NOTE_PLACEHOLDER_PATTERN = /<span data-sefaria-note="(\d+)"><\/span>/gu;

/** Request-free custom element that renders one text-segment view model. */
export class SefariaTextSegment extends SefariaElement {
  /** Lit property metadata for the host-supplied view model. */
  static override properties = {
    viewModel: { attribute: false },
    vocalizationMode: { type: String, attribute: "vocalization-mode" },
  };

  /** Text-segment layout, typography, footnotes, and containment styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
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

  /** Render-ready state supplied by the host. */
  declare viewModel: TextSegmentViewModel;
  /** Hebrew vocalization preset applied only to the displayed safe text. */
  declare vocalizationMode: VocalizationMode;

  #displayViewModel: TextSegmentDataViewModel | undefined;
  #displayMode: VocalizationMode | undefined;
  #displayValue: TextSegmentDisplay | undefined;

  constructor() {
    super();
    this.vocalizationMode = "taamim_and_nikkud";
  }

  protected override render() {
    assertVocalizationMode(this.vocalizationMode);
    const viewModel = this.viewModel;
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
