> Created/edited by GitHub Copilot; pending human review.

# MCP App demonstration

The MCP App renders one persistent `<sefaria-reader>` from corrected API-shaped `structuredContent`.

## Initial render

The host calls `get_text`. The MCP server role fetches one corrected Sefaria v3 payload and returns useful plain text plus `structuredContent` and the App resource. The App treats the payload as unknown, validates it, and constructs a raw Reader source seed. The first Reader render makes zero duplicate requests.

## Continuation

The Reader receives a tagged host acquisition capability. Source and links operations call only the originating MCP server through the host's supported `serverTools` bridge. The App and Reader never fall back to direct Sefaria HTTP.

Category changes, paging, Back, and breadcrumbs covered by retained raw records remain local. Connection navigation uses bounded host-proxied `get_text` and `get_links_between_texts` calls. Explicit chat export uses `ui/message` separately from Reader data transport.

## Browser and Node paths

The documentation site includes an explicitly activated in-browser MCP client/server, official AppBridge resource handshake, and opaque sandbox. It proves the packaged App and exact browser request boundaries without an external backend.

The compiled Node server separately proves stdio, Streamable HTTP, Inspector discovery, and the reference host topology. Named-host VS Code evidence remains optional and is recorded in [Evidence](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/evidence.md).

## Theme and failures

The App maps MCP host theme variables to public `--sefaria-*` tokens. Invalid metadata or payloads stop before Reader admission with structured paths. Documented HTTP payloads retain their status meaning. Network, abort, unavailable host-tool, and sandbox failures remain visible and do not become fixture success or empty content.
