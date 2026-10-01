---
title: "Use components › Show an attributed passage and let readers select it"
description: "Show a passage in a Source Card with its heading, both languages and attribution, and react when a reader selects a verse."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import sourceCardSelect from "../../examples/site-snippets/source-card-select.html?raw";
import sourceCardStates from "../../examples/site-snippets/source-card-states.html?raw";
</script>

# Show an attributed passage and let readers select it

The Source Card, `<sefaria-source-card>`, shows a whole passage in one block: a heading, the text of each verse, and where the text came from. It is also the first component here that tells your page what a reader did. It does this through the `sefaria-source-select` event.

## What the card shows

Set `sref` to a reference such as `Micah 6:6-8` or `Micah 6:8`. The card shows:

- A heading with the reference in English and Hebrew. The heading isn't a link.
- The passage's primary edition and a translation for each verse. A range such as `Micah 6:6-8` shows each verse as its own item.
- Attribution for the editions shown.

The card takes the same text settings as Bilingual Segment, such as `layout`. See [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md). Three attributes matter most here:

- `translation-language` picks the translation language.
- `translation-fallback` is `default` or `none`. It is `default` on Source Card. The card then asks for Sefaria's default translation when yours is missing.
- `hide-attributions` hides the attribution and the fallback note.

For every attribute, see [Reference › Components](/reference/components.md#sefaria-source-card).

## Read the attribution

Attribution appears once for the whole card, not once per verse. It has one line for each edition shown, labeled `Primary text:` or `Translation:`, followed by the edition's title and its language name. For example, `Translation: THE JPS TANAKH: Gender-Sensitive Edition (english)`.

The card links the edition title to the edition's source only when Sefaria gives a valid http(s) address. The link opens in a new tab. Otherwise the title is plain text. The attribution doesn't show the license. For reuse rights, see [Choose what text readers see](/across-components/choose-what-text-readers-see.md).

By default, if Sefaria reports that your preferred translation language is missing, the card makes one more request. It asks for Sefaria's default translation, which isn't always English. The card adds a note naming the missing language and the one shown. An exact edition never falls back.

With `translation-fallback="none"`, the card makes one request. The translation side says the language is missing. The primary side still shows. `status` is `ready` with no error.

`hide-attributions` hides the attribution lines and the fallback note.

## Let readers select a verse

Add the `selectable` attribute. Each selectable verse gets a number button beside each text side that the card shows, normally Hebrew and English. A hidden or missing side has no button. Each button's accessible name is `Show connections for Micah 6:7`, with the verse's own reference. Clicking the verse row works too. Keyboard users press Tab to reach the buttons, then Enter or Space.

A selection fires `sefaria-source-select`. It bubbles and crosses the component boundary, so you can listen on the card or on a parent. Its `event.detail` is `{ position, ref }`, for example `{ position: [1], ref: "Micah 6:7" }`. `position` is a list of numbers that locates the verse in the passage, counting from 0. For a range such as Micah 6:6-8 it is one number, so `[1]` is the second verse.

With `selectable`, each verse in the card is a button readers can choose. Choosing one fires `sefaria-source-select` with the verse's position and reference. The event also works with supplied data and makes no request.

The card doesn't mark the choice itself. To show it, set `selectedPosition` to `event.detail.position`. The verse then appears selected, with an outline and `aria-pressed`. Setting it doesn't fire the event again.

The example shows a **Cite** button for the selected verse. Choose a verse, then choose the button to see its citation. The card adds selection buttons only when it can work out each verse's own reference. Some passages, such as ones that span chapters, still show but without selection buttons.

The example caps the card's height with `max-height` and `overflow: auto`, so a tall passage scrolls inside its box. Selection still works while you scroll.

To try changes, choose **Edit**, change the code, and choose **Run**.

<LiveEditor :code="sourceCardSelect" title="Select a verse">Selecting a verse in <code>Micah 6:6-8</code> shows it and offers a button to cite it.</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) · [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) {.learn-more}

## How many requests it makes

A fresh load makes one request for the whole card. It makes two requests only when the translation fallback happens. With `translation-fallback="none"`, it is always one request. The verses inside the card don't make their own requests, however many there are. With supplied data, the card makes none.

## When there's nothing to show

The card's `status` property is `empty`, `loading`, `ready`, or `error`. Here is what each situation looks like:

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | A loading message | `loading` | No |
| Sefaria can't be reached | An error message | `error` | `sefaria-source-card-error` |
| Sefaria says the text isn't a reference | Sefaria's own message | `error` | No |
| The translation is missing and the fallback is off | The text, with a "no text" note on the translation side | `ready` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

Read `status` from the element in JavaScript.

To react to a failed load, listen for `sefaria-source-card-error`. Its `event.detail` holds `{ error, sref }`. A failed load keeps the text already showing.

Invalid supplied `data` shows an error without falling back to `sref`. It doesn't send the event.

For every situation and event, see [Reference › Components](/reference/components.md#sefaria-source-card).

<LiveEditor :code="sourceCardStates" title="Read status and listen for errors">The example has a valid reference, a text that isn't a reference, and an empty card. Choose <strong>Show each status</strong> to log each one's status.</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the card's `data` property to it. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Use with a framework](/use-components/use-with-a-framework.md) to wire the card into your app.
- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) to show what a selected verse connects to.
- [How the toolkit works](/concepts/how-the-toolkit-works.md) and [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) for background.
- [Reference › Components](/reference/components.md) for every attribute and event.
