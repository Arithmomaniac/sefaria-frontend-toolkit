---
title: "Concepts › Clean text and safety"
description: "Explains why Sefaria's text needs cleaning before it goes on a page, what normalizeText makes safe, why the vocalization helpers don't, and what your site still owns."
---

> Created/edited by GitHub Copilot; pending human review.

# Clean text and safety

Sefaria's text is HTML, and you should not put it on a page as it arrives. This page explains why, what the toolkit's text tools make safe, and what remains your site's job.

## Why Sefaria text needs cleaning

Besides plain formatting, Sefaria text carries markup that is specific to Sefaria. It marks footnotes, commentary markers, reference links, named-entity links, and Masorah notes.

This causes two problems:

- A browser doesn't know what Sefaria's markup means. It can't turn a footnote marker into a footnote for you.
- If you insert raw HTML into your page, unsafe HTML can contain executable content, such as event handlers, that runs with your page's permissions.

To _sanitize_ HTML is to remove or rewrite everything that could run or load something unexpected, so that only a known-safe set is left. Cleaning Sefaria text means sanitizing it and also interpreting its markup. The toolkit does both in one function, `normalizeText`.

## What `normalizeText` does

`normalizeText(html, options)` returns `{ bodyHtml, notes }`. The output uses a fixed set of elements: `b`, `strong`, `i`, `em`, `u`, `small`, `sup`, `sub`, `br`, and `span`. A `span` carries only `dir`, a fixed set of `data-sefaria-*` attributes, and, for converted `big` markup, a generated `font-size: larger` style. Incoming style attributes are discarded.

Everything else is handled by rule:

- **Active elements are removed with their content.** This covers `script`, `style`, `iframe`, `object`, `embed`, `svg`, `form` elements, media elements, and others.
- **Unsupported attributes are not emitted.** Event handlers, `href`, and `src` don't reach the output.
- **Other unsupported elements are unwrapped.** The element goes and its text stays. An image becomes its alt text.
- **Text is escaped again on output.**
- **Links become inert.** With reference handling enabled, a link with a nonblank `data-ref` becomes a `span` with `data-sefaria-ref`. Named-entity links can become inert entity spans. Other links are unwrapped, keeping their safe text.
- **Footnotes move out of the text.** When footnote handling is on, each recognized marker and its body go into `notes` with a `key`, `markerHtml`, and `contentHtml`, and a `span[data-sefaria-note]` placeholder marks where it was. A body with no marker stays as ordinary italics, and a missing body gives `contentHtml: null`. With footnotes turned off, they are omitted.
- **Malformed HTML is recovered, not rejected.** The parser repairs it.
- **Output growth is bounded.** The output can be up to eight times the input's length, or 64 KiB of text for short inputs, whichever is larger. Ordinary Sefaria text stays far below that. Past it, the function throws a `RangeError`. If you need an absolute size cap, enforce it yourself.

The tests include a hostile sample with a `javascript:` URL, event handlers, inline style, and a script. For the full output rules, see the [normalized HTML output](/reference/text-transform.md#normalized-html-output) section of the reference, and for before-and-after examples see [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md).

The components show passage text only after this step. Text Segment, Source Card, and Bilingual Segment normalize the passage HTML they display. Titles, labels, and messages are shown as escaped text. Connections Panel previews go through `createTextPreview`, described below.

## What the vocalization helpers don't do

Vocalization here means choosing which Hebrew marks to show. The modes are `taamim_and_nikkud`, `nikkud`, and `none`. Taamim are cantillation marks, the signs for chanting. Nikkud are the vowel points.

`applyVocalization` changes these marks in plain text. `applyVocalizationToHtml` changes them only in the text of an HTML string. It parses and re-serializes the HTML, so spelling, quoting, and attribute order can change, but it keeps the elements and attributes. If you pass it unsafe HTML, the unsafe parts stay.

Neither one is a sanitizer. If you need both, normalize first, then vocalize.

## Why `createTextPreview` is different

`createTextPreview(input, maximumGraphemes = 3500)` calls `normalizeText` first, with footnotes, annotations, and reference links turned off. Then it shortens the result. It returns `{ html, text, truncated }`. Because it normalizes before it shortens, its `html` is safe to insert.

## Sorting samples

| Sample | Safe to insert? | Why |
| --- | --- | --- |
| `bodyHtml` from `normalizeText` | Yes | It uses only the fixed elements and attributes. |
| Raw Sefaria text from the API | Not until normalized | It is HTML with Sefaria markup, and nothing has cleaned it. |
| Output of `applyVocalization` or `applyVocalizationToHtml` on raw HTML | Not until normalized | These are vocalization changes, not sanitizers; unsafe markup and attributes can remain. |
| `html` from `createTextPreview` | Yes | It normalizes first, then shortens. |
| HTML your own site writes or gets from elsewhere | Your responsibility | The toolkit never saw it, so it can't vouch for it. |

The first and fourth rows are safe toolkit output. The second is safe after normalization. The third is not safe until you normalize it, like the second. The fifth is content you own.

## What your site still owns

The text tools clean the text you pass to them. They don't secure the page around it. You still own:

- Any HTML you insert that didn't come from `normalizeText` or `createTextPreview`.
- Your own scripts and styles, and your Content Security Policy.
- How you style or show the `data-sefaria-*` spans and the notes.
- Accessibility.
- Not adding links or attributes back from the raw source without checking them.

For general background on the attack this guards against, see MDN's page on [cross-site scripting](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS).

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md#without-components), [Text tools reference](/reference/text-transform.md) {.learn-more}
