> Created/edited by GitHub Copilot; pending human review.

# 6. Integrate an authored article or MCP host

## Objective

Apply the same request, validation, pure projection, and request-free rendering boundaries in an ordinary authored page and in an MCP App, while distinguishing the static live host from Node transport proof.

## Prerequisites

- Complete [Customize presentation and use headless APIs](05-customization.md).
- For the browser-embedded MCP path, use the static live host below.
- For the Node transport path, use the repository's compiled Node server and local reference host.

## Try it

An authored page keeps a native citation link and enhances it only after JavaScript loads:

```html
<a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">
  Micah 6:8
</a>
```

The page-owned enhancement handles activation, calls the popup async factory with its client and `AbortSignal`, assigns the resulting view model to the request-free popup, and preserves native navigation for JavaScript-disabled and modifier-key use.

Run it with:

```powershell
pnpm dev:linked-article
```

The MCP App starts differently. In the static live host, clicking **Start live demo** creates a real MCP client/server pair in the browser. The server obtains a corrected API payload and puts it in `structuredContent`; the App validates that unknown JSON and calls the same pure factory. Opening the page makes zero Sefaria requests. The initial activated flow makes one text request followed by the App-mediated links continuation, without a duplicate source request. Later navigation uses host-proxied server-tool calls rather than direct App requests.

<iframe class="example-frame mcp" title="Static live MCP App host" src="../examples/mcp-app/live.html"></iframe>

The static host uses the packaged App resource, the official AppBridge and postMessage transport, and an opaque-origin sandbox. It does not need a deployed MCP endpoint, proxy, account, or credential. The host owns Sefaria requests; the App remains request-free.

For the independent Node transport path, run:

```powershell
pnpm dev:mcp
```

## Expected result

The linked article still navigates as ordinary HTML when enhancement is unavailable. With JavaScript, explicit activation opens a popup with visible loading, error, cancellation, and cleanup behavior.

The static live host waits for explicit activation, then renders live Sefaria data through real in-memory MCP tools and the packaged App. `pnpm dev:mcp` separately proves compiled stdio and Streamable HTTP transports, registered resources, separate host/sandbox origins, AppBridge calls, cancellation, validation failures, and exact request deltas.

## Who owns what

| Integration | Request owner | Rendering path |
| --- | --- | --- |
| Authored article | Page enhancement | Client -> popup async factory -> popup view model -> request-free element |
| Static MCP first render | Browser-embedded server after explicit activation | Corrected payload in `structuredContent` -> public schema -> pure factory/controller seed -> request-free Reader |
| Static MCP continuation | App through the browser host's server-tool bridge | In-memory MCP tool result -> validation -> controller/factory -> request-free Reader |
| MCP first render | Node server before the tool result reaches the App | Unknown `structuredContent` -> public schema -> pure factory/controller seed -> request-free Reader |
| MCP continuation | App through the host's supported server-tool bridge | Host-proxied tool result -> validation -> controller/factory -> request-free Reader |

The App does not call Sefaria directly. The static live host qualifies the browser/in-memory topology, while the browser path does not replace Node stdio, HTTP, or named-host qualification.

## Exercise

Disable JavaScript and follow the authored Micah 6:8 link. Re-enable JavaScript, activate it with the keyboard, then close the popup and confirm focus restoration. For MCP, open the static live host and confirm that no live result appears before **Start live demo**. Start it, then use the local Node reference host to identify which actions cross each topology's tool boundary.

## Source and run links

- Linked article guide: [Authored linked article](../linked-article.md)
- Linked article source: [`examples/linked-article/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/linked-article/src/app.ts)
- MCP guide and maintained screenshots: [MCP App demonstration](../mcp-app-demo.md)
- MCP App source: [`examples/mcp-app/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/mcp-app/src/app.ts)
- MCP server source: [`examples/mcp-app/src/server`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app/src/server)

## Next step

Return to the [documentation home](../README.md), inspect the [example catalog](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/README.md), or follow [Development](../development.md) to run the complete repository checks.
