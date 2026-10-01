---
title: "Use the data and text tools › Clean up stored Sefaria text"
description: "See what normalizeText and the vocalization helpers change in stored Sefaria text, then combine them to prepare safe HTML, footnotes, and a chosen vowel level."
humanReviewed: false
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Clean up stored Sefaria text

You clean stored Sefaria text in two steps. First, `normalizeText` changes the markup. It makes Sefaria's HTML safe and moves footnotes aside. Then the vocalization helpers change characters, such as vowel points and cantillation. Both come from `@arithmomaniac/sefaria-text-transform` and make no network requests.

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

The snippet above runs each input through `normalizeText`. The table shows the results.

What each kind of input becomes:

- **Kept as is:** the formatting tags `b`, `strong`, `i`, `em`, `u`, `small`, `sup`, `sub`, and `br`. Their attributes are removed. The one attribute kept on some elements is `dir`, when it is `ltr`, `rtl`, or `auto`.
- **Unwrapped (tag removed, text kept):** spans without a recognized class (such as Sefaria's poetry classes), unknown tags, and links with no Sefaria reference or topic. A span with an allowed `dir` keeps just that `dir`. The tool drops `href` and `src` attributes, so the output has no links or loaded resources. A web address written in the text itself stays as plain text.
- **Block tags** such as `p`, `div`, `li`, and `h1` to `h6` are removed, and their text is separated by a space.
- **`<big>`** becomes `<span style="font-size: larger;">`.
- **Sefaria markers** become `span` elements with `data-sefaria-*` attributes. They cover Masoretic paragraph and ketiv/qere markers, reference and topic links, footnote placeholders, and inline commentary and overlay markers. Your CSS or renderer can style or read them. [Normalized HTML output](/reference/text-transform.md#normalized-html-output) lists each attribute and its values.

- **Removed completely, with their content:** active elements such as `script`, `style`, `iframe`, `object`, `embed`, `svg`, `math`, `form` and `input` elements, `audio`, `video`, and `canvas`. The reference lists the rest.
- **Images** become their `alt` text.
- **Footnotes:** each footnote marker becomes an empty `<span data-sefaria-note="N">` placeholder. `normalizeText` returns the footnotes in `notes`, each with `key`, `markerHtml`, and `contentHtml`. `contentHtml` is `null` when the marker had no footnote body. Options such as `allowFootnotes: false` drop footnotes. The other `allow…` options drop other markers. No option adds a tag or attribute outside the list above.

## Change vowels and cantillation

Nikkud are vowel points. Taamim are cantillation marks, the musical accents. Pick one of three modes:

- `taamim_and_nikkud` returns the text unchanged.
- `nikkud` removes cantillation and keeps vowel points. It also removes meteg and rafe, two small marks written with the vowels.
- `none` removes vowel points too, and the sof pasuq (׃) that ends a verse. Letters, spaces, maqaf (־), digits, and most punctuation stay.

A PASEQ (׀) is a vertical line between words. The tool handles it only when you remove cantillation, in modes `nikkud` and `none`. The default, `paseq: "after-space"`, removes a PASEQ that comes right after a space or other whitespace character. It removes that one character too. It keeps any other PASEQ. `paseq: "always"` removes every PASEQ and leaves the spaces around it.

Use `applyVocalization` for plain text and `applyVocalizationToHtml` for HTML. The HTML version changes the characters in text, not in tags or attribute values. Give it HTML that `normalizeText` has already produced.

## Normalize first, then vocalize

<CodeLanguageToggle :snippet="snippets['prepare-stored-text']" />

After you press Run, it prints one line per mode: the full marks, then vowels only, then neither. Two more lines show the two PASEQ settings. The Masoretic marker in each of the first three lines becomes a data-sefaria-mam span.

To build your own display step, follow `prepareForDisplay`:

1. Make the markup safe with `normalizeText`.
2. Vocalize the resulting `bodyHtml`.
3. Vocalize each note's `markerHtml` and `contentHtml` so the footnotes match the body.

It returns the safe HTML, the footnotes, and the mode you chose. In the PASEQ lines, `after-space` drops the PASEQ that follows a space. `always` also drops the one attached to the last word. This leaves two spaces between the words.

`applyVocalizationToHtml` is not a sanitizer. Given unsafe HTML, it keeps the unsafe tags and attributes. Run `normalizeText` first.

<span class="learn-more__label">Learn more:</span> [Clean text and safety](/concepts/clean-text-and-safety.md) · [Normalized HTML output](/reference/text-transform.md#normalized-html-output) {.learn-more}

## Next steps

- [How the toolkit works](/concepts/how-the-toolkit-works.md)
- [Text tools reference](/reference/text-transform.md)
