> Created/edited by GitHub Copilot; pending human review.

# Get started

Choose the result you want first. You can use the complete Reader, add one focused component, or stay headless and work only with validated data and pure transformations.

## Complete Reader path

Use this path when a person needs to read bilingual text, open connections, follow commentary, and return through navigation history.

1. [Run the controlled Reader](learn/04-reader.md#try-it).
2. Create one `@arithmomaniac/sefaria-client` client in the host.
3. Load the supplied Reader controller for a bounded reference such as `Micah 6:8`.
4. Bind the controller to `<sefaria-reader>`.
5. Dispose the binding and controller with the host lifecycle.

The controller owns Reader transitions and request cancellation. The element owns accessible rendering and emits interaction events. The application owns the starting reference, client, placement, and cleanup.

<SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open the controlled Reader preview</SiteLink>

## Focused component path

Use the [component catalog](components.md) when the product needs one surface such as a passage card, reference label, connections panel, or popup. Start with the source card for the most common passage-sized result:

1. Validate supplied JSON or create the client that will load it.
2. Call the source-card pure or async factory.
3. Assign the returned view model to `<sefaria-source-card>`.
4. Listen for `sefaria-source-select` when selection is enabled.

The [supplied-data lesson](learn/02-supplied-data.md) is a complete zero-request implementation. The [live-data lesson](learn/03-live-data.md) adds explicit loading, cancellation, stale-result protection, and visible failures.

## Headless client, transform, and factory path

Use this path when a service, test, MCP boundary, or custom renderer needs toolkit behavior without browser element registration.

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { sanitize } from "@arithmomaniac/sefaria-text-transform";
import { loadSourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";

const client = createSefariaClient({ cache: false });
const viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);
const safeHtml = sanitize("<b>Justice</b>");

console.log(viewModel.state, safeHtml);
```

The client validates transport responses. Text transforms are deterministic and DOM-free. Component factory subpaths return rendering data without registering custom elements.

## Setup choices

| Situation | Supported route |
| --- | --- |
| Working in this repository | Follow the [workspace setup](learn/02-supplied-data.md#try-it) |
| Testing an external local consumer | Build and install the three [local tarballs](learn/02-supplied-data.md#try-it) |
| Using a private prerelease | Authenticate to the package source and use the exact available prerelease |
| Looking for a public npm or CDN install | No supported public-registry route is currently documented |

Package manifest privacy and placeholder workspace versions do not determine registry availability. Use the package source and exact version your environment can actually resolve.

## Continue

- [Choose a component](components.md)
- [Learn step by step](learn/01-web-components.md)
- [See runnable examples](examples.md)
- [Read task-focused guides](guides/index.md)
