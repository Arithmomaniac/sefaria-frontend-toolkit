import {
  applyVocalizationToHtml,
  type VocalizationMode,
} from "@arithmomaniac/sefaria-text-transform";

import type { TextSegmentDataViewModel } from "./text-segment.js";

/** Full safe fields or a non-full display derived from them. */
export type TextSegmentDisplay = Pick<
  TextSegmentDataViewModel,
  "bodyHtml" | "notes"
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
    bodyHtml: applyVocalizationToHtml(viewModel.bodyHtml, mode),
    notes: viewModel.notes.map((note) => ({
      key: note.key,
      markerHtml: applyVocalizationToHtml(note.markerHtml, mode),
      contentHtml:
        note.contentHtml === null
          ? null
          : applyVocalizationToHtml(note.contentHtml, mode),
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
