---
title: "Use components › Show Hebrew and translation together"
description: "Show a passage's primary text and a translation side by side or stacked, and choose the layout, order, language, and exact editions."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
import bilingual from "../../../examples/site-snippets/bilingual-segment.html?raw";
import bilingualChoices from "../../../examples/site-snippets/bilingual-segment-choices.html?raw";
import bilingualFallback from "../../../examples/site-snippets/bilingual-segment-fallback.html?raw";
import bilingualStates from "../../../examples/site-snippets/bilingual-segment-states.html?raw";
</script>

# Show Hebrew and translation together

The Bilingual Segment, `<sefaria-bilingual-segment>`, shows one passage in two editions at once: the primary text and a translation. You choose the layout, the side order, and the translation language. You can also choose the exact edition for each side.

## Show a passage in two editions

Set `sref` to the reference. The component asks Sefaria once for two editions:

- The **primary** edition, which is the edition Sefaria marks `isPrimary`. It is usually, but not always, the Hebrew or original text. For `Micah 6:8` it is "Miqra according to the Masorah".
- Sefaria's **default translation**. For `Micah 6:8` it is "THE JPS TANAKH: Gender-Sensitive Edition".

The component shows only the text. It doesn't name the editions or show a license. For a credit line, use [Source Card](/use-components/show-an-attributed-passage.md).

<LiveEditor :code="bilingual" title="Hebrew and translation" />

## Choose sides, layout, and editions

Set these attributes on the element. Add them one at a time and choose Run to see each change.

| Attribute | Values (default first) | What it changes | Changes what's requested? |
| --- | --- | --- | --- |
| `content-language` | `both`, `primary`, `translation` | Which sides show. | No |
| `layout` | `auto`, `stacked`, `side-by-side` | Two columns need both sides (`content-language="both"`). `auto` uses two columns when the component is 500px wide or more, and one column below that. `stacked` is always one column. `side-by-side` is always two columns. | No |
| `side-order` | `primary-first`, `translation-first` | Visual order in two-column layouts only. Stacked layouts and screen-reader order keep the primary side first. | No |
| `translation-language` | A full lowercase language-family name, such as `french` | The language you want for the translation. | Yes |
| `translation-fallback` | `none`, `default` | What happens when Sefaria has no text in your preferred language. See [Preferred language or exact edition](#preferred-language-or-exact-edition). | Only with `default` |
| `primary-version-title` | An exact edition title | The exact primary edition. It never falls back. | Yes |
| `translation-version-title` | An exact edition title | The exact translation edition. It never falls back. | Yes |
| `vocalization-mode` | `taamim_and_nikkud`, `nikkud`, `none` | Hebrew marks on each side. `nikkud` removes cantillation. `none` also removes vowel points. Both also remove a few other marks. See [Change vowels and cantillation](/data-and-text-tools/clean-up-stored-sefaria-text.md#change-vowels-and-cantillation). | No |

For the styling settings that every component shares, see [Show one passage](/use-components/show-text/show-one-passage.md#match-your-sites-colors-and-fonts).

The first element below reads side by side with the translation first, in an exact JPS 1917 edition, with vowel points but no cantillation. The second stacks the sides and asks for a French translation.

<LiveEditor :code="bilingualChoices" title="Layout, order, editions and language" />

<span class="learn-more__label">Learn more:</span> [Choose what text readers see](/across-components/choose-what-text-readers-see.md) · [Clean text and safety](/concepts/clean-text-and-safety.md) {.learn-more}

## Preferred language or exact edition

The two ways of choosing a translation behave differently:

- **Preferred language** (`translation-language`) asks for the best edition in that language. A fresh load makes one request. If Sefaria has no text in that language, what happens next depends on `translation-fallback`:
  - `none` is the default. The primary side shows. The translation side shows a note such as `No french text.`, and screen readers read it too. There is no error and no more requests.
  - `default` makes one more request for Sefaria's default translation. That translation isn't always English, and the component shows no notice that it is a fallback. The total is two requests.
- **Exact edition** (`translation-version-title`, `primary-version-title`) asks for that title only and never falls back.

Both examples ask for French on `Berakhot 2a:1`. The first leaves `translation-fallback` at its default, `none`. The second sets `translation-fallback="default"`.

<LiveEditor :code="bilingualFallback" title="A language Sefaria doesn't have"><strong>The first element</strong> shows the primary text and <code>No french text.</code> (one request). <strong>The second</strong> shows the primary text and Sefaria's default translation (two requests).</LiveEditor>

### When a side has no text

A side with no text shows a short note, such as `No translation text is available.` or `No french text.` The other side still shows. An edition that exists but has empty text doesn't trigger a fallback. To choose editions and vocalization for a single side, see [Show one passage](/use-components/show-text/show-one-passage.md).

## When there's nothing to show

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | `Loading Micah 6:8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the element already showed text, it keeps that text. | `error` | `sefaria-bilingual-segment-error` |
| Sefaria says the text isn't a reference | Sefaria's message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |
| Neither side has text | The notes for the missing sides | `empty` | No |
| Preferred language missing, with `translation-fallback="none"` | The primary side, and `No french text.` on the translation side | `ready`, or `empty` if neither side has text | No |
| Invalid supplied `data` | An error message, with no fallback to a request | `error` | No |

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`. When Sefaria can't be reached, `status` is `error` and the error event fires, whether or not text was already showing. The event bubbles and crosses the component boundary. Its `event.detail` holds `{ error, sref }`. It reports failed loading only. It doesn't report Sefaria's handled messages or invalid supplied `data`.

The example has a good reference, a text that isn't a reference, and an empty element. Choose **Show each status** to log each one's status.

<LiveEditor :code="bilingualStates" title="Read status and listen for errors" />

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the element's `data` property to it. The element then makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Show an attributed passage](/use-components/show-an-attributed-passage.md) to link each edition to its source.
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) to see how these choices compare with sefaria.org.
- [Reference › Components](/reference/components.md) for every attribute.
