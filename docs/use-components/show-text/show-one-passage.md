---
title: "Use components › Show one passage"
description: "Show one passage of Sefaria text in the edition or translation you choose, and control vowel points and cantillation."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
import textSegment from "../../../examples/site-snippets/text-segment.html?raw";
import textSegmentEdition from "../../../examples/site-snippets/text-segment-edition.html?raw";
import textSegmentVocalization from "../../../examples/site-snippets/text-segment-vocalization.html?raw";
import textSegmentFallback from "../../../examples/site-snippets/text-segment-fallback.html?raw";
import textSegmentStates from "../../../examples/site-snippets/text-segment-states.html?raw";
</script>

# Show one passage

The Text Segment, `<sefaria-text-segment>`, shows the text of one passage, such as `Micah 6:8`, in one edition. It also shows where that edition comes from. For a passage in Hebrew and a translation side by side, see [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md).

## Show the default text

Set `sref` to the reference. With no other choice, the segment shows the edition Sefaria marks primary. "Primary" means the edition marked `isPrimary`, which is usually, but not always, the Hebrew or original text. For `Micah 6:8` it is the Hebrew `Miqra according to the Masorah`.

<LiveEditor :code="textSegment" title="The default text" />

To try changes, choose Edit, change the code, and choose Run. Styling works as it does for every component; see [Label a citation](/use-components/show-text/label-a-citation.md).

## Choose which text to show

| To get | Set | What happens |
| --- | --- | --- |
| The default edition | Nothing | Sefaria's primary edition. |
| A translation in a language | `translation-language` | Your preferred translation language. If Sefaria has none, the segment falls back (see below). |
| A language family, strictly | `version-language` | Text in that language family only. There is no fallback, and it doesn't pin one edition. |
| One exact edition | `version-title` | Alone, that title among the primary editions. With `version-language`, that title in that language. With `translation-language`, that title in your preferred translation language. |

An exact title never falls back. Language values are full lowercase language-family names such as `french` or `english`, not codes such as `fr`. `translation-language` and `version-language` can't be combined; the element shows the error `translation-language and version-language cannot be combined.`

The example asks for French by translation language, then for an exact English edition by `version-language` and `version-title`.

<LiveEditor :code="textSegmentEdition" title="A language, then an exact edition" />

## When the language isn't available

If Sefaria reports that it has no text in your preferred `translation-language`, the segment asks once more, for Sefaria's default translation. That translation isn't always English. The segment then adds a note such as `french is unavailable; showing english.` The example asks for French on `Berakhot 2a:1`.

<LiveEditor :code="textSegmentFallback" title="Fall back to the default translation" />

A fresh load makes one request, or two with a fallback. An exact edition, or a language that exists but has empty text, doesn't fall back. `hide-attributions` hides both the edition line and the fallback note.

## Control vowel points and cantillation

`vocalization-mode` changes Hebrew text:

- `taamim_and_nikkud` (the default) keeps vowel points and cantillation.
- `nikkud` keeps vowel points and removes cantillation.
- `none` removes vowel points and cantillation. It also removes the sof pasuq (׃) at the end of a verse. Letters and other marks, such as `{ס}`, stay.

The example shows the default Hebrew with vowel points, then with none.

<LiveEditor :code="textSegmentVocalization" title="Nikkud, then none" />

<span class="learn-more__label">Learn more:</span> [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) · [Clean text and safety](/concepts/clean-text-and-safety.md) {.learn-more}

## See the source

Below the text, the segment names the edition and its language, such as `Miqra according to the Masorah (hebrew, he)`. It has no link and no license. Add `hide-attributions` to hide it. For a fuller credit line, see [Show an attributed passage](/use-components/show-an-attributed-passage.md).

## When there's nothing to show

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | `Loading Micah 6:8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the element already showed text, it keeps that text. | `error` | `sefaria-text-segment-error` |
| Sefaria says the text isn't a reference | Sefaria's own message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`. Unlike the label, a text that isn't a reference gives `error`, not `empty`. When Sefaria can't be reached, `status` is `error` and the error event fires, whether or not text was already showing. The error event bubbles and crosses the component boundary, and `event.detail` holds `{ error, sref }`. Invalid supplied `data` shows an error without falling back to `sref` and sends no event.

The example has a good reference, a text that isn't a reference, and an empty element. Choose **Show each status** to log each one's status.

<LiveEditor :code="textSegmentStates" title="Read status and listen for errors" />

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the `data` property to it. The segment then makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Choose what text readers see](/across-components/choose-what-text-readers-see.md) to apply these choices across components.
- [Reference › Components](/reference/components.md) for every attribute.
- [Text tools reference](/reference/text-transform.md) for the vocalization functions.
