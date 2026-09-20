import { describe, expect, it } from "vitest";

import { normalizeText } from "../src/index.js";
import fixtureManifest from "./fixtures/manifest.json" with { type: "json" };

function fixture(name: string): string {
  const entry = fixtureManifest.fixtures.find(
    (candidate) => candidate.name === name,
  );
  if (!entry) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return entry.input;
}

describe("normalizeText", () => {
  it("preserves native formatting and normalizes obsolete big markup", () => {
    const input =
      '<b>b</b><strong>s</strong><i>i</i><em>e</em><u>u</u><big style="color:red">g</big><small>m</small><sup>p</sup><sub>q</sub><br>';

    expect(normalizeText(input)).toEqual({
      bodyHtml:
        '<b>b</b><strong>s</strong><i>i</i><em>e</em><u>u</u><span style="font-size: larger;">g</span><small>m</small><sup>p</sup><sub>q</sub><br>',
      notes: [],
    });
  });

  it("emits minimal source-meaning attributes and removes unsupported attributes", () => {
    const input =
      '<a class="refLink extra" data-ref="Micah 6:8" data-ven="English edition" data-vhe="Hebrew edition" href="javascript:alert(1)" data-range="0-7" data-scroll-link="true" data-junk="x" onclick="x"><b>text</b></a>';

    expect(normalizeText(input)).toEqual({
      bodyHtml:
        '<span data-sefaria-ref="Micah 6:8" data-sefaria-ven="English edition" data-sefaria-vhe="Hebrew edition"><b>text</b></span>',
      notes: [],
    });
  });

  it("does not infer a Sefaria reference from a URL", () => {
    expect(normalizeText('<a href="/Micah.6.8">text</a>')).toEqual({
      bodyHtml: "text",
      notes: [],
    });
  });

  it("normalizes commentary and overlay markers without a kind attribute", () => {
    expect(normalizeText(fixture("shulchan-commentary-itag"))).toEqual({
      bodyHtml:
        'דין <span data-sefaria-commentator="Magen Avraham" data-sefaria-label="ג" data-sefaria-order="3"></span> השכמת',
      notes: [],
    });
    expect(normalizeText(fixture("jerusalem-overlay"))).toEqual({
      bodyHtml:
        'א<span data-sefaria-overlay="Venice Pages" data-sefaria-value="2a"></span>ב',
      notes: [],
    });
  });

  it("adds an unambiguous supplied commentary reference without guessing", () => {
    const input = '<i data-commentator="Magen Avraham" data-order="3"></i>';

    expect(
      normalizeText(input, {
        commentaryReferences: [
          {
            commentator: "Magen Avraham",
            order: "3",
            ref: "Magen Avraham 1:3",
          },
        ],
      }),
    ).toEqual({
      bodyHtml:
        '<span data-sefaria-commentator="Magen Avraham" data-sefaria-order="3" data-sefaria-ref="Magen Avraham 1:3"></span>',
      notes: [],
    });

    expect(
      normalizeText(input, {
        commentaryReferences: [
          {
            commentator: "Magen Avraham",
            order: "3",
            ref: "Magen Avraham 1:3",
          },
          {
            commentator: "Magen Avraham",
            order: "3",
            ref: "Magen Avraham 1:4",
          },
        ],
      }),
    ).toEqual({
      bodyHtml:
        '<span data-sefaria-commentator="Magen Avraham" data-sefaria-order="3"></span>',
      notes: [],
    });
  });

  it("accepts safe integer commentary orders but rejects invalid candidates", () => {
    expect(
      normalizeText('<i data-commentator="Magen Avraham" data-order="3"></i>', {
        commentaryReferences: [
          {
            commentator: "Magen Avraham",
            order: 3,
            ref: "Magen Avraham 1:3",
          },
        ],
      }).bodyHtml,
    ).toContain('data-sefaria-ref="Magen Avraham 1:3"');

    expect(() =>
      normalizeText("<b>x</b>", {
        commentaryReferences: [
          {
            commentator: "Magen Avraham",
            order: 1.1,
            ref: "Magen Avraham 1:1",
          },
        ],
      }),
    ).toThrow(TypeError);
  });

  it("extracts footnotes into key-only placeholders and separate safe HTML", () => {
    expect(normalizeText(fixture("genesis-footnote"))).toEqual({
      bodyHtml:
        'When God began to create<span data-sefaria-note="0"></span> heaven',
      notes: [
        {
          key: 0,
          markerHtml: "*",
          contentHtml: "<b>When God began to create </b>Others.",
        },
      ],
    });
  });

  it("distinguishes missing and empty note bodies and duplicate labels", () => {
    expect(
      normalizeText(
        '<sup class="footnote-marker">*</sup><i class="footnote"></i><sup class="footnote-marker">*</sup>',
      ),
    ).toEqual({
      bodyHtml:
        '<span data-sefaria-note="0"></span><span data-sefaria-note="1"></span>',
      notes: [
        { key: 0, markerHtml: "*", contentHtml: "" },
        { key: 1, markerHtml: "*", contentHtml: null },
      ],
    });
  });

  it("does not pair a marker across removed active content", () => {
    expect(
      normalizeText(
        '<sup class="footnote-marker">1</sup><script>x</script><i class="footnote">N</i>',
      ),
    ).toEqual({
      bodyHtml: '<span data-sefaria-note="0"></span><i>N</i>',
      notes: [{ key: 0, markerHtml: "1", contentHtml: null }],
    });
  });

  it("normalizes nested notes into the note content using one key space", () => {
    expect(
      normalizeText(
        'A<sup class="footnote-marker">a</sup><i class="footnote">outer <sup class="footnote-marker">b</sup><i class="footnote">inner</i></i>Z',
      ),
    ).toEqual({
      bodyHtml: 'A<span data-sefaria-note="0"></span>Z',
      notes: [
        {
          key: 0,
          markerHtml: "a",
          contentHtml: 'outer <span data-sefaria-note="1"></span>',
        },
        { key: 1, markerHtml: "b", contentHtml: "inner" },
      ],
    });
  });

  it("materializes inherited direction in detached note fragments", () => {
    expect(
      normalizeText(
        '<span dir="rtl">A<sup class="footnote-marker">1</sup><i class="footnote">N</i>Z</span>',
      ),
    ).toEqual({
      bodyHtml: '<span dir="rtl">A<span data-sefaria-note="0"></span>Z</span>',
      notes: [
        {
          key: 0,
          markerHtml: '<span dir="rtl">1</span>',
          contentHtml: '<span dir="rtl">N</span>',
        },
      ],
    });
  });

  it("normalizes reviewed MAM families and strips unreviewed classes", () => {
    expect(normalizeText(fixture("mam-structure"))).toEqual({
      bodyHtml:
        '<span data-sefaria-label="פ" data-sefaria-mam="mam-spi-pe"></span><br><span data-sefaria-mam="mam-kq"><span data-sefaria-mam="mam-kq-k">כתיב</span><span data-sefaria-mam="mam-kq-q">קרי</span></span><span data-sefaria-mam="mam-kq-trivial">שְׁעָרָ֗ו</span>',
      notes: [],
    });

    expect(
      normalizeText(
        '<span class="poetry indentAll">line</span><span class="mam-implicit-maqaf">־</span>',
      ),
    ).toEqual({ bodyHtml: "line־", notes: [] });
  });

  it("preserves only approved direction values", () => {
    expect(
      normalizeText(
        '<span dir="rtl" class="unknown">א</span><i dir="auto">x</i><span dir="sideways">y</span>',
      ),
    ).toEqual({
      bodyHtml: '<span dir="rtl">א</span><i dir="auto">x</i>y',
      notes: [],
    });
  });

  it("unwraps block markup without concatenating visible text", () => {
    expect(
      normalizeText(
        "<section><p>one</p><p>two <mark>marked</mark></p></section><div>three</div><center>four</center><center>five</center>",
      ),
    ).toEqual({
      bodyHtml: "one two marked three four five",
      notes: [],
    });
  });

  it("preserves orphan note bodies as ordinary italics", () => {
    expect(
      normalizeText('A<i class="footnote">orphan <b>body</b></i>Z'),
    ).toEqual({
      bodyHtml: "A<i>orphan <b>body</b></i>Z",
      notes: [],
    });
  });

  it("uses parser recovery without inventing malformed metadata", () => {
    const result = normalizeText(
      '<i data-commentator=Mishnah Berurah" data-label="א"></i>',
    );

    expect(result.bodyHtml).not.toContain(
      'data-sefaria-commentator="Mishnah Berurah"',
    );
    expect(result.bodyHtml).not.toContain("Berurah");
  });

  it("keeps named-entity identity but no URL or range metadata", () => {
    expect(normalizeText(fixture("genesis-wrapped-entities"))).toEqual({
      bodyHtml:
        '<span data-sefaria-ref="Genesis 10:1">Genesis</span> <span data-sefaria-slug="noah">Noah</span>',
      notes: [],
    });
  });

  it("removes active content, hostile attributes, and images except alt text", () => {
    expect(normalizeText(fixture("hostile-synthetic"))).toEqual({
      bodyHtml: "unsafesafe text",
      notes: [],
    });
    expect(
      normalizeText(
        '<img src="https://evil.test/x" onerror="x" alt="&lt;map&gt;">',
      ),
    ).toEqual({ bodyHtml: "&lt;map&gt;", notes: [] });
  });

  it("narrows features without widening the fixed policy", () => {
    expect(
      normalizeText(
        `${fixture("genesis-footnote")}${fixture("shulchan-commentary-itag")}${fixture("genesis-wrapped-entities")}`,
        {
          allowFootnotes: false,
          allowInlineAnnotations: false,
          allowNamedEntities: false,
          allowRefLinks: false,
        },
      ),
    ).toEqual({
      bodyHtml: "When God began to create heavenדין  השכמתGenesis Noah",
      notes: [],
    });
  });

  it("is deterministic and handles deep unsupported nesting iteratively", () => {
    const input = `${'<span data-sefaria-note="9">'.repeat(5_000)}text${"</span>".repeat(5_000)}`;
    const result = normalizeText(input);

    expect(result).toEqual({ bodyHtml: "text", notes: [] });
    expect(normalizeText(input)).toEqual(result);
  });

  it("bounds output expansion across body and note fragments", () => {
    expect(() =>
      normalizeText('<i data-commentator="Rashi" data-order="1"></i>', {
        commentaryReferences: [
          {
            commentator: "Rashi",
            order: 1,
            ref: "R".repeat(70_000),
          },
        ],
      }),
    ).toThrow(RangeError);
  });
});
