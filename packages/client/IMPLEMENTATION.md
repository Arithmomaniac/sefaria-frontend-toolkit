> Created/edited by GitHub Copilot; pending human review.

# `@sefaria/api-client` implementation notes

These notes are for maintainers. They were moved unchanged from the package README, which is now a short entry point. For usage, see the [documentation site](https://sefaria.github.io/sefaria-frontend-toolkit/).

`@sefaria/api-client` is the validated transport boundary for the complete 60-operation surface in the pinned Sefaria OpenAPI document. It owns the pinned input, guarded corrections, generated contracts and Zod validators, tag-based namespaces, thin fetch client, and bounded default-on per-client response cache.

The committed source manifest remains private to prevent accidental publication. First GitHub Packages publication under the Sefaria name is pending qualification; installation will require authentication, and the package is not published on npmjs.com. Follow the repository [installation instructions](../../docs/help/install-and-status.md#packages).

## Ordinary use

```ts
import { createSefariaClient, text } from "@sefaria/api-client";

const client = createSefariaClient();
const result = await text.getV3Texts({
  client,
  path: { tref: "Micah 6:8" },
});
```

Component consumers can supply an existing client as the element's explicit acquisition source:

```ts
import { createSefariaClient } from "@sefaria/api-client";
import "@sefaria/web-components";

const card = document.createElement("sefaria-source-card");
card.source = { kind: "client", client: createSefariaClient() };
card.sref = "Micah 6:8";
document.body.append(card);
```

Applications with custom renderers use the validated client contracts directly and can apply `@sefaria/text-transform` to text they already own.

## Entry points

| Import | Purpose |
| --- | --- |
| `@sefaria/api-client` | Tag namespaces, client creation, generated types, validation helpers, and common errors |
| `@sefaria/api-client/client` | Thin client implementation |
| `@sefaria/api-client/contracts` | Generated transport declarations |
| `@sefaria/api-client/schemas` | Generated Zod schemas |
| `@sefaria/api-client/validators` | Generated operation/status validators |
| `@sefaria/api-client/validation` | Shared validation helpers |
| `@sefaria/api-client/errors` | Contract-validation error types |

The root exports `text`, `index`, `related`, `calendars`, `lexicon`, `topic`, `term`, `sheets`, `collections`, `misc`, and `ref`. Endpoint functions are available only through those namespaces. JSON responses are validated against generated Zod schemas, while declared PNG responses are media-type checked and returned as `Blob` values.

Documented HTTP errors remain typed response payloads. Network failures and aborts reject with Fetch API semantics. Undocumented statuses, invalid JSON, schema mismatches, or wrong media types reject as contract failures with structured paths; they are not converted to empty or success-shaped results.

See [How the pieces fit together](../../docs/concepts/how-the-toolkit-works.md) for the client-to-component path and the [client specification](../../docs/specs/client.md) for exact behavior.
