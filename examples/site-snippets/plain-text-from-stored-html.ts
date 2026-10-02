import {
  createTextPreview,
  normalizeText,
} from "@arithmomaniac/sefaria-text-transform";

const stored =
  "<b>Line one</b><br>line two<sup class='footnote-marker'>a</sup><i class='footnote'>A note.</i>";

// The default limit is 3500 graphemes. Raise it to keep long passages whole.
const { text, truncated } = createTextPreview(stored, 100_000);
console.log(text, truncated);

// Footnotes are not in `text`. Read them from `normalizeText`.
const notes = normalizeText(stored).notes.map((note) =>
  note.contentHtml === null
    ? ""
    : createTextPreview(note.contentHtml, 100_000).text,
);
console.log(notes);
