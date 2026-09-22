> Created/edited by GitHub Copilot; pending human review.

# Integration specification

## Status

The documentation site, supplied-data editor, standalone and spatial website Readers, MCP App, and authored linked-article integration are current. Their declarative component-input migration is implemented.

## Shared rules

Integrations consume built artifacts and public package contracts. They own host input, explicit activation policy, external unknown-JSON validation, optional acquisition creation, placement, and application-specific coordination.

An integration assigns component-specific raw `data`, a Reader raw seed, or `sref`. It may assign only the documented tagged acquisition choice. It must not give an element arbitrary `fetch`, a base URL, an untyped host, unknown JSON, or public prepared rendering.

Unknown server, fixture, stored, user, or MCP JSON passes a public corrected client schema or generated validator before element admission. Validation failures report structured paths.

## Activation and traffic policy

Maintained live pages remain explicitly activation-gated. Page arrival, route hydration, deep links, and prefilled query values make no Sefaria request. Only a click, keyboard activation, form submission, example preset, authored citation, or equivalent approved action assigns live `sref` or invokes a host tool.

The supplied-data editor creates no client and makes no live request. Documentation snippets may show immediate `sref` when they are non-executing.

Transport semantics remain unchanged: documented HTTP payloads retain their typed status behavior; network and abort failures remain failures. Integrations add no retry, coalescing, stale fallback, persistence, or response cache beyond the client's bounded per-client cache.

## Supplied-data editor

The editor exposes seven maintained projects. Each validates fixed corrected payloads and assigns raw component data or Reader seeds. It does not retain public controllers, bindings, prepared models, a fetch broker, runtime package installation, CDN loading, service workers, or a live-data fallback.

The trusted host owns project selection, editor state, source links, bounded diagnostics, and preview replacement. Edited code runs only in the opaque sandboxed frame under the existing CSP and finite source/asset/message limits.

The Reader project declares exact finite `Micah 6:8` source and links coverage. Covered actions use saved records; uncovered navigation reports an explicit limitation without fabricating empty data or requesting.

## Documentation site

The VitePress site embeds isolated production builds and does not server-render or hydrate toolkit component HTML. Landing pages, authored previews, live routes, and reference deep links produce no unsolicited Sefaria traffic.

Request policy and deterministic fixture dispatch classify every permitted declarative request shape. Unexpected origins, methods, paths, references, selectors, and query parameters remain denied.

## Website integrations

### Standalone components

The vanilla, React, Alpine, and explorer hosts teach supplied `data` first. Their explicit live action clears authoritative data when applicable, assigns `sref`, and optionally supplies an explicit toolkit client acquisition source. The element owns cancellation, stale suppression, private preparation, status, and error events.

### Standalone Reader

The ordinary website Reader uses one persistent `<sefaria-reader>`. After **Start live demo**, the host assigns an explicit client acquisition and `sref`. Later external roots assign a new `sref`; the Reader transactionally admits the new root and starts a fresh root history without replacing the element.

The host may place a page-owned action in `toolbar-actions` and read `reader.selectedRef` when it activates. The action adds no request or persistence contract.

### Spatial Reader

The spatial example uses one `reader-session` for semantic entries, exact capture coverage, pins, and bounded retention. Its host separately owns pane IDs, placement, compact selection, descendant pruning, cancellation timing, and visible limits.

The spatial host uses semantic `ReaderEntryInfo` and immutable raw `ReaderSourceRecord`/`ReaderConnectionsRecord`; it does not inspect prepared rendering. One parent capture prepares child surfaces without child acquisition.

## MCP App

MCP `structuredContent` carries a corrected API payload. Namespaced metadata carries only the operation identity, documented status, and exact request needed to select the validator and construct a raw Reader seed.

The first App render validates the unknown boundary and supplies the raw seed, making zero duplicate requests. Later Reader work uses a tagged host capability whose only transport is a supported host-proxied tool call. The App and elements never fall back to direct Sefaria HTTP.

The Node tools remain stateless. Reader semantic history and raw records remain in the App/session. `ui/message` is reserved for the separate explicit chat-export action; it is not Reader data transport.

The browser-embedded reference host continues to prove the packaged App, official AppBridge handshake, opaque sandbox, tool/resource discovery, exact request counts, continuing same-App navigation, cancellation, and cleanup. It does not replace stdio, Streamable HTTP, or named-host qualification.

## Authored linked article

The article retains ordinary Sefaria anchors and native navigation. Eligible primary activation assigns Popup `sref`, anchor, and `open`; modifier, alternate-target, download, and non-primary activation remain native.

The page uses an explicit cache-disabled client acquisition source. Close, supersession, and destroy clear the owned reference or remove the Popup. Popup owns its acquisition lifecycle and emits `sefaria-popup-error`; the page owns visible integration status and removes only its listeners and accessibility attributes.

The integration does not detect citations, extract article text, submit a Linker task, poll, hover-activate, bulk preload, rewrite prose, or install a global script.

## Composition and request counts

If an integration already owns corrected data, it supplies raw data or a Reader seed. A parent element or session privately prepares child content from that capture. It must not assign child `sref`.

Ten child renderings from one parent response require one outer request and zero child requests.

## Failure rules

| Failure | Required behavior |
| --- | --- |
| Invalid external JSON | Stop before element admission and report structured paths |
| Documented HTTP payload | Preserve documented status semantics |
| Network or abort rejection | Preserve the failure; do not manufacture empty content |
| Current element failure | Accessible state plus documented error event |
| Superseded completion | Publish neither success nor failure |
| Unsupported explicit capability | Fail without browser HTTP fallback |
| Uncovered supplied Reader target | Report an explicit host limitation |
| Disconnection | Abort/invalidate eligible work; reconnect only the still-eligible phase |

## Completion criteria

- all seven public elements use declarative inputs in maintained integrations
- no maintained integration constructs public prepared rendering, owner controllers, or bindings
- supplied paths make zero requests
- live pages retain explicit activation gates
- MCP continuation remains host-proxied
- Popup visibility remains independent of preparation
- Reader and composite request-count rules are tested
- deterministic checks remain offline
