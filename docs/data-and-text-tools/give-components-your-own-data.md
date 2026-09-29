---
title: "Use the data and text tools › Give components your own data"
description: "Render Sefaria components from data you already hold, or route their loading through your own source, so they don't request Sefaria from the browser."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Give components your own data

Components normally load their text from Sefaria. If you already hold the response, or you want your own server to stand between the page and Sefaria, you can change that. There are two cases.

| You have… | Use… |
| --- | --- |
| A response you saved, fetched on your server, received from an MCP tool, or exported | The element's `data` property |
| A route to Sefaria that your host controls | The element's `acquisition` property |

Both cases use corrected API-shaped JSON. That is the JSON body Sefaria's API returns, in the shape the toolkit's corrected API description expects.

## Supply data once

Check unknown JSON before you pass it on. `validateExternalResponse` from `@arithmomaniac/sefaria-client` returns `{ valid, issues }`. Each issue has an `instancePath` that points to the place in the response where the problem is.

Then set `data` on the element. `data` is a JavaScript property, not an HTML attribute, so set it from script. Import elements from the package root. Importing the root registers them.

<CodeLanguageToggle :snippet="snippets['supplied-source-card-data']" />

The Source Card expects the texts API response, because that is the request it would have made. The [Components reference](/reference/components.md) lists the shape each element expects.

Five elements treat valid `data` as authoritative and make no requests:

- Reference Label (`sefaria-ref-label`)
- Text Segment (`sefaria-text-segment`)
- Bilingual Segment (`sefaria-bilingual-segment`)
- Source Card (`sefaria-source-card`)
- Connections Panel (`sefaria-connections-panel`)

When `data` is set, it wins over `sref`. In the example above, the only request the page makes is the one to your own `/data/micah-6-8.json`.

What happens with data that isn't usable:

- **Invalid data.** The element shows its error state. It doesn't fall back to loading `sref`, and it replaces any load already in progress.
- **Valid data with no text to show.** The element shows its empty state.
- **Data set back to `undefined`.** The element loads from `sref` again.

To see the failure in your own code as well, read [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md).

## Start the Reader from your data

The Reader (`sefaria-reader`) is different. Its `data` is a starting seed of type `ReaderRawSeedData`, not a complete rendering. Every field is optional:

- `source`: `{ payload, status: 200, effectiveRequest: { tref } }`
- `connections`
- `selectedRef`
- `presentation`

The Reader shows what the seed contains and loads what it is missing. As the reader moves to other passages, it loads new data as usual.

<CodeLanguageToggle :snippet="snippets['supplied-reader-seed']" />

This source-only seed makes one links request and doesn't request the source text again.

## Route loading through your host

To control where an element loads from, set its `acquisition` property to one of three choices:

- `{ kind: "client", client }`: use a client you created with `createSefariaClient`, with its own cache.
- `{ kind: "capability", capability }`: use your own functions.
- `{ kind: "disabled" }`: don't load anything.

To apply one choice to the whole page, call `configureSefariaAcquisition(choice)` once, before the first element loads. It throws if an element has already started using the shared choice.

With `capability` or `disabled`, the element never falls back to requesting Sefaria from the browser.

A capability is an object with any of three async functions: `getText(request, signal)`, `resolveReference(request, signal)` and `getLinks(request, signal)`. Each receives an `AbortSignal`. Each returns `{ payload, status }`, where `payload` is the corrected API response body and `status` is its HTTP status. The component validates the payload itself. If an element needs a function your capability doesn't have, it shows an error. A `disabled` choice makes a standalone element show "Standalone Sefaria acquisition is disabled." unless it has `data`.

### Example: a Reader inside AI chat

The MCP App example is an app shown inside an AI chat. It passes `createMcpReaderAcquisition(host)` to the Reader:

<CodeLanguageToggle :snippet="snippets['mcp-reader-acquisition']" />

`getText` calls the MCP server tool `get_text`. `getLinks` calls `get_links_between_texts`. Both go through `host.callServerTool` and pass the signal, so cancelled work stops. The code checks each tool result with `admitSourceResponse` or `admitConnectionsResponse` before it returns it.

This capability supports only the Reader's default selectors, the primary edition plus the translation, and it throws for others. It has no `resolveReference`. A Reader seeded in this example continues through the host tool and makes no requests to Sefaria. See [Reader inside AI chat](/examples/reader-inside-ai-chat.md).

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [Client reference](/reference/client.md) {.learn-more}
