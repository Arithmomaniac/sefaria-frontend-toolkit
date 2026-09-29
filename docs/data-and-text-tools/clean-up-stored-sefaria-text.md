---
title: "Use the data and text tools › Clean up stored Sefaria text"
description: "See what normalizeText and the vocalization helpers change in stored Sefaria text, then combine them to prepare safe HTML, footnotes, and a chosen vowel level."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Clean up stored Sefaria text

You clean stored Sefaria text in two steps. First, `normalizeText` changes the markup: it makes Sefaria's HTML safe and moves footnotes aside. Then the vocalization helpers change characters, such as vowel points and cantillation. Both come from `@arithmomaniac/sefaria-text-transform` and make no network requests.

## What changes in the markup

| Stored markup | After `normalizeText` |
| --- | --- |
| `<b>bold</b>, <i>italic</i> and G<small>OD</small>` | `<b>bold</b>, <i>italic</i> and G<small>OD</small>` |
| `Line one<br><span class="poetry indentAll">line two</span>` | `Line one<br>line two` |
| `<p>First paragraph</p><p>Second paragraph</p>` | `First paragraph Second paragraph` |
| `<span class="mam-spi-pe">{פ}</span>` | `<span data-sefaria-mam="petuchah">{פ}</span>` |
| `<a class="refLink" href="/Micah.6.8" data-ref="Micah 6:8">Micah 6:8</a>` | `<span data-sefaria-ref="Micah 6:8">Micah 6:8</span>` |
| `<a class="namedEntityLink" href="/topics/micah" data-slug="micah">Micah</a>` | `<span data-sefaria-slug="micah">Micah</span>` |
| `<sup class="footnote-marker">a</sup><i class="footnote">A note.</i>` | `<span data-sefaria-note="0"></span>` |
| `<i data-commentator="Rashi" data-order="1"></i>` | `<span data-sefaria-commentator="Rashi" data-sefaria-order="1"></span>` |
| `<b onclick="steal()" style="color: red">text</b>` | `<b>text</b>` |
| `<a href="https://example.com">a website</a>` | `a website` |
| `<img src="https://example.com/x.png" alt="a picture">` | `a picture` |
| `<script>steal()</script>kept` | `kept` |

<CodeLanguageToggle :snippet="snippets['text-markup-before-after']" />

The table is the output of this program.

What each kind of input becomes:

- **Kept as is:** the formatting tags `b`, `strong`, `i`, `em`, `u`, `small`, `sup`, `sub`, and `br`. Their attributes are removed. The one attribute kept on some elements is `dir`, when it is `ltr`, `rtl`, or `auto`.
- **Unwrapped (tag removed, text kept):** spans without a recognized class, such as Sefaria's poetry classes, unknown tags, and links with no Sefaria reference or topic. A span with an allowed `dir` keeps just that `dir`. `href` and `src` attributes are dropped, so the output has no links or loaded resources. A web address written in the text itself stays as plain text.
- **Block tags** such as `p`, `div`, `li`, and `h1` to `h6` are removed, and their text is separated by a space.
- **`<big>`** becomes `<span style="font-size: larger;">`.
- **Sefaria markers** become `data-sefaria-*` attributes on `span` elements:
  - `data-sefaria-mam` marks Masoretic paragraph markers and ketiv/qere. Its values are `petuchah`, `setumah`, `inverted-nun`, `ketiv-qere`, `ketiv`, `qere`, and `trivial-variant`.
  - `data-sefaria-ref` comes from reference links, with optional `data-sefaria-ven` and `data-sefaria-vhe` for edition titles.
  - `data-sefaria-slug` comes from topic links.
  - `data-sefaria-note` is a footnote placeholder.
  - `data-sefaria-commentator`, with optional `data-sefaria-label` and `data-sefaria-order`, marks where a commentary attaches. It gets a `data-sefaria-ref` only when you pass matching `commentaryReferences` to `normalizeText`.
  - `data-sefaria-overlay` and `data-sefaria-value` mark overlays.
  - `data-sefaria-end-footnote` and `data-sefaria-commentary-marker` mark superscript end-footnote and commentary markers.

  Your CSS or renderer can style or read these. The [complete list](/reference/text-transform.md#normalized-html-output) is in the reference.

- **Removed completely, with their content:** active elements such as `script`, `style`, `iframe`, `object`, `embed`, `svg`, `math`, `form` and `input` elements, `audio`, `video`, and `canvas`. The reference lists the rest.
- **Images** become their `alt` text.
- **Footnotes:** each footnote marker becomes an empty `<span data-sefaria-note="N">` placeholder. `normalizeText` returns the footnotes in `notes`, each with `key`, `markerHtml`, and `contentHtml`. `contentHtml` is `null` when the marker had no footnote body. Options such as `allowFootnotes: false` drop footnotes, and the other `allow…` options drop other markers. No option adds a tag or attribute outside the list above.

## Change vowels and cantillation

Nikkud are vowel points. Taamim are cantillation marks, the musical accents. Pick one of three modes:

- `taamim_and_nikkud` returns the text unchanged.
- `nikkud` removes cantillation and keeps vowel points. It also removes meteg and rafe, two small marks written with the vowels.
- `none` removes vowel points too, and the sof pasuq (׃) that ends a verse. Letters, spaces, maqaf (־), digits, and most punctuation stay.

A PASEQ (׀) is a vertical line between words. It is handled only when cantillation is removed, in modes `nikkud` and `none`. The default, `paseq: "after-space"`, removes a PASEQ that comes right after a space or other whitespace character, together with that one character, and keeps any other PASEQ. `paseq: "always"` removes every PASEQ and leaves the spaces around it.

Use `applyVocalization` for plain text and `applyVocalizationToHtml` for HTML. The HTML version changes the characters in text, not in tags or attribute values. Give it HTML that `normalizeText` has already produced.

## Normalize first, then vocalize

<CodeLanguageToggle :snippet="snippets['prepare-stored-text']" />

```text
taamim_and_nikkud: הִגִּ֥יד לְךָ֛ אָדָ֖ם מַה־טּ֑וֹב וְהַצְנֵ֥עַ לֶ֖כֶת עִם־אֱלֹהֶֽיךָ׃ <span data-sefaria-mam="setumah">{ס}</span>
nikkud: הִגִּיד לְךָ אָדָם מַה־טּוֹב וְהַצְנֵעַ לֶכֶת עִם־אֱלֹהֶיךָ׃ <span data-sefaria-mam="setumah">{ס}</span>
none: הגיד לך אדם מה־טוב והצנע לכת עם־אלהיך <span data-sefaria-mam="setumah">{ס}</span>
after-space: אָדָם מַה־טּוֹב׀
always: אָדָם  מַה־טּוֹב
```

To build your own display step, follow `prepareForDisplay`: make the markup safe with `normalizeText`, vocalize the resulting `bodyHtml`, then vocalize each note's `markerHtml` and `contentHtml` so the footnotes match the body. It returns the safe HTML, the footnotes, and the mode you chose. The last two lines show the PASEQ modes: `after-space` drops the PASEQ after the space, and `always` also drops the one attached to the last word, leaving two spaces between the words.

`applyVocalizationToHtml` is not a sanitizer. Given unsafe HTML, it keeps the unsafe tags and attributes. Run `normalizeText` first.

<span class="learn-more__label">Learn more:</span> [Clean text and safety](/concepts/clean-text-and-safety.md) · [Normalized HTML output](/reference/text-transform.md#normalized-html-output) {.learn-more}

## Next steps

- [How the toolkit works](/concepts/how-the-toolkit-works.md)
- [Text tools reference](/reference/text-transform.md)
