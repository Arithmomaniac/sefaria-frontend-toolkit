---
title: "Use components › Show one passage"
description: "Show one passage of Sefaria text in the edition or translation you choose, and control vowel points and cantillation."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
import textSegmentStyling from "../../../examples/site-snippets/text-segment-styling.html?raw";
import textSegment from "../../../examples/site-snippets/text-segment.html?raw";
import textSegmentEdition from "../../../examples/site-snippets/text-segment-edition.html?raw";
import textSegmentVocalization from "../../../examples/site-snippets/text-segment-vocalization.html?raw";
import textSegmentFallback from "../../../examples/site-snippets/text-segment-fallback.html?raw";
import textSegmentStates from "../../../examples/site-snippets/text-segment-states.html?raw";
</script>

# Show one passage

The Text Segment, `<sefaria-text-segment>`, shows the text of one passage, such as `Micah 6:8`, in one edition. It shows only the text. To credit the edition, see [Show an attributed passage](/use-components/show-an-attributed-passage.md). For a passage in Hebrew and a translation side by side, see [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md).

## Show the default text

Set `sref` to the reference. By default, the segment shows the edition Sefaria marks as primary (`isPrimary`). That is usually, but not always, the Hebrew or original text. To choose another edition, see [Choose which text to show](#choose-which-text-to-show).

<LiveEditor :code="textSegment" title="The default text">For <code>Micah 6:8</code>, the primary edition is the Hebrew <code>Miqra according to the Masorah</code>.</LiveEditor>

To try changes, choose Edit, change the code, and choose Run.

## Match your site's colors and fonts

Set `--sefaria-*` CSS custom properties, such as `--sefaria-fg` for text color and `--sefaria-font-scale` for size, on an element that contains the segment. Style the segment's own box, such as its padding and border, as you would any element.

<LiveEditor :code="textSegmentStyling" title="Style a passage">A containing <code>div</code> sets a warm background, brown text, serif fonts, and a larger font scale. The element's own box gets padding, a rounded corner, an accent border, and italic text.</LiveEditor>

These styling rules apply to every toolkit component:

- The same `--sefaria-*` properties style every component. Set them once on `:root` to style the whole page.
- Your page's CSS selectors can't reach inside a component.
- Changing styles doesn't load the text again.

<span class="learn-more__label">Learn more:</span> [Match your site's look](/across-components/match-your-sites-look.md) for every property, dark mode, and why selectors can't reach inside. {.learn-more}

## Choose which text to show

| To get | Set | What happens |
| --- | --- | --- |
| The default edition | Nothing | Sefaria's primary edition. |
| A translation in a language | `translation-language` | A translation in that language. If Sefaria has none, the segment shows a short notice (see [When the language isn't available](#when-the-language-isn-t-available)). |
| A language family, strictly | `version-language` | Text in that language family only. There is no fallback, and it doesn't pin one edition. |
| One exact edition | `version-title` | Alone, that title among the primary editions. With `version-language`, that title in that language. With `translation-language`, that title in your preferred translation language. |

::: info Rules for these attributes

- Write languages as full lowercase names, such as `french` or `english`. Codes such as `fr` don't work.
- An exact title never falls back.
- You can't combine `translation-language` and `version-language`. If you do, the element shows the error `translation-language and version-language cannot be combined.`

For every attribute, see [Reference › Components](/reference/components.md#sefaria-text-segment).

:::

<LiveEditor :code="textSegmentEdition" title="A language, then an exact edition">The first segment asks for French by <code>translation-language</code>. The second asks for an exact English edition by <code>version-language</code> and <code>version-title</code>.</LiveEditor>

## When the language isn't available

If Sefaria reports that it has no text in your `translation-language`, the segment shows a short status message, such as `No french text.`. Screen readers announce it. By default (`translation-fallback="none"`), the segment makes one request. Its `status` is `empty`, and there is no error or error event.

To show Sefaria's default translation instead, set `translation-fallback="default"`. The segment makes one more request and shows that translation with no notice. That translation isn't always English.

<LiveEditor :code="textSegmentFallback" title="No fallback, then the default translation">Both ask for French on <code>Berakhot 2a:1</code>. The first uses the default <code>none</code> and shows the notice. The second sets <code>translation-fallback="default"</code> and shows Sefaria's default translation.</LiveEditor>

With `translation-fallback="default"` and a missing language, the segment makes two requests. An exact edition, or a language that exists but has empty text, doesn't fall back.

## Control vowel points and cantillation

`vocalization-mode` changes Hebrew text:

- `taamim_and_nikkud` (the default) keeps vowel points and cantillation.
- `nikkud` keeps most vowel points and removes cantillation.
- `none` removes vowel points and cantillation, along with a few other marks such as the sof pasuq (׃). For the exact list, see [Change vowels and cantillation](/data-and-text-tools/clean-up-stored-sefaria-text.md#change-vowels-and-cantillation).

<LiveEditor :code="textSegmentVocalization" title="Nikkud, then none">The same Hebrew with vowel points and no cantillation (<code>nikkud</code>), then with neither (<code>none</code>).</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) · [Clean text and safety](/concepts/clean-text-and-safety.md) {.learn-more}

## When there's nothing to show

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | A loading message | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. A failed load keeps the text already showing. | `error` | `sefaria-text-segment-error` |
| Sefaria says the text isn't a reference, or the supplied `data` is invalid | An error message | `error` | No |
| No text in your `translation-language`, or no `sref` and no `data` | A status message, or nothing | `empty` | No |

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`. The error event fires only when Sefaria can't be reached. It bubbles and crosses the component boundary. Its `event.detail` holds `{ error, sref }`. Invalid `data` doesn't fall back to `sref`.

For every empty state, see [Reference › Components](/reference/components.md#sefaria-text-segment). For every event, see [Reference › Components](/reference/components.md#events).

<LiveEditor :code="textSegmentStates" title="Read status and listen for errors">A good reference, a text that isn't a reference, and an empty element. Choose <strong>Show each status</strong> to log each one's status.</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the `data` property to it. The segment then makes no requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Choose what text readers see](/across-components/choose-what-text-readers-see.md) to apply these choices across components.
- [Reference › Components](/reference/components.md) for every attribute.
- [Text tools reference](/reference/text-transform.md) for the vocalization functions.
