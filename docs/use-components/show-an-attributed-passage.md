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

Set `sref` to a reference such as `Micah 6:6-8`. The card shows:

- A heading with the reference in English and Hebrew. The heading isn't a link.
- The passage's primary edition and a translation for each verse. A range such as `Micah 6:6-8` shows each verse as its own item.
- Attribution for the editions shown.

The card takes the same text settings as Bilingual Segment: `translation-language`, `primary-version-title`, `translation-version-title`, `content-language`, `layout`, `side-order`, `vocalization-mode` and `hide-attributions`. It also takes `translation-fallback`, which is `default` or `none`. For Source Card the default is `default`. All of these attributes mean the same thing here. See [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md).

## Read the attribution

Attribution appears once for the whole card, not once per verse. It has one line for each edition shown, labeled `Primary text:` or `Translation:`, followed by the edition's title and its language name. For example, `Translation: THE JPS TANAKH: Gender-Sensitive Edition (english)`.

The card links the edition title to the edition's source only when Sefaria gives a valid http(s) address. The link opens in a new tab. Otherwise the title is plain text. The attribution doesn't show the license. For reuse rights, see [Choose what text readers see](/across-components/choose-what-text-readers-see.md).

If Sefaria reports that your preferred translation language is missing for the passage, the card requests Sefaria's default translation once (the second request). That translation isn't always English. The card shows a note such as `french is unavailable; showing english.` An exact edition doesn't fall back. To turn the fallback off, set `translation-fallback="none"`. The card then makes one request. The translation side shows `No french text.`, the primary side still shows, and `status` is `ready` with no error. `hide-attributions` hides both the attribution lines and the fallback note.

## Let readers select a verse

Add the `selectable` attribute. Each selectable verse gets a number button beside each text side that the card shows, normally Hebrew and English. A hidden or missing side has no button. Each button's accessible name is `Show connections for Micah 6:7`, with the verse's own reference. Clicking the verse row works too. Keyboard users press Tab to reach the buttons, then Enter or Space.

A selection fires `sefaria-source-select`. It bubbles and crosses the component boundary, so you can listen on the card or on a parent. Its `event.detail` is `{ position, ref }`, for example `{ position: [1], ref: "Micah 6:7" }`. `position` is a list of numbers that locates the verse in the passage, counting from 0. For a range such as Micah 6:6-8 it is one number, so `[1]` is the second verse.

Your page controls the selection. The card doesn't highlight a verse by itself. To highlight it, set the card's `selectedPosition` property to `event.detail.position`. The verse's button then gets `aria-pressed="true"` and the verse gets an outline. Setting `selectedPosition` doesn't fire the event again. The event also works with supplied data and makes no request.

The card adds selection buttons only when it can work out each verse's own reference. Some passages, such as ones that span chapters, still show but without selection buttons.

To try changes, choose **Edit**, change the code, and choose **Run**.

<LiveEditor :code="sourceCardSelect" title="Select a verse">Selecting a verse in <code>Micah 6:6-8</code> shows the last choice.</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) · [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) {.learn-more}

## How many requests it makes

A fresh load makes one request for the whole card. It makes two requests only when the translation fallback happens. With `translation-fallback="none"`, it is always one request. The verses inside the card don't make their own requests, however many there are. With supplied data, the card makes none.

## When there's nothing to show

The card's `status` property is `empty`, `loading`, `ready`, or `error`. Here is what each situation looks like:

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | `Loading Micah 6:8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the card already showed text, it keeps that text. | `error` | `sefaria-source-card-error` |
| Sefaria says the text isn't a reference | Sefaria's message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

Read `status` from the element in JavaScript. To react to a failed load, listen for `sefaria-source-card-error`. It bubbles and crosses the component boundary. Its `event.detail` holds `{ error, sref }`. Invalid supplied `data` also shows an error and sets `status` to `error`. The card doesn't fall back to `sref` and doesn't send the event.

<LiveEditor :code="sourceCardStates" title="Read status and listen for errors">The example has a valid reference, a text that isn't a reference, and an empty card. Choose <strong>Show each status</strong> to log each one's status.</LiveEditor>

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

If you already have Sefaria's text response, set the card's `data` property to it. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Use with a framework](/use-components/use-with-a-framework.md) to wire the card into your app.
- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) to show what a selected verse connects to.
- [How the toolkit works](/concepts/how-the-toolkit-works.md) and [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) for background.
- [Reference › Components](/reference/components.md) for every attribute and event.
