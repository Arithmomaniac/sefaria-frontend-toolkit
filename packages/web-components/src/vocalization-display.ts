import {
  applyVocalization,
  applyVocalizationToHtml,
  type VocalizationMode,
} from "@arithmomaniac/sefaria-text-transform";

import type { TextSegmentDataViewModel } from "./text-segment.js";

/** Full safe fields or a non-full display derived from them. */
export type TextSegmentDisplay = Pick<
  TextSegmentDataViewModel,
  "body" | "notes"
>;

/** Rejects unsupported runtime values assigned through JavaScript or markup. */
export function assertVocalizationMode(
  mode: unknown,
): asserts mode is VocalizationMode {
  if (
    typeof mode !== "string" ||
    !["taamim_and_nikkud", "nikkud", "none"].includes(mode)
  ) {
    throw new TypeError("Vocalization mode contains an unsupported value.");
  }
}

/** Derives one reversible text display from immutable full safe segment data. */
export function deriveTextSegmentDisplay(
  viewModel: TextSegmentDataViewModel,
  mode: VocalizationMode,
): TextSegmentDisplay {
  assertVocalizationMode(mode);
  if (mode === "taamim_and_nikkud") return viewModel;
  return {
    body: viewModel.body.map((part) =>
      part.kind === "html"
        ? { kind: "html", html: applyVocalizationToHtml(part.html, mode) }
        : {
            kind: "footnote-marker",
            noteIndex: part.noteIndex,
            markerText: applyVocalization(part.markerText, mode),
          },
    ),
    notes: viewModel.notes.map((note) => ({
      index: note.index,
      markerText: applyVocalization(note.markerText, mode),
      content:
        note.content === null
          ? null
          : applyVocalizationToHtml(note.content, mode),
    })),
  };
}

/** Derives display HTML from an already-safe fragment. */
export function deriveSafeHtmlDisplay(
  html: string,
  mode: VocalizationMode,
): string {
  assertVocalizationMode(mode);
  return mode === "taamim_and_nikkud"
    ? html
    : applyVocalizationToHtml(html, mode);
}
