---
title: "Use components › Use with a framework"
description: "Use the same Source Card and selection handler in plain JavaScript, React, or Alpine: which values are attributes, which are properties, and how to listen for events."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import CodeBlock from "../.vitepress/theme/CodeBlock.vue";
import vanilla from "../../examples/site-snippets/source-card-select.html?raw";
import react from "../../examples/react-vite/src/site-source-card.tsx?raw";
import alpine from "../../examples/alpine-vite/src/site-source-card.html?raw";
</script>

# Use with a framework

The components are standard custom elements, also called web components. Any framework that can render an HTML element, set properties on it, and listen to DOM events can use them. This page shows one Source Card, `Micah 6:6-8`, with one selection handler, written three ways.

## Install and register the elements

Register the elements before your framework renders them, so their JavaScript properties, such as `selectedPosition`, are ready when the framework sets them. Import the package once at the top of your app, or use the script tag from [Start here](/use-components/start-here.md).

<StatusNote />

```ts
import "@arithmomaniac/sefaria-web-components";
```

Element subpaths such as `/source-card` provide types only and don't register the element. Package installation and versions are covered in [Install and status](/help/install-and-status.md).

## Attributes and properties

Strings and booleans can be attributes: `sref`, `selectable`, `layout`, `content-language`, `translation-language`, `vocalization-mode` and similar settings. Objects and arrays can't be attributes. `data`, `acquisition` and `selectedPosition` are JavaScript properties only. `status` is a read-only property.

React 19 sets a prop as a property when the element has one with that name, so the React file passes `selectedPosition` as a prop. Alpine binds attributes, so the Alpine file sets the property with `x-effect="$el.selectedPosition = ..."`.

## The same handler in three places

Each Source Card is selectable. On `sefaria-source-select`, the handler keeps `event.detail`, which is `{ position, ref }`. It sets the card's `selectedPosition` to that position and shows `You selected Micah 6:7 (position 1).`

Custom events bubble and cross the component boundary, so you listen for them the usual way for your framework.

### Plain JavaScript

This example is the tested file `examples/site-snippets/source-card-select.html`. It runs live here, and you can read it but not edit it. It listens with `addEventListener("sefaria-source-select", ...)`.

<LiveEditor :code="vanilla" title="Source Card selection in plain JavaScript" readonly />

React and Alpine manage the listener they add for you. When the card is removed and nothing else keeps it, the listener goes with it. In plain JavaScript, remove your listener yourself when you remove the card, for example with `removeEventListener` or an `AbortController` signal.

<span class="learn-more__label">Learn more:</span> [addEventListener (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) {.learn-more}

### React

This example is the tested file `examples/react-vite/src/site-source-card.tsx`. It runs in the repository's tests, not on this page. In React 19, the handler is the prop `onsefaria-source-select`, with the event name in lowercase after `on`.

<CodeBlock :code="react.trim()" lang="ts" label="examples/react-vite/src/site-source-card.tsx" />

With TypeScript, declare the element's JSX props once. The example project does this in `examples/react-vite/src/custom-elements.d.ts`.

### Alpine

This example is the tested file `examples/alpine-vite/src/site-source-card.html`. It runs in the repository's tests, not on this page. Alpine listens with `@sefaria-source-select="..."`.

<CodeBlock :code="alpine.trim()" lang="html" label="examples/alpine-vite/src/site-source-card.html" />

## Requests

A fresh load of each example makes one request, in any of the three frameworks. Re-rendering with the same values makes no request. Changing `sref`, `acquisition`, or the edition and language choices loads again, unless you supplied `data`; then the card redraws from your data with no request. Display settings such as `layout` and `content-language` never load again.

## Loading, failure and empty states

Every component reports `status`: `empty`, `loading`, `ready` or `error`. In a framework, read `status` from a ref or the element. Listen for the error event the same way as the select event. For Source Card it is `sefaria-source-card-error`, with detail `{ error, sref }`.

| Situation | What readers see | `status` | Error event |
|---|---|---|---|
| Waiting for Sefaria | `Loading Micah 6:6-8.` | `loading` | No |
| Sefaria can't be reached | On a first load, the error message as an alert. If the card already showed text, it keeps that text. | `error` | `sefaria-source-card-error` |
| Sefaria says the text isn't a reference | Sefaria's message, such as `Could not find title in reference: Not a book 3.4` | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

Details are in [Show an attributed passage](/use-components/show-an-attributed-passage.md).

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

To skip the request, set `data` as a property. Then the card makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md): show what a selected verse connects to.
- [Add the complete Reader](/use-components/add-the-complete-reader.md): add the full reading experience.
- [Make components respond to each other](/across-components/make-components-respond-to-each-other.md): link one component's selection to another.
- [Reference › Components](/reference/components.md): every attribute and event.
