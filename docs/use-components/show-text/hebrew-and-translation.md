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

The Bilingual Segment, `<sefaria-bilingual-segment>`, shows one passage in two editions at once: the primary text and a translation. You choose the layout, which side comes first, the translation language, and even the exact edition for each side.

## Show a passage in two editions

Set `sref` to the reference. The component asks Sefaria once for two editions:

- The **primary** edition, which is the edition Sefaria marks `isPrimary`. It's usually, but not always, the Hebrew or original text. For `Micah 6:8` it's "Miqra according to the Masorah".
- Sefaria's **default translation**. For `Micah 6:8` it's "THE JPS TANAKH: Gender-Sensitive Edition".

Under the text, one line per shown side names its edition and language, such as `Miqra according to the Masorah (hebrew, he)`. The line isn't a link, and the component doesn't show a license.

<LiveEditor :code="bilingual" title="Hebrew and translation" />

## Choose sides, layout, and editions

Set these attributes on the element. Add them one at a time and choose Run to see each change.

| Attribute | Values (default first) | What it changes | Changes what's requested? |
| --- | --- | --- | --- |
| `content-language` | `both`, `primary`, `translation` | Which sides show. | No |
| `layout` | `auto`, `stacked`, `side-by-side` | Two columns need both sides (`content-language="both"`). `auto` uses two columns at 500px of component width or more, and one below. `stacked` is always one column. `side-by-side` is two columns. | No |
| `side-order` | `primary-first`, `translation-first` | Visual order in two-column layouts only. Stacked layouts and screen-reader order keep the primary side first. | No |
| `translation-language` | A full lowercase language-family name, such as `french` | The language you'd like for the translation. Sefaria falls back if it has none. | Yes |
| `primary-version-title` | An exact edition title | The exact primary edition. It never falls back. | Yes |
| `translation-version-title` | An exact edition title | The exact translation edition. It never falls back. | Yes |
| `vocalization-mode` | `taamim_and_nikkud`, `nikkud`, `none` | Hebrew marks on each side. `nikkud` removes cantillation; `none` also removes vowel points. Both remove a few other marks too; see [Change vowels and cantillation](/data-and-text-tools/clean-up-stored-sefaria-text.md#change-vowels-and-cantillation). | No |
| `hide-attributions` | Absent (default), present | Hides the edition lines and the fallback note. The text stays. | No |

For the styling settings that every component shares, see [Label a citation](/use-components/show-text/label-a-citation.md).

The first element below reads side by side with the translation first, in an exact JPS 1917 edition, with vowel points but no cantillation. The second stacks the sides and asks for a French translation.

<LiveEditor :code="bilingualChoices" title="Layout, order, editions and language" />

<span class="learn-more__label">Learn more:</span> [Choose what text readers see](/across-components/choose-what-text-readers-see.md) · [Clean text and safety](/concepts/clean-text-and-safety.md) {.learn-more}

## Preferred language or exact edition

The two ways of choosing a translation behave differently:

- **Preferred language** (`translation-language`) asks for the best edition in that language. If Sefaria reports that it has no text in that language, the component asks once more, for Sefaria's default translation, which isn't always English. It says so with a note such as `french is unavailable; showing english.` A fresh load makes one request, or two with a fallback.
- **Exact edition** (`translation-version-title`, `primary-version-title`) asks for that title only and never falls back.

The example asks for French on `Berakhot 2a:1`.

<LiveEditor :code="bilingualFallback" title="A language Sefaria doesn't have" />

### When a side has no text

A short note takes the place of a side with no text, such as `No translation text is available.` The other side still shows. An edition that exists but has empty text doesn't trigger a fallback. To choose editions and vocalization for a single side, see [Show one passage](/use-components/show-text/show-one-passage.md).

## When there's nothing to show

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | `Loading Micah 6:8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the element already showed text, it keeps that text. | `error` | `sefaria-bilingual-segment-error` |
| Sefaria says the text isn't a reference | Sefaria's message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |
| Neither side has text | The notes for the missing sides | `empty` | No |
| Invalid supplied `data` | An error message, with no fallback to a request | `error` | No |

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`. When Sefaria can't be reached, `status` is `error` and the error event fires, whether or not text was already showing. The error event bubbles and crosses the component boundary, and `event.detail` holds `{ error, sref }`. It reports failed loading, not handled messages from Sefaria or invalid supplied data.

The example has a good reference, a text that isn't a reference, and an empty element. Choose **Show each status** to log each one's status.

<LiveEditor :code="bilingualStates" title="Read status and listen for errors" />

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the element's `data` property to it. The element then makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Show an attributed passage](/use-components/show-an-attributed-passage.md) to link each edition to its source.
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) to see how these choices compare with sefaria.org.
- [Reference › Components](/reference/components.md) for every attribute.
