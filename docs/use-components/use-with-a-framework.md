---
title: "Use components › Use with a framework"
description: "Use the same Source Card and selection handler in plain JavaScript, React, or Alpine: which values are attributes, which are properties, and how to listen for events."
humanReviewed: false
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
import "@sefaria/web-components";
```

Element subpaths such as `/source-card` don't register their element. They export types and a few helpers. [Install and status](/help/install-and-status.md) covers package installation and versions.

## Attributes and properties

Strings and booleans can be attributes. Objects and arrays can't, so you set them as JavaScript properties. These are the ones this example needs:

| Name | Kind | Meaning |
| --- | --- | --- |
| `sref` | Attribute | The reference to load, such as `Micah 6:6-8`. |
| `selectable` | Attribute | Lets readers select a verse. |
| `selectedPosition` | Property only | Marks the selected verse. Set it to the position from the select event. |
| `data` | Property only | Your own data, so the card makes no request. |
| `status` | Property, read only | The current state: `empty`, `loading`, `ready`, or `error`. |

React 19 sets `selectedPosition` as a property, not an attribute, because the element defines that property. Alpine binds attributes, so the Alpine file sets the property with `x-effect="$el.selectedPosition = ..."`.

<span class="learn-more__label">Learn more:</span> [Reference › Components](/reference/components.md#sefaria-source-card) {.learn-more}

## The same handler in three places

Each Source Card is selectable. On `sefaria-source-select`, the handler keeps `event.detail`, which is `{ position, ref }`. It sets the card's `selectedPosition` to that position and shows `You selected Micah 6:7 (position 1).`

Custom events bubble and cross the component boundary, so you listen for them the usual way for your framework. Source Card fires two events:

- `sefaria-source-select`: a reader selected a verse. The detail is `{ position, ref }`.
- `sefaria-source-card-error`: loading from `sref` failed. The detail is `{ error, sref }`.

<span class="learn-more__label">Learn more:</span> [Component events](/reference/components.md#sefaria-source-card) {.learn-more}

### Plain JavaScript

This example is the tested file `examples/site-snippets/source-card-select.html`. It runs live here. You can read it but not edit it. It listens with `addEventListener("sefaria-source-select", ...)`.

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

A fresh load of each example makes one request. Re-rendering with the same values makes no request. Changing `sref`, the data source, or the edition and language choices loads again. If you supplied `data`, the card instead redraws from your data with no request. Display settings such as `layout` and `content-language` never load again.

## Loading, failure and empty states

Read `status` from a ref or the element. Listen for the error event the same way as the select event. For Source Card it is `sefaria-source-card-error`, with detail `{ error, sref }`.

| Situation | What readers see | `status` | Error event |
| --- | --- | --- | --- |
| Waiting for Sefaria | A loading message | `loading` | No |
| Sefaria can't be reached | An error message as an alert. A card that already showed text keeps it. | `error` | `sefaria-source-card-error` |
| Sefaria says the text isn't a reference | Sefaria's message | `error` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

<span class="learn-more__label">Learn more:</span> [Source Card empty states](/reference/components.md#sefaria-source-card) · [Troubleshoot a page](/help/troubleshoot-a-page.md) {.learn-more}

## Use your own data

To skip the request, set `data` as a property. Then the card makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md): show what a selected verse connects to.
- [Add the complete Reader](/use-components/add-the-complete-reader.md): add the full reading experience.
- [Make components respond to each other](/across-components/make-components-respond-to-each-other.md): link one component's selection to another.
- [Reference › Components](/reference/components.md): every attribute and event.
