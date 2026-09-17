> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Get started

Choose the result that you need. Use the complete Reader, add one UI component, or work with data without UI components.

## Complete Reader path

Use this path when users need to read bilingual text, open connections, follow commentary, and return through their history.

1. [Run the controlled Reader](learn/04-reader.md#try-it).
2. Create one `@arithmomaniac/sefaria-client` client in your application.
3. Load the supplied Reader controller for a bounded reference such as `Micah 6:8`.
4. Bind the controller to `<sefaria-reader>`.
5. Dispose the binding and controller when your application removes the Reader.

A host is the application that owns the component.

The controller manages Reader state changes and cancels requests. The element renders accessible content and sends interaction events. The host owns the starting reference, client, placement, and cleanup.

<SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open the controlled Reader preview</SiteLink>

## Focused component path

Use the [component catalog](components.md) when the product needs one passage card, reference label, connections panel, or popup. Start with a source card for a passage.

A view model is data that a component renders. A factory prepares API data for a component.

1. Make sure that supplied JSON has the required fields, or create the client that loads it.
2. Call the source-card pure or async factory.
3. Assign the returned view model to `<sefaria-source-card>`.
4. Listen for `sefaria-source-select` when selection is enabled.

The [supplied-data lesson](learn/02-supplied-data.md) shows a complete example with no request. The [live-data lesson](learn/03-live-data.md) adds loading, cancellation, and visible failures. It ignores results from old requests.

## Headless client, transform, and factory path

Headless means that no browser element is registered.

Use this path for a service, test, MCP integration, or custom renderer.

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { sanitize } from "@arithmomaniac/sefaria-text-transform";
import { loadSourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";

const client = createSefariaClient({ cache: false });
const viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);
const safeHtml = sanitize("<b>Justice</b>");

console.log(viewModel.state, safeHtml);
```

The client makes sure that transport responses match the API. Text transforms return the same result for the same input. Component factory subpaths return rendering data. They do not register custom elements.

## Setup choices

| Situation | Supported route |
| --- | --- |
| Working in this repository | Follow the [workspace setup](learn/02-supplied-data.md#try-it) |
| Testing an external local consumer | Build and install the three [local tarballs](learn/02-supplied-data.md#try-it) |
| Using a private prerelease | Authenticate to the package source and use the exact available prerelease |
| Looking for a public npm or CDN install | No supported public-registry route is currently documented |

Package privacy and placeholder workspace versions do not show registry availability. Use a package source and version that your environment can resolve.

## Continue

- [Choose a component](components.md)
- [Learn step by step](learn/01-web-components.md)
- [See runnable examples](examples.md)
- [Read task-focused guides](guides/index.md)
