---
title: "Across components › Make components respond to each other"
description: "Link two components so that selecting a verse in a Source Card updates a Connections Panel, using a state value in React or event listeners in plain JavaScript."
humanReviewed: false
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import CodeBlock from "../.vitepress/theme/CodeBlock.vue";
import plain from "../../examples/site-snippets/source-card-to-connections.html?raw";
import react from "../../examples/react-vite/src/site-source-card-to-connections.tsx?raw";
</script>

# Make components respond to each other

Components don't talk to each other directly. Your page connects them in four steps:

1. A component reports what the reader did through an event.
2. Your page updates its own state.
3. Your page sets the other component's inputs, as attributes or properties.
4. That component redraws or loads.

This page builds these steps with one example. Selecting a verse in a Source Card highlights it and shows that verse's connections in a Connections Panel. The card starts with `Micah 6:8` selected, at position `[2]`. Positions count from 0, so verse 8 of Micah 6:6-8 is position 2. Selecting `Micah 6:7` makes the panel show `Connections for Micah 6:7`.

Each component's own events are covered in [Show an attributed passage](/use-components/show-an-attributed-passage.md) and [Show commentary and connected texts](/use-components/show-commentary-and-connected-texts.md).

## React (recommended)

In React, one state value holds the selection, and it drives both components. When the card reports a selection, the handler stores it. React then re-renders both components. The card gets the new `selectedPosition`. The panel gets the selected verse's `ref` as its `sref`.

This is the tested file `examples/react-vite/src/site-source-card-to-connections.tsx`. It runs in the repository's tests, not on this page. The TypeScript JSX declarations it needs are in [custom-elements.d.ts](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/custom-elements.d.ts). [Use components with a framework](/use-components/use-with-a-framework.md) explains them.

<CodeBlock :code="react.trim()" lang="ts" label="examples/react-vite/src/site-source-card-to-connections.tsx" />

For setup, and for which values are attributes and which are properties, see [Use with a framework](/use-components/use-with-a-framework.md).

## Plain JavaScript

Without a framework, you write each update by hand. The listener on `sefaria-source-select` copies `event.detail.position` to the card's `selectedPosition` and `event.detail.ref` to the panel's `sref`.

This example runs live here. To try changes, choose Edit, change the code, and choose Run.

<LiveEditor :code="plain" title="Source Card selection updating a Connections Panel" />

In plain JavaScript, remove your listeners when you remove the components. [Use with a framework](/use-components/use-with-a-framework.md) shows how.

## Why a reactive framework helps

As coordination grows, a reactive framework such as React, Vue, Svelte, or Alpine helps. One piece of state drives every component, and the framework keeps them in sync. You can do the same in plain JavaScript. Keep state in one place and update components from one function. A framework does that bookkeeping for you.

## How many requests this adds

Coordination adds only the requests each component makes for its own new inputs. It doesn't create hidden requests.

On a fresh load of the example, the card makes one text request and the panel makes one links request. Changing the panel's reference starts one load. That load makes one links request unless the toolkit already has that response cached. Selecting the verse that's already selected doesn't change the panel's `sref`, so nothing loads. The card makes no request when the selection changes.

## When to stop and use something else

If you start rebuilding navigation, history, and panes, use [the complete Reader](/use-components/add-the-complete-reader.md) instead. For a custom multi-pane layout, see the [composed multi-pane Reader](/examples/composed-multi-pane-reader.md) example.

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [Component events](/reference/components.md#events) {.learn-more}

## Next steps

- [Add the complete Reader](/use-components/add-the-complete-reader.md): get navigation, history, and panes without building them.
- [Composed multi-pane Reader](/examples/composed-multi-pane-reader.md): a custom layout of components.
- [Reference › Components](/reference/components.md): every attribute and event.
