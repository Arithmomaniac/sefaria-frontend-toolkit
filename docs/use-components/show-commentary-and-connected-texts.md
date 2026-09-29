---
title: "Use components › Show commentary and connected texts"
description: "Show a text's commentaries and other connected texts in a Connections Panel, group them by category, and react when a reader chooses one."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import connectionsPanel from "../../examples/site-snippets/connections-panel.html?raw";
import connectionsPanelEvents from "../../examples/site-snippets/connections-panel-events.html?raw";
import connectionsPanelStates from "../../examples/site-snippets/connections-panel-states.html?raw";
</script>

# Show commentary and connected texts

The Connections Panel, `<sefaria-connections-panel>`, shows the texts that Sefaria connects to a reference: commentaries, midrash, halakhah, and more. Readers pick a category, page through its connections, and choose one. Your page decides what happens next.

## What the panel shows

Set `sref` to a reference such as `Micah 6:8`. The panel shows:

- A heading, `Connections for Micah 6:8`.
- An Overview button, plus one button per category with that category's count, such as `Commentary (16)` and `Midrash (19)`. `Commentary` comes first, then the rest in alphabetical order.
- Overview text such as `194 text connections. Select a category.` Sheets aren't included.

To try changes, choose Edit, change the code, and choose Run.

<LiveEditor :code="connectionsPanel" title="Show connections" />

## Browse categories and pages

Choosing a category lists its connections, 20 per page, with a status such as `Page 1: 19 of 19 Midrash connections`. Paging buttons are First page, Previous, and More. Each entry shows:

- The book, and the reference in English and Hebrew.
- A preview of the connected text, when it was fetched and previews are shown.
- When previews are shown and preview text is available, an entry also shows the edition and license information Sefaria reports.
- A button whose accessible name is like `Open Bamidbar Rabbah 1:3 in context`.

That button does not navigate. It fires an event, and your page decides what to do. For example, you can show that text in a Source Card. See [Make components respond to each other](/across-components/make-components-respond-to-each-other.md).

The panel changes its own category and page when a reader clicks. You can also set them yourself:

| Attribute | What it does |
| --- | --- |
| `sref` | The reference whose connections to show. |
| `category` | The exact category name from Sefaria's response, such as `Midrash`. Leave it out for Overview. |
| `page` | The page number, counting from 0. The default is 0. |
| `show-previews` | Shows preview text. On by default. |
| `with-text` | Asks Sefaria to include the connected texts' words for previews. On by default. |
| `vocalization-mode` | `taamim_and_nikkud` (default), `nikkud`, or `none`. See [Show one passage](/use-components/show-text/show-one-passage.md). |

`with-text` and `show-previews` default to on, so the attribute can't turn them off. Set the JavaScript property instead: `panel.withText = false` or `panel.showPreviews = false`. If `withText` is false and previews are shown, the panel shows `Preview text was not requested.` and a `Load previews` button.

## React to what readers do

The panel fires five events. They bubble and cross the component boundary, so you can listen on the panel or on a parent.

| Event | `event.detail` | When |
| --- | --- | --- |
| `sefaria-connections-category-change` | `{ category }` | A category is chosen. `category` is `null` for Overview. |
| `sefaria-connections-page-change` | `{ page }` | The page changes. |
| `sefaria-connections-preview-request` | `{}` | A reader chooses `Load previews`. |
| `sefaria-connection-select` | `{ id, targetRef }` | A reader opens a connection. |
| `sefaria-connections-panel-error` | `{ error, sref }` | Loading connections failed. |

You can cancel the category and page events. Calling `event.preventDefault()` on one stops the panel from changing itself, so your page can take over.

The example logs each event. Choose a category and open a connection. To try paging, choose a category with more than 20 connections, such as `Quoting Commentary (47)`, then choose More. Choose Overview to return to the summary.

<LiveEditor :code="connectionsPanelEvents" title="Log the panel's events" />

<span class="learn-more__label">Learn more:</span> [Component events](/reference/components.md#events) · [Add the complete Reader](/use-components/add-the-complete-reader.md) {.learn-more}

## How many requests it makes

A fresh load makes one request, to Sefaria's links endpoint. Changing `category`, `page`, or `show-previews` makes no request, because the panel reuses the data it already loaded. Changing `with-text` or `sref` loads again. If you loaded without text, choosing `Load previews` makes one more request. With supplied data, the panel makes none.

## When there's nothing to show

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`. Here is what each situation looks like:

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | `Loading connections for Micah 6:8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the panel already showed connections, it keeps them. | `error` | `sefaria-connections-panel-error` |
| Sefaria says the text isn't a reference | Sefaria's message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

If Sefaria returns no connections, the panel shows `No text connections were returned.` Invalid supplied `data` also shows an error and sets `status` to `error`. The panel doesn't fall back to `sref` and doesn't send the event.

The example has a good reference, a text that isn't a reference, and an empty panel. Choose **Show each status** to log each one's status.

<LiveEditor :code="connectionsPanelStates" title="Read status and listen for errors" />

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [How the toolkit works](/concepts/how-the-toolkit-works.md) {.learn-more}

## Use your own data

If you already have Sefaria's links response, set the panel's `data` property to it. The panel then makes no request. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Add the complete Reader](/use-components/add-the-complete-reader.md) for a finished reading workflow that includes this panel.
- [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) to show a chosen connection in another component.
- [Reference › Components](/reference/components.md) for every attribute and event.
