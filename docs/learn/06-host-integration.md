> Created/edited by GitHub Copilot; pending human review.

# 6. Integrate an authored article or MCP host

## Objective

Apply the same request, validation, pure projection, and request-free rendering boundaries in an ordinary authored page and in an MCP App.

An MCP App is an interactive web interface opened by an MCP host such as an AI client. The host provides data and tool calls; the App validates that data and renders the toolkit Reader without calling Sefaria directly.

## Prerequisites

- Complete [Customize presentation and use headless APIs](05-customization.md).
- Use the browser demonstration below when you want to see the complete interaction locally without deploying a server.
- Use the Node path when you are building or testing an MCP server over stdio or HTTP.

## Try it

An authored page keeps a native citation link and enhances it only after JavaScript loads:

```html
<a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">
  Micah 6:8
</a>
```

The page-owned enhancement handles activation, calls the popup async factory with its client and `AbortSignal`, assigns the resulting view model to the request-free popup, and preserves native navigation for JavaScript-disabled and modifier-key use. <SiteLink to="/examples/linked-article/index.html">Open the hosted linked article</SiteLink>.

The MCP App starts differently. In the browser demonstration, clicking **Start live demo** creates a real MCP client/server pair in the page. The server returns API data in the MCP result's `structuredContent` field. The App treats that field as unknown JSON, validates it, and calls the same pure factory. Opening the page makes zero Sefaria requests. The initial activated flow makes one text request followed by a links request, without loading the source twice. Later navigation asks the host to run the server tool; the App still does not request Sefaria directly.

<iframe class="example-frame mcp" title="Static live MCP App host" src="../examples/mcp-app/live.html"></iframe>

The browser demonstration uses the packaged App resource and the official browser bridge between host and App. It runs the App in an opaque-origin sandbox and does not need a deployed MCP endpoint, proxy, account, or credential. The host owns Sefaria requests; the App remains request-free.

## Expected result

The linked article still navigates as ordinary HTML when enhancement is unavailable. With JavaScript, explicit activation opens a popup with visible loading, error, cancellation, and cleanup behavior.

- **Browser demonstration:** waits for explicit activation, then renders live Sefaria data through in-memory MCP tools and the packaged App.
- **Node integration path:** repository contributors can follow the repository-only [MCP development instructions](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md#run-the-mcp-app-server) for stdio and HTTP transport checks.

## Who owns what

| Integration | Request owner | Rendering path |
| --- | --- | --- |
| Authored article | Page enhancement | Client -> popup async factory -> popup view model -> request-free element |
| Static MCP first render | Browser-embedded server after explicit activation | Corrected payload in `structuredContent` -> public schema -> pure factory/controller seed -> request-free Reader |
| Static MCP continuation | App through the browser host's server-tool bridge | In-memory MCP tool result -> validation -> controller/factory -> request-free Reader |
| MCP first render | Node server before the tool result reaches the App | Unknown `structuredContent` -> public schema -> pure factory/controller seed -> request-free Reader |
| MCP continuation | App through the host's supported server-tool bridge | Host-proxied tool result -> validation -> controller/factory -> request-free Reader |

The App does not call Sefaria directly. The browser demonstration proves the in-page interaction; it does not replace testing the Node server or a named MCP host.

## Exercise

Disable JavaScript and follow the authored Micah 6:8 link. Re-enable JavaScript, activate it with the keyboard, then close the popup and confirm focus restoration. For MCP, open the static live host and confirm that no live result appears before **Start live demo**. Start it, then use the local Node reference host to identify which actions cross each topology's tool boundary.

## Source and run links

- Linked article guide: [Authored linked article](../linked-article.md)
- Linked article source: [`examples/linked-article/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/linked-article/src/app.ts)
- MCP guide and maintained screenshots: [MCP App demonstration](../mcp-app-demo.md)
- MCP App source: [`examples/mcp-app/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/mcp-app/src/app.ts)
- MCP server source: [`examples/mcp-app/src/server`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app/src/server)

## Next step

Return to the [product home](../index.md) or inspect the [example catalog](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/README.md).
