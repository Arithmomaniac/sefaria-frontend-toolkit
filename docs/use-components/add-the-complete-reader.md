---
title: "Use components › Add the complete Reader"
description: "Add the complete Reader, a finished reading surface with text, connections, history and a Back button, and add your own toolbar button."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import reader from "../../examples/site-snippets/reader.html?raw";
</script>

# Add the complete Reader

The Reader, `<sefaria-reader>`, is the recommended choice when you want a finished reading surface instead of assembling one from parts. Give it a reference and it shows the text, the connections, a Back button, and a history trail (breadcrumbs).

## What the Reader shows

The Reader has two panes:

- **Text** shows the passage in its chapter. For a reference that Sefaria loads, the Text pane opens the surrounding section and selects the matching item. For `Micah 6:8`, that is the chapter `Micah 6` with verse 8 selected.
- **Connections** is the same connections panel described in [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md).

## Add the Reader and a toolbar button

The example opens `Micah 6:8` and adds a Bookmark button inside the Reader. To try changes, choose Edit, change the code, and choose Run.

Put your own button inside the Reader with `slot="toolbar-actions"`. In its click handler, read `reader.selectedRef`, the reference of the selected item. It is `Micah 6:8` after loading and `Micah 6:7` after a reader selects that verse. In the example, choosing Bookmark shows `Bookmarked Micah 6:8.` The click makes no request.

<LiveEditor :code="reader" title="Reader with a Bookmark button" />

<span class="learn-more__label">Learn more:</span> [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) · [Reference › Components](/reference/components.md) {.learn-more}

## What the Reader does by itself

- Selecting a verse loads that verse's connections.
- Choosing a connection opens that text as a new history entry.
- Back returns to the previous entry.
- On a narrow Reader (40rem wide or less), a Text/Connections switch shows one pane at a time. A wider Reader shows both panes side by side.

## What your page does

Your page owns where the Reader sits, how big it is, and which reference it opens (`sref`). It also owns the text choices and any extra toolbar buttons. And it owns anything you want to happen outside the Reader, such as bookmarks, analytics, or updating other components.

The Reader's interaction events tell your page what happened. They are cancelable. Call `event.preventDefault()` to stop the Reader's own response. `sefaria-reader-error` is a notification and can't be canceled. See [Reference › Components](/reference/components.md#events) for details on each event.

## Attributes

- `sref`: the reference to open.
- `active-pane`: which pane shows on a narrow Reader, `source` (the default) or `connections`.
- `primary-version-title` and `translation-version-title` choose editions for the reference you open and its section. When a reader opens a connection, `translation-language` carries over. Those exact edition titles don't.
- `layout`, `content-language`, `side-order`, `vocalization-mode`, and `translation-language` mean the same as in [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md). Here `layout` arranges Hebrew and translation inside the text, not the Reader's panes.
- `translation-fallback`: `default` or `none`. The Reader's default is `default`. Bilingual Segment defaults to `none`. See [Choose what text readers see](/across-components/choose-what-text-readers-see.md) for the shared choices.
- `hide-attributions`: hides the edition attribution on each displayed side. Bilingual Segment has no such attribute.
- `show-connection-previews`: shows connection preview text. This option is on by default. To turn it off, set `reader.showConnectionPreviews = false`. The attribute can't turn it off.
- `chat-export`: shows a `Send … to chat` button when a selected text is open. The button fires `sefaria-reader-chat-export`. Your page does the sending.

Read-only properties include `status`, `selectedRef`, `canGoBack`, and `currentEntryId`.

## Events

These events bubble and cross the component boundary. The `detail` of an interaction event includes `originEntryId`, the history entry where it happened.

| Event | Details (interaction events also include `originEntryId`) |
| --- | --- |
| `sefaria-reader-back` | None |
| `sefaria-reader-history-activate` | `{ entryId, label }` |
| `sefaria-reader-pane-change` | `{ pane }` |
| `sefaria-reader-chat-export` | `{ targetRef }` |
| `sefaria-reader-source-select` | `{ position, ref }` |
| `sefaria-reader-connections-category-change` | `{ category }` |
| `sefaria-reader-connections-page-change` | `{ page }` |
| `sefaria-reader-connection-select` | `{ id, targetRef }` |
| `sefaria-reader-connections-preview-request` | None |
| `sefaria-reader-error` | `{ error, sref }` only |

## How many requests it makes

Unlike the smaller components, the Reader makes several requests.

- A fresh load of `Micah 6:8` makes three: the verse's text, its chapter's text, and its connections.
- If your preferred translation language isn't available and `translation-fallback` is `default`, a load can make up to four text requests plus one connections request. With `none`, there is no fallback text request, so a load stays at three.
- Selecting another verse makes one connections request.
- Opening a connection makes up to three requests: its text, its section, and its connections. With a missing translation language and `translation-fallback="default"`, it can make up to five. With `none`, it stays at three.
- Back makes none. Changing a connections category or page makes none.

## When there's nothing to show

Read `status` from the element in JavaScript. It is `empty`, `loading`, `ready`, or `error`.

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Loading the text for the first time | `Opening Reader...` | `loading` | No |
| Loading the text for a new location | `Opening a new Reader location...`, with the current entry still visible | `loading` | No |
| Text shown, connections still loading | The text, with the Connections pane loading | `ready` | No |
| Sefaria can't be reached when opening the reference you set | An alert with the error message. An entry that's already open stays. | `error` | `sefaria-reader-error` |
| Sefaria says the reference you set isn't a reference | An alert with Sefaria's message. An entry that's already open stays. | `error` | `sefaria-reader-error` |
| Opening a connection fails | An error message. The current entry stays. | `error` | No |
| Only the connections request fails | An alert in the Connections pane. The text stays. | `ready` | No |
| Nothing set yet: no `sref` | Nothing | `empty` | No |

Once the Reader has shown content, removing `sref` doesn't clear it. To react to a failed load of the reference you set, listen for `sefaria-reader-error`. It bubbles and crosses the component boundary. Its `event.detail` holds `{ error, sref }`.

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

The Reader has no `data` property. If your host already has text or links, give the Reader an acquisition capability with `getText` and `getLinks`. See [Control loading](/data-and-text-tools/give-components-your-own-data.md#control-loading).

## When to compose instead

Use the complete Reader when you want built-in navigation and history in one surface. To get your own pane layout, several synchronized text panes, or your own navigation controls, compose individual components instead. See the [Composed multi-pane Reader](/examples/composed-multi-pane-reader.md) example.

## Next steps

- [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) to keep other parts of your page in sync.
- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) for the connections panel on its own.
- [How the toolkit works](/concepts/how-the-toolkit-works.md) for background.
- [Reference › Components](/reference/components.md) for every attribute and event.
