> Created/edited by GitHub Copilot; pending human review.

# Documentation

Sefaria is a free digital library and data source for Jewish texts and translations. This toolkit helps another product use that library without treating a raw API response or a complete embedded reader as the only choices. Adopt only the layer that the product needs: validated transport data, pure text preparation, render-ready component models, focused request-free components, or a complete controlled Reader.

Choose a path by the result that you want. You can [get started](get-started.md), compare the [seven components](components.md), run an [example](examples.md), or use a [guide](guides/index.md). The [product site](https://arithmomaniac.github.io/sefaria-frontend-toolkit/) adds interactive previews. The Markdown also works on GitHub.

## Use one layer or combine them

The client and text transforms are products in their own right. A server, test, search index, MCP tool, terminal-oriented workflow, or custom renderer can use them without loading the browser package.

| Job | Toolkit layer |
| --- | --- |
| Retrieve supported Sefaria operations and validate runtime JSON | [`@arithmomaniac/sefaria-client`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md) |
| Sanitize supported text markup, extract footnotes, create bounded previews, or change vocalization over existing data | [`@arithmomaniac/sefaria-text-transform`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md) |
| Turn validated payloads into component-specific rendering data for an application-owned UI | Non-DOM [`@arithmomaniac/sefaria-web-components`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md) subpaths |
| Add one citation, segment, source card, popup, or connections view | A focused request-free Web Component |
| Add reading, commentary navigation, connections, and semantic history | The controlled Reader and its controller |

Using the toolkit is different from developing its source. Public installation instructions will accompany the release; current private prereleases and local tarballs exist for qualification. Clone this repository and follow [Development](development.md) only when contributing to the toolkit or running its workspace. The browser examples can be evaluated without cloning.

## Start from a complete solution

You do not need to finish the tutorial before using the toolkit:

| Need | Destination |
| --- | --- |
| Prebuilt stateful reading surface | [Controlled Reader lesson](learn/04-reader.md) and [`examples/reader/controlled.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/reader/controlled.html) |
| Edit a supplied-data component | [Seven-project editor](examples.md) and [`examples/playground/index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/playground/index.html) |
| Compare all rendering surfaces | [Component catalog](components.md) |
| Read a component-specific usage guide | [Component usage directory](components/) |
| Component states and live diagnostics | [Example catalog](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/README.md) |
| A passage card in a browser app | [Render text](guides/render-text.md) |
| Authored citation popups | [Linked article](linked-article.md) |
| Reader in an MCP Apps host | [MCP App demonstration](mcp-app-demo.md) |

The toolkit supplies the controller for Reader navigation. Your application creates the client and controller. It connects the controller to the element and cleans them up. A website can call the client directly. An MCP App can use tools from its host. Both options keep the Reader element free of requests.

## Learn step by step

1. [Choose a component and learn ownership](learn/01-web-components.md). Edit a reference label while learning registration, properties, events, and requests.
2. [Set up and render supplied data](learn/02-supplied-data.md). Edit and render the maintained Micah 6:8 source card without a request.
3. [Load data and handle interaction](learn/03-live-data.md). Compare that supplied-data project with an explicit live host, then add loading, visible failures, selection events, cancellation, and protection from old results.
4. [Use the Reader or build a custom host](learn/04-reader.md). Edit the finite supplied-data Reader, then use the supplied Reader controller and learn what a custom layout must manage.
5. [Change presentation or use APIs without UI components](learn/05-customization.md). Edit source-card presentation, use the controlled Reader's host-owned action, and choose client, factory, or text-transform APIs.
6. [Add an article or MCP host](learn/06-host-integration.md). Add citation links, supplied server data, host tools, or the static MCP host.

React users can branch from steps 2 and 3 into [Use the Web Components from React](learn/react.md). Alpine users can follow the same controller and property flow in [Use the Web Components from Alpine](learn/alpine.md). Web Components are browser-standard custom elements, so neither framework needs a toolkit-specific wrapper package.

## Understand the design

- [How the pieces fit together](guides/data-flow.md)
- [Text markup, with examples](guides/text-markup.md)
- [Intentional differences from Sefaria](guides/differences.md)
- [Reader navigation and host boundaries](guides/reader-navigation.md)
- [Stable ownership and dependency boundaries](design.md)
- [Observed source evidence and provenance](evidence.md)

`Current` means delivered on the documented repository baseline. `Planned` means intended but not delivered. `Observed` means that a named source or capture provides the evidence. It does not describe every Sefaria text.

## Reference

| Goal | Document |
| --- | --- |
| Set up the repository and run local and site tests | [Development](development.md) |
| Review a change at the right depth | [Review](review.md) |
| Use the API client | [`@arithmomaniac/sefaria-client`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md) |
| Use text transforms without components | [`@arithmomaniac/sefaria-text-transform`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md) |
| Choose component and Reader subpaths | [`@arithmomaniac/sefaria-web-components`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md) |
| Inspect generated element metadata | [Custom elements](reference/custom-elements.md) |
| Inspect declaration-derived package exports | [Public package exports](reference/public-exports.md) |

## Contributor and internals

These pages describe how the repository is built, specified, evidenced, and reviewed. They are useful when contributing or auditing the toolkit, not prerequisites for evaluating or adopting it.

| Goal | Document |
| --- | --- |
| Find the audience and owner of every maintained page | [Documentation map](reference/documentation-map.md) |
| Set up the repository and run all checks | [Development](development.md) |
| Inspect stable ownership boundaries | [Design](design.md) |
| Review a change at the right depth | [Review](review.md) |
| Read source provenance and compatibility evidence | [Evidence](evidence.md) |
| Read normative contracts | [Specifications](specs/client.md) |
| Find historical removed material | [Documentation archive](archive/README.md) |
| Find the audience and owner of every maintained page | [Documentation map](reference/documentation-map.md) |

## Project origin

This project began as a Microsoft Global Hackathon 2026 project. Thank you to Microsoft for sponsoring the hackathon and providing the time and platform that helped turn the initial idea into working software. The toolkit is now an independently maintained open-source project.

## Specifications

Specifications define intended behavior and acceptance rules. Generated declarations define each transport field. Component subpaths define rendering types.

- [Client specification](specs/client.md)
- [Text-processing specification](specs/text-processing.md)
- [Component specification](specs/components.md)
- [Integration specification](specs/integrations.md)
