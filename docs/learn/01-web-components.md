> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# 1. Choose a surface and understand ownership

## Objective

Choose a current rendering surface, show a useful request-free state, and understand what the browser element, toolkit factory, and application host each own.

For a complete reading flow, begin with the [controlled Reader](04-reader.md). For one passage or range, begin with a source card. The [component catalog](../components.md) compares all seven current surfaces and links to working previews.

A Web Component is a browser-standard custom HTML element. One JavaScript import registers it, after which vanilla JavaScript, React, or another browser framework can create the same element and assign its typed properties. You do not need to know Lit to consume the toolkit.

## Prerequisites

- Node.js 22.12 or later and pnpm 11.22.0.
- A browser with Chromium-compatible Web Components support. Chromium is the browser qualified by this repository.
- Choose a surface from the [component catalog](../components.md).

## Try it

Register the browser elements, create one source card, and assign a render-ready object to its `viewModel` property:

```ts
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import type { SourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";

const card = document.createElement("sefaria-source-card") as SefariaSourceCard;

const model: SourceCardViewModel = {
  state: "loading",
  message: "Waiting for the host.",
};

card.viewModel = model;
card.addEventListener("sefaria-source-select", (event) => {
  console.log((event as CustomEvent).detail);
});
document.body.append(card);
```

The `import "@arithmomaniac/sefaria-web-components"` statement registers the custom elements in the browser. The non-DOM subpaths, such as `@arithmomaniac/sefaria-web-components/source-card`, export request types, view models, and factories without registering elements.

An HTML attribute contains text. Properties can carry objects and arrays, so the host assigns a component view model as a JavaScript property:

```html
<!-- This creates an element, but it does not load or render a passage. -->
<sefaria-source-card></sefaria-source-card>
```

Do not add a `tref`, client, URL, payload, or `fetch` property to an element. When an interaction needs different data, the element emits an event and the host decides whether to load anything.

## Expected result

The element renders its loading state inside Shadow DOM. No network request occurs. The host can listen for the composed selection event without reaching into the component's internal markup. In the editor below, the reference-label controller receives validated supplied data and the binding assigns its view model to the element.

<PlaygroundEmbed project="ref-label" title="Edit a request-free reference label" />

## Who owns what

| Layer | Owns | Does not own |
| --- | --- | --- |
| `@arithmomaniac/sefaria-client` | Corrected transport calls, response validation, and the bounded per-client response cache | Component state or rendering |
| Pure/async component factories | Projection from validated payloads to one component's view model | DOM layout or host interaction state |
| Web Component | Shadow DOM, accessibility, theme, layout, and event emission | References, requests, clients, or raw payloads |
| Host application | Inputs, loading, cancellation, stale-result rejection, and assigning view models | Reimplementing factory projection |

For supported stateful surfaces, the toolkit can also supply a controller that coordinates existing factories and state. The controlled Reader uses this path: the host binds the provided controller instead of implementing navigation from scratch.

The complete low-level flow is `client -> pure/async factory -> component-specific view model -> request-free element`. Read [How the pieces fit together](../guides/data-flow.md) for the detailed failure and composition rules.

## Exercise

Change the editor's HTML to move the reference label, change its CSS, then change the JavaScript message shown after selecting **Unresolved**. Choose **Run** after each edit and confirm that the preview changes. The project description identifies the saved Micah 6:8 responses and zero-request coverage; use the next lesson's vanilla example when you want a visible request counter.

## Source and run links

- Run: `pnpm dev`, then open the authored workbench.
- Full editor: <SiteLink to="/examples/playground/index.html?project=ref-label">reference-label project</SiteLink>
- Maintained editor source: [`examples/playground/projects/ref-label/`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/ref-label)
- Source: [`development-status.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/development-status.ts)
- Component contract: [`docs/specs/components.md`](../specs/components.md)
- Generated element metadata: [Custom elements](../reference/custom-elements.md)

## Next step

Continue to [Render supplied data with zero requests](02-supplied-data.md).
