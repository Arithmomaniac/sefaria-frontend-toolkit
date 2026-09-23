> Created/edited by GitHub Copilot; pending human review.

# How declarative components obtain and render data

**Current:** all seven public elements support standalone `sref`. The six ordinary elements also accept authoritative component-specific raw `data`; Reader accepts transactional raw seeds. Elements own validation, acquisition selection, cancellation, stale-result suppression, private preparation, and rendering.

## Start with supplied data

If corrected API-shaped JSON already crossed a server, MCP, fixture, stored-data, or user-input boundary, validate it and assign it directly:

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

const card = document.querySelector("sefaria-source-card");
if (!card) throw new Error("The source card is missing.");

card.data = zCoreV3TextsResponse.parse(received) as CoreV3TextsResponse;
```

For the six non-Reader elements, defined `data` is authoritative. Valid, validly empty, and invalid supplied data all suppress `sref` acquisition. Invalid input replaces earlier content with a validation failure and does not fall through to the network. Clearing `data` lets a retained eligible `sref` run.

Raw data is not render-ready state. Each element validates, selects, sanitizes, and prepares it into private state before rendering. The same private preparation is used after standalone acquisition.

## Then add standalone `sref`

```ts
import "@arithmomaniac/sefaria-web-components";

const card = document.querySelector("sefaria-source-card");
if (!card) throw new Error("The source card is missing.");

card.data = undefined;
card.sref = "Micah 6:8";
```

The element selects either its explicit tagged `acquisition` source or the module-local lazy shared default. An explicit source can be an existing toolkit client, a structural host capability, or disabled. Explicit failure, disablement, or an unsupported operation never falls through to browser HTTP.

Maintained documentation and example pages still preserve their activation gates: opening a page or deep link does not assign a live `sref`. A button, form submission, authored citation activation, or other approved action does.

## Ownership

| Owner | Responsibility | Exclusion |
| --- | --- | --- |
| `@arithmomaniac/sefaria-client` | Corrected operations, response validation, Fetch semantics, and the bounded per-client response cache | Component methods, retries, coalescing, or rendering |
| Text transforms | Pure sanitization, vocalization, footnotes, and bounded previews | Requests or component lifecycle |
| Public element | Input snapshot, acquisition choice, cancellation, stale suppression, private preparation, status, events, accessibility, and rendering | Arbitrary `fetch`, base URL, untyped host, retry, or public prepared state |
| Host | Activation policy, supplied unknown-JSON validation, optional explicit acquisition, placement, and application-specific coordination | A second renderer or hidden fallback transport |
| Reader session | Supported advanced semantic/raw facade: history, pins, budgets, `entryInfo`, stable raw records, and raw transitions | Prepared rendering/content, DOM state, browser-default transport, or spatial pane placement |

## Shared and explicit acquisition

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import {
  configureSefariaAcquisition,
  type SefariaAcquisition,
} from "@arithmomaniac/sefaria-web-components/acquisition";

const acquisition: SefariaAcquisition = {
  kind: "client",
  client: createSefariaClient(),
};

configureSefariaAcquisition(acquisition);
```

Configuration is allowed only before first shared use. Importing modules, supplied-data rendering, and explicit per-element acquisition do not realize the shared choice. The client cache remains the only response cache.

## One parent request, zero child requests

A composite owns its outer operation and privately prepares children from the captured response. It does not assign child `sref`. A ten-item Source Card or ten-preview Connections Panel therefore makes one outer request and zero child requests.

## Lifecycle and errors

Disconnected elements start no work. Disconnection aborts or invalidates active eligible work while retaining committed content. Reconnection resumes only the still-eligible interrupted source or links phase with a new operation identity. Ordinary network failure is not retried automatically.

Popup preparation does not depend on `open`; the property controls visibility only. An activation-gated host assigns and clears Popup `sref` according to host policy.

Current failures are reflected in the element's read-only `status` and documented error events. Original error causes and structured validation paths remain available where the event contract provides them. Superseded work emits no stale success or failure and produces no unhandled rejection.

## Reader is specialized

Reader `sref` identifies the requested root. Raw source/connections seeds initialize or transactionally replace the Reader instead of remaining an ordinary authoritative `data` override. Public read-only diagnostics expose semantic state such as `selectedRef`, `currentEntryId`, `rootLoading`, and `readerError`.

Advanced spatial hosts can use the supported `reader-session` facade for history, pins, budgets, `entryInfo`, stable `ReaderSourceRecord`/`ReaderConnectionsRecord` values, and raw transitions. The `reader` subpath supplies shared raw source qualification. Neither subpath exposes private prepared rendering or content.

For exact contracts, read [Design](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/design.md), [Component specification](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/specs/components.md), and [Integration specification](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/specs/integrations.md).
