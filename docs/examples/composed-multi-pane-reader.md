---
title: "Examples › Composed multi-pane Reader"
description: "An advanced example that puts several passages and their connections side by side by building on the Reader session instead of the complete Reader."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import { withBase } from "vitepress";
</script>

# Composed multi-pane Reader

You are building a reading app. The complete `<sefaria-reader>` shows one reading surface. Your readers need more. They want to keep an earlier passage in view, open a connected passage next to it, and see that passage's connections as well.

It is an advanced example, not the recommended first path. Start with [Add the complete Reader](/use-components/add-the-complete-reader.md) unless you need this layout.

On wide screens the panes sit side by side and scroll on their own. Selecting a connection opens a new source pane and a connections pane. A close button removes a pane and the panes opened from it. You can't close the first pane. On narrow screens, path buttons choose the visible pane. Returning to an earlier passage removes the panes opened after that passage.

It is a complete app (Vite and TypeScript) in `examples/reader`. You can't edit it on this page. [Read the source on GitHub](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader).

<iframe :src="withBase('/examples/reader/')" title="Composed multi-pane Reader example" sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" style="width: 100%; height: 640px; border: 1px solid var(--vp-c-divider); border-radius: 8px;"></iframe>

<a :href="withBase('/examples/reader/')" target="_blank" rel="noopener">Open in a new tab</a>

The demo makes no Sefaria request until you choose "Start live demo". The reference field starts as Micah 6:8. A `?tref=` query in the address can fill it in for you.

## How it works

The example uses a Reader session. You create one with `createReaderSession` from `@arithmomaniac/sefaria-web-components/reader-session`. A session is plain data and functions, with no elements. It keeps the reading history, the selected passage, the source and connections records it has captured, how connections are grouped and paged, and pins that stop entries from being discarded.

A session doesn't make requests and has no events. You fetch the data yourself and hand it to the session. Each change returns a new session value that you keep. The [complete Reader](/use-components/add-the-complete-reader.md) wraps a session in a controller that also handles loading.

The host page, `app.ts`, owns everything else. That covers the layout and CSS, which panes exist and which is active, close buttons, the form, status and errors, cancelling requests, and wiring events. It pins the entries of visible panes and releases them when panes close.

### Start a session

The host resolves the reference with a client-backed data source and creates a session from the result.

<<< ../../examples/reader/src/app.ts#seed-session{ts}

### Feed a Source Card

A Source Card gets its `data` from the session's captured record, so it makes no request of its own. Its `sefaria-source-select` event goes back to the host. [Show an attributed passage](/use-components/show-an-attributed-passage.md) covers the Source Card on its own.

<<< ../../examples/reader/src/app.ts#feed-source-card{ts}

### Wire the connections

The Connections Panel (see [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md)) sends its category, page and connection-select events to the host and the session.

<<< ../../examples/reader/src/app.ts#wire-connections{ts}

The example listens directly to `sefaria-connections-category-change`, `sefaria-connections-page-change` and `sefaria-connection-select`.

## Requests stay low

Children receive `data` from captured records, so they don't fetch (see [How the toolkit works](/concepts/how-the-toolkit-works.md)). The example's tests check the counts. With caching disabled and no additional context load, they expect four requests for a root and child, and six after another child. Context qualification can require an additional source request; the contextual-child test expects five total. These are host acquisition requests, not duplicate child requests. Changing the category or page reprojects captured data with no request. Selecting a source again prunes descendant panes and starts one host-owned connections load. The cache-disabled reselection test verifies exactly one links request.

## Run it locally

You need Node.js 22.12 or later and the pnpm version pinned in `package.json`. From the repository root, run `pnpm install`, then `pnpm build`, then `pnpm dev:reader`.

## When to use something else

If one integrated reading surface with built-in history is enough, use the complete Reader. For that, see [Add the complete Reader](/use-components/add-the-complete-reader.md); the repository also has a standalone Reader demo. Component details are in the [Components reference](/reference/components.md).
