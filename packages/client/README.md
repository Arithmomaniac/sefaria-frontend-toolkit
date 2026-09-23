> Created/edited by GitHub Copilot; pending human review.

# `@arithmomaniac/sefaria-client`

`@arithmomaniac/sefaria-client` is the validated transport boundary for the complete 60-operation surface in the pinned Sefaria OpenAPI document. It owns the pinned input, guarded corrections, generated contracts and Zod validators, tag-based namespaces, thin fetch client, and bounded default-on per-client response cache.

The committed source manifest remains private to prevent accidental publication. Public GitHub Packages prereleases are available for authenticated installation; the package name is subject to change, and it is not published on npmjs.com. Follow the repository [installation instructions](../../docs/get-started.md#installation-status).

## Ordinary use

```ts
import { createSefariaClient, text } from "@arithmomaniac/sefaria-client";

const client = createSefariaClient();
const result = await text.getV3Texts({
  client,
  path: { tref: "Micah 6:8" },
});
```

Component consumers can supply an existing client as the element's explicit acquisition source:

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

const card = document.createElement("sefaria-source-card");
card.acquisition = { kind: "client", client: createSefariaClient() };
card.sref = "Micah 6:8";
document.body.append(card);
```

Applications with custom renderers use the validated client contracts directly and can apply `@arithmomaniac/sefaria-text-transform` to text they already own.

## Entry points

| Import | Purpose |
| --- | --- |
| `@arithmomaniac/sefaria-client` | Tag namespaces, client creation, generated types, validation helpers, and common errors |
| `@arithmomaniac/sefaria-client/client` | Thin client implementation |
| `@arithmomaniac/sefaria-client/contracts` | Generated transport declarations |
| `@arithmomaniac/sefaria-client/schemas` | Generated Zod schemas |
| `@arithmomaniac/sefaria-client/validators` | Generated operation/status validators |
| `@arithmomaniac/sefaria-client/validation` | Shared validation helpers |
| `@arithmomaniac/sefaria-client/errors` | Contract-validation error types |

The root exports `text`, `index`, `related`, `calendars`, `lexicon`, `topic`, `term`, `sheets`, `collections`, `misc`, and `ref`. Endpoint functions are available only through those namespaces. JSON responses are validated against generated Zod schemas, while declared PNG responses are media-type checked and returned as `Blob` values.

Documented HTTP errors remain typed response payloads. Network failures and aborts reject with Fetch API semantics. Undocumented statuses, invalid JSON, schema mismatches, or wrong media types reject as contract failures with structured paths; they are not converted to empty or success-shaped results.

See [How the pieces fit together](../../docs/guides/data-flow.md) for the client-to-component path and the [client specification](../../docs/specs/client.md) for exact behavior.
