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

The Reader, `<sefaria-reader>`, is the recommended choice when you want a finished reading surface instead of assembling one from parts. It's a composition of two components, a Source Card and a Connections Panel, plus navigation. Give it a reference and it shows the text, the connections, a Back button, and a history trail (breadcrumbs).

## What the Reader shows

The Reader puts a Source Card and a Connections Panel side by side, and adds navigation.

- **Text** is a [Source Card](/use-components/show-an-attributed-passage.md) without its header. It shows the surrounding section with the requested verse selected. For Micah 6:8, that is the chapter Micah 6 with verse 8 selected.
- **Connections** is a [Connections Panel](/use-components/show-commentary-and-connected-texts.md).

## Add the Reader and a toolbar button

The example opens `Micah 6:8` and adds a Bookmark button inside the Reader. To try changes, choose Edit, change the code, and choose Run.

Put your own button inside the Reader with `slot="toolbar-actions"`. In its click handler, read `reader.selectedRef`, the reference of the selected item. It is `Micah 6:8` after loading and `Micah 6:7` after a reader selects that verse. In the example, choosing Bookmark shows `Bookmarked Micah 6:8.` The click makes no request.

<LiveEditor :code="reader" title="Reader with a Bookmark button" />

<span class="learn-more__label">Learn more:</span> [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) · [Reference › Components](/reference/components.md) {.learn-more}

## What the Reader adds

Beyond the two parts, the Reader adds:

- **Verse selection.** Selecting a verse loads that verse's connections.
- **Opening connections.** Choosing a connection opens that text as a new history entry.
- **History.** Back and the breadcrumbs return to earlier entries.
- **A toolbar.** Add your own buttons with slot="toolbar-actions".
- **Shared choices.** One data source and one set of text choices carry across navigation.
- **State and events.** Reader-level state and events, such as selectedRef.
- **A narrow layout.** At 40rem wide or less, a Text/Connections switch shows one pane at a time.

## What your page does

Your page owns where the Reader sits, how big it is, and which reference it opens (`sref`). It also owns the text choices and any extra toolbar buttons. And it owns anything you want to happen outside the Reader, such as bookmarks, analytics, or updating other components.

The Reader's interaction events tell your page what happened. They are cancelable. Call `event.preventDefault()` to stop the Reader's own response. `sefaria-reader-error` is a notification and can't be canceled. See [Reference › Components](/reference/components.md#events) for details on each event.

## Attributes

- `sref`: the reference to open.
- `active-pane`: which pane shows on a narrow Reader, `source` (the default) or `connections`.
- `primary-version-title` and `translation-version-title` choose editions for the reference you open and its section. When a reader opens a connection, `translation-language` carries over. Those exact edition titles don't.
- `layout`, `content-language`, `side-order`, `vocalization-mode`, `translation-language`, `translation-fallback`, and `hide-attributions` are text attributes. The Reader passes them to the Source Card inside it. See [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md) for what they do. Here `layout` arranges Hebrew and translation inside the text, not the Reader's panes.
- `translation-fallback`: the Reader's default is `default`. See [Choose what text readers see](/across-components/choose-what-text-readers-see.md) for the shared choices.
- `show-connection-previews`: shows connection preview text. This option is on by default. To turn it off, set `reader.showConnectionPreviews = false`. The attribute can't turn it off.
- `chat-export`: shows a `Send … to chat` button when a selected text is open. The button fires `sefaria-reader-chat-export`. Your page does the sending.

Read-only properties include `status`, `selectedRef`, `canGoBack`, and `currentEntryId`.

## Events

These events bubble and cross the component boundary. The `detail` of an interaction event includes `originEntryId`, the history entry where it happened.

| Event | When it fires | `detail` |
| --- | --- | --- |
| `sefaria-reader-source-select` | A reader selected a verse. Cancel it with `preventDefault()` to keep the Reader from selecting that verse. | `{ originEntryId, position, ref }` |
| `sefaria-reader-connection-select` | A reader opened a connection. Cancel it with `preventDefault()` to keep the Reader from opening that text. | `{ originEntryId, id, targetRef }` |
| `sefaria-reader-back` | A reader asked to go back to the previous entry. Cancel it with `preventDefault()` to stay on the current entry. | `{ originEntryId }` |
| `sefaria-reader-error` | The reference you set could not be opened. Show a message or log it. | `{ error, sref }` only |

For every Reader event, see [Reference › Components](/reference/components.md#sefaria-reader).

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
| Loading, including a new location | A loading message. What's already open stays visible. | `loading` | No |
| The reference you set can't be opened: Sefaria can't be reached, or it isn't a reference | An alert with the error message | `error` | `sefaria-reader-error` |
| Opening a connection fails, or only the connections fail | An error message. The text stays. | `error` when opening a connection fails, `ready` when only connections fail | No |
| Nothing set yet: no `sref` | Nothing | `empty` | No |

A failure in one pane leaves the other pane and any open entry showing. Once the Reader has shown content, removing `sref` doesn't clear it. To react to a failed load of the reference you set, listen for `sefaria-reader-error`. It bubbles and crosses the component boundary. Its `event.detail` holds `{ error, sref }`.

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) · [Reader empty-state detail](/reference/components.md#sefaria-reader) {.learn-more}

## Use your own data

The Reader has no `data` property. If your host already has text or links, give the Reader a custom loader (`kind: "custom"`) with `getText` and `getLinks`. See [Control loading](/data-and-text-tools/give-components-your-own-data.md#control-loading).

## When to compose instead

Use the complete Reader when you want its Source Card, Connections Panel, and built-in navigation and history in one surface. To get your own pane layout, several synchronized text panes, or your own navigation controls, compose individual components instead. See the [Composed multi-pane Reader](/examples/composed-multi-pane-reader.md) example.

## Next steps

- [Make components respond to each other](/across-components/make-components-respond-to-each-other.md) to keep other parts of your page in sync.
- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md) for the connections panel on its own.
- [How the toolkit works](/concepts/how-the-toolkit-works.md) for background.
- [Reference › Components](/reference/components.md) for every attribute and event.
