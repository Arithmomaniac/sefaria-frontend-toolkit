---
title: "Examples › Linked article"
description: "A complete app that previews a cited Sefaria source in a dialog when a reader clicks a link in your article, without leaving the page."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import { withBase } from "vitepress";
</script>

# Linked article

You write articles with hand-written links to Sefaria sources. Readers often want to glance at the passage without leaving your page. A plain link sends them away, and they may not come back.

This example solves that. A click on a citation opens a small dialog with the passage. The example fetches text only when a preview opens. It leaves your article text untouched.

This is a complete app (Vite and TypeScript) in `examples/linked-article`. It is shown running below. You can't edit it on this page. To read its source, see [the example on GitHub](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article).

<iframe :src="withBase('/examples/linked-article/')" title="Linked article example" sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" style="width: 100%; height: 560px; border: 1px solid var(--vp-c-divider); border-radius: 8px;"></iframe>

<a :href="withBase('/examples/linked-article/')" target="_blank" rel="noopener">Open in a new tab</a>

## How it works

### The link you write

An authored link is an ordinary link to sefaria.org. It also carries the reference in a `data-sefaria-ref` attribute, such as `Micah 6:8`.

<<< ../../examples/linked-article/index.html#authored-link{html}

The app enhances only `a[data-sefaria-ref]` links that have a non-blank reference and an `href` that is an https address on `www.sefaria.org`.

The app checks whether a link qualifies here:

<<< ../../examples/linked-article/src/app.ts#eligible-link{ts}

### The preview

The app intercepts an ordinary click. An ordinary click means the primary button, with no Alt, Ctrl, Shift or Cmd key, no `download` attribute and no other `target`. The app then opens a native `<dialog>` that holds a `<sefaria-source-card>`.

<<< ../../examples/linked-article/src/app.ts#open-preview{ts}

The card gets its `sref` only at that moment, so nothing loads before a click. The app creates its own client with the cache off and passes it to the card as its data source (the `source` property). The card makes one request, or two when a requested translation language is missing.

### What readers get

- Ctrl-, Cmd-, Shift- or middle-click, the context menu, `target="_blank"` and pages without JavaScript keep the normal link to Sefaria.
- The dialog is modal, so you close it before using another article link. If another activation reaches the app while the dialog is open, it reuses the dialog and changes the reference.
- Escape or the Close button closes the dialog. Focus returns to the link if it is still connected to the page.
- If the request fails or the response is invalid, the dialog closes and a status area on the page shows the error (`role="alert"`). If Sefaria returns a documented HTTP error, such as a 404, the dialog stays open and the card shows the alert. To retry after that error, close the dialog and open it again.
- The app adds only `aria-controls` to eligible links. `destroy()` removes its listeners and restores them.

## What it doesn't do

It doesn't find citations in your text. You write the links.

For automatic detection, use [Sefaria's Linker](https://developers.sefaria.org/docs/linker-v3). It scans a page and links the citations it finds.

This example stores the authored reference in a data attribute. It differs from the Linker in two ways:

- You write the links by hand. The Linker detects them.
- The preview opens in a modal Source Card dialog. The Linker uses its own popups.

It doesn't submit your article or Linker tracking data. Opening a preview still sends a text request to Sefaria.

## Run it locally

From the repository root, use Node.js 22.12 or later and the pnpm version pinned in `package.json`. Build the libraries first, because the example imports their built files:

```sh
pnpm install
pnpm build
pnpm dev:linked-article
```

## Next steps

- [Show an attributed passage](/use-components/show-an-attributed-passage.md) covers the Source Card used here.
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) explains how this toolkit relates to Sefaria's Linker.
