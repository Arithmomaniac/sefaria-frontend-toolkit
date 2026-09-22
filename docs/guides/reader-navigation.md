> Created/edited by GitHub Copilot; pending human review.

# Reader navigation and host ownership

The ordinary Reader is the declarative `<sefaria-reader>` element. It owns root acquisition, semantic history, Back, breadcrumbs, cancellation, private preparation, responsive panes, and error reporting. The host owns activation policy, the starting reference, optional acquisition, placement, and lifecycle.

## Browser path

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

const reader = document.createElement("sefaria-reader");
reader.acquisition = {
  kind: "client",
  client: createSefariaClient({ cache: false }),
};
reader.sref = "Micah 6:8";
document.body.append(reader);
```

Assigning another root keeps the element and starts a transactional root replacement:

```ts
reader.sref = "Micah 6:7";
```

Read-only `status`, `rootLoading`, `selectedRef`, `currentEntryId`, and `readerError` provide semantic diagnostics without exposing private prepared state.

## MCP path

The server's initial corrected payload is unknown at the App boundary. The App validates it and constructs a raw Reader source or connections seed. The first render makes zero duplicate requests.

Later Reader operations use a tagged host capability backed only by the MCP host's server-tool bridge. Unsupported or failed operations never fall through to direct Sefaria HTTP. `ui/message` remains a separate explicit chat-export action.

## Semantic history

Reader history identifies entries, not reference strings. Two visits to the same reference can be distinct entries.

| Action | History effect |
| --- | --- |
| Select another segment in the current source | Update the current entry and its connections |
| Change category, page, preview visibility, or presentation | Update the current entry |
| Open a connected source | Push a new entry after source admission |
| Back | Return to the previous retained entry |
| Activate an earlier breadcrumb | Return to it and discard later entries |
| Switch pane or resize | Presentation only |
| Assign a new external root | Transactionally replace the root history |

Late completion from an obsolete entry cannot overwrite the current one. A text success followed by links failure retains the admitted text and exposes the connections failure.

## Raw retained records

The DOM-free `reader-session` subpath remains a supported advanced semantic/raw facade. It exposes history, pins, budgets, `entryInfo`, raw transitions, and immutable `ReaderSourceRecord` and `ReaderConnectionsRecord` values. Records retain exact effective requests, documented statuses, coverage, and library-owned cloned/frozen corrected payloads.

These records support Back reprojection, spatial composition, and MCP admission. They do not expose prepared rendering, DOM state, or a serialized persistence format.

The `reader` subpath exposes shared raw source qualification through `resolveReaderSource` and the common DOM-free data-source contract. Ordinary Reader loading and spatial hosts therefore use the same qualification boundary without sharing prepared content.

Default retention is 20 entries and 20 MiB of uniquely retained corrected payload JSON. The session never silently evicts current or pinned entries and rejects an admission transactionally when permitted eviction cannot make it fit.

## Spatial composition

Use the standalone Reader unless the application needs multiple simultaneously visible panes. The maintained spatial example separately owns pane IDs, placement, compact active pane, pins, descendant pruning, cancellation timing, and visible limits while reusing Reader-session semantics and raw records.

A spatial parent with captured data prepares child surfaces from that data. It does not assign child `sref`; one parent response still produces zero child requests.

## Wide and narrow layouts

The standalone Reader presents source and connections side by side on a wide container and one explicit active pane on a narrow container. Pane changes and resizing do not request data or mutate semantic history. The host can use the documented `toolbar-actions` slot and four coarse parts without inspecting Shadow DOM.

## Current limitations

The current contract does not include durable persistence, Forward, automatic browser URL history, native-mobile rendering, arbitrary public pane management, retries, request coalescing, or fallback transport.

See the [component specification](../specs/components.md), [integration specification](../specs/integrations.md), and [Reader lesson](../learn/04-reader.md).
