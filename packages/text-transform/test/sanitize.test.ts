import { describe, expect, it } from "vitest";

import { normalizeText } from "../src/index.js";

describe("normalizeText safety policy", () => {
  it("removes active subtrees instead of unwrapping them", () => {
    expect(
      normalizeText(
        "a<script><b>script text</b></script><style>style text</style><template>template text</template><svg><text>svg text</text></svg>b",
      ),
    ).toEqual({ bodyHtml: "ab", notes: [] });
  });

  it("removes all unsupported attributes from retained formatting", () => {
    expect(
      normalizeText(
        '<b class="x" style="color:red" onclick="x" data-sefaria-note="9">text</b>',
      ),
    ).toEqual({ bodyHtml: "<b>text</b>", notes: [] });
  });

  it("uses deterministic separators when unwrapping blocks", () => {
    expect(
      normalizeText("<section><p>one</p><p>two</p></section><div>three</div>"),
    ).toEqual({ bodyHtml: "one two three", notes: [] });
  });

  it("removes recognized optional features when disabled", () => {
    expect(
      normalizeText(
        '<sup class="footnote-marker">*</sup><i class="footnote">note</i><i data-commentator="Rashi"></i><a data-ref="Micah 6:8">ref</a><a class="namedEntityLink" data-slug="moses">entity</a>',
        {
          allowFootnotes: false,
          allowInlineAnnotations: false,
          allowNamedEntities: false,
          allowRefLinks: false,
        },
      ),
    ).toEqual({ bodyHtml: "refentity", notes: [] });
  });
});
