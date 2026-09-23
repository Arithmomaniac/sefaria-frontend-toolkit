> Created/edited by GitHub Copilot; pending human review.

# 1. Choose a surface and understand ownership

## Objective

Choose one of the seven current elements and render either supplied raw data or a standalone reference.

## Prerequisites

- A modern browser with Web Components support.
- Choose a surface from the [component catalog](../components.md).

## Try it

Register the elements and declare a reference:

```html
<sefaria-source-card sref="Micah 6:8" selectable></sefaria-source-card>
```

Then handle its semantic event:

```ts
import "@arithmomaniac/sefaria-web-components";

const card = document.querySelector("sefaria-source-card");
if (!card) throw new Error("The source card is missing.");
card.addEventListener("sefaria-source-select", (event) => {
  console.log((event as CustomEvent).detail);
});
```

The root import registers all seven elements. The element owns standalone acquisition and private preparation. Do not assign a client, URL, `fetch`, or prepared rendering object.

Use attributes for scalar inputs such as `sref`, `layout`, and `vocalization-mode`. Properties carry rich objects and arrays, so assign raw `data`, tagged `acquisition`, selected positions, and anchors through JavaScript properties instead.

Use an explicit acquisition source only when the default browser client is not appropriate:

```ts
card.acquisition = { kind: "client", client };
```

## Expected result

After the element is connected, it reports loading through its read-only status and renders the validated result. Current failures appear as accessible state and a component-specific error event.

The editor below demonstrates the zero-request supplied-data path:

<PlaygroundEmbed project="ref-label" title="Edit a supplied-data reference label" />

## Who owns what

| Layer | Owns |
| --- | --- |
| Client | Transport validation and bounded per-client response cache |
| Element | Input precedence, acquisition, cancellation, private preparation, rendering, and events |
| Host | Activation policy, optional explicit acquisition, placement, and application behavior |

The complete flow is `sref or raw data -> element validation/acquisition -> private preparation -> Shadow DOM`. Read [How declarative components obtain and render data](../guides/data-flow.md).

## Exercise

Change the editor's HTML, CSS, and JavaScript, then choose **Run**. Confirm that supplied data renders without a request.

## Source and run links

- Full editor: <SiteLink to="/examples/playground/index.html?project=ref-label">reference-label project</SiteLink>
- Generated element metadata: [Custom elements](../reference/custom-elements.md)

## Next step

Continue to [Render supplied data with zero requests](02-supplied-data.md).
