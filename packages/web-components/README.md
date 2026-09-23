> Created/edited by GitHub Copilot; pending human review.

# `@arithmomaniac/sefaria-web-components`

The package provides seven declarative Lit elements. Every element accepts standalone `sref`. The six ordinary elements also accept authoritative component-specific raw `data`; Reader accepts transactional raw source/connections seeds. Prepared rendering is private.

## Supplied data

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

import payload from "./micah-6-8.json";

const card = document.createElement("sefaria-source-card");
card.data = zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
document.body.append(card);
```

Defined ordinary-element `data` is authoritative, including valid empty and invalid data, and makes zero requests.

## Standalone `sref`

```ts
import "@arithmomaniac/sefaria-web-components";

const card = document.createElement("sefaria-source-card");
card.setAttribute("sref", "Micah 6:8");
document.body.append(card);
```

The undefined acquisition value lazily uses one shared toolkit client per loaded module instance. Assign `{ kind: "client", client }`, `{ kind: "capability", capability }`, or `{ kind: "disabled" }` for an explicit source. Explicit failure or unsupported operations never fall through to browser HTTP.

## Prebuilt Reader

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

const reader = document.createElement("sefaria-reader");
reader.acquisition = {
  kind: "client",
  client: createSefariaClient(),
};
reader.setAttribute("sref", "Micah 6:8");
document.body.append(reader);
```

Reader owns source and links acquisition, cancellation, semantic history, Back, breadcrumbs, private preparation, and errors. Raw seeds initialize or transactionally replace state. Read-only `status`, `rootLoading`, `selectedRef`, `currentEntryId`, and `readerError` expose semantic diagnostics.

## Lifecycle and composition

- Disconnection aborts or invalidates eligible work; reconnect resumes only the still-eligible interrupted phase.
- Popup preparation is independent of `open`.
- Composite parents prepare children from captured data. Ten children remain one parent request and zero child requests.
- Current failures become accessible state and component-specific error events. Stale completions publish nothing.
- The toolkit client remains the only response-cache owner.

## Public subpaths

| Goal | Entry point |
| --- | --- |
| Register all elements | `@arithmomaniac/sefaria-web-components` |
| Acquisition types/configuration | `@arithmomaniac/sefaria-web-components/acquisition` |
| Component raw request/selection types | Component-specific subpath |
| Shared raw Reader source qualification and raw seed types | `@arithmomaniac/sefaria-web-components/reader` |
| Advanced semantic/raw Reader facade: history, pins, budgets, entry info, records, and raw transitions | `@arithmomaniac/sefaria-web-components/reader-session` |

`./reader-session` remains supported for advanced spatial hosts, and `./reader` supplies the shared DOM-free source-qualification boundary. Neither exposes prepared rendering content. `./bindings` and `./reader-controller` are retired. See [Render text](../../docs/guides/render-text.md), [Reader navigation](../../docs/guides/reader-navigation.md), and the [component specification](../../docs/specs/components.md).
