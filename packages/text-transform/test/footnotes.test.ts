import { describe, expect, it } from "vitest";

import { normalizeText } from "../src/index.js";

describe("normalizeText footnotes", () => {
  it("keeps multiple notes and duplicate labels in source order", () => {
    expect(
      normalizeText(
        'A<sup class="footnote-marker">*</sup><i class="footnote">one</i>B<sup class="footnote-marker">*</sup><i class="footnote">two</i>C',
      ),
    ).toEqual({
      bodyHtml:
        'A<span data-sefaria-note="0"></span>B<span data-sefaria-note="1"></span>C',
      notes: [
        { key: 0, markerHtml: "*", contentHtml: "one" },
        { key: 1, markerHtml: "*", contentHtml: "two" },
      ],
    });
  });

  it("preserves safe nested markup in marker and content HTML", () => {
    expect(
      normalizeText(
        '<sup class="footnote-marker"><b>א</b></sup><i class="footnote">outer <i>inner</i> end</i>',
      ),
    ).toEqual({
      bodyHtml: '<span data-sefaria-note="0"></span>',
      notes: [
        {
          key: 0,
          markerHtml: "<b>א</b>",
          contentHtml: "outer <i>inner</i> end",
        },
      ],
    });
  });

  it("does not pair across non-whitespace content", () => {
    expect(
      normalizeText(
        '<sup class="footnote-marker">1</sup>x<i class="footnote">orphan</i>',
      ),
    ).toEqual({
      bodyHtml: '<span data-sefaria-note="0"></span>x<i>orphan</i>',
      notes: [{ key: 0, markerHtml: "1", contentHtml: null }],
    });
  });
});
