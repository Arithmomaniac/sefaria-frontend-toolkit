import {
  applyVocalizationToHtml,
  normalizeText,
} from "@arithmomaniac/sefaria-text-transform";
import type {
  NormalizedFootnote,
  PaseqMode,
  VocalizationMode,
} from "@arithmomaniac/sefaria-text-transform";

interface DisplayText {
  bodyHtml: string;
  notes: readonly NormalizedFootnote[];
  vocalization: VocalizationMode;
}

// Normalize first: it is the step that makes the HTML safe.
// Vocalization changes only the text inside already-safe HTML.
function prepareForDisplay(
  storedHtml: string,
  vocalization: VocalizationMode,
  paseq: PaseqMode = "after-space",
): DisplayText {
  const { bodyHtml, notes } = normalizeText(storedHtml);
  const vocalize = (html: string) =>
    applyVocalizationToHtml(html, vocalization, { paseq });
  return {
    bodyHtml: vocalize(bodyHtml),
    notes: notes.map((note) => ({
      ...note,
      markerHtml: vocalize(note.markerHtml),
      contentHtml:
        note.contentHtml === null ? null : vocalize(note.contentHtml),
    })),
    vocalization,
  };
}

// A shortened excerpt of Micah 6:8 from Sefaria's Masoretic Hebrew edition.
const micah =
  'הִגִּ֥יד לְךָ֛ אָדָ֖ם מַה־טּ֑וֹב וְהַצְנֵ֥עַ לֶ֖כֶת עִם־אֱלֹהֶֽיךָ׃ <span class="mam-spi-samekh">{ס}</span>';

for (const mode of ["taamim_and_nikkud", "nikkud", "none"] as const) {
  console.log(`${mode}: ${prepareForDisplay(micah, mode).bodyHtml}`);
}

// A PASEQ (׀) is a vertical line. Here one follows a space and one does not.
const withPaseq = "אָדָ֖ם ׀ מַה־טּ֑וֹב׀";
for (const paseq of ["after-space", "always"] as const) {
  console.log(
    `${paseq}: ${prepareForDisplay(withPaseq, "nikkud", paseq).bodyHtml}`,
  );
}
