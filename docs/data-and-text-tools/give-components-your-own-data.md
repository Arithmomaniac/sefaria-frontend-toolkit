---
title: "Use the data and text tools › Give components your own data"
description: "Render Sefaria components from data you already hold, or route their loading through your own source, so they don't request Sefaria from the browser."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Give components your own data

Components normally load their text from Sefaria. If you already hold the response, or you want your own server to stand between the page and Sefaria, you can change that. There are two cases. With `data`, the element makes no request at all. With `acquisition`, it still loads, and navigates in the Reader, but through your route.

Only three elements accept `data`. The Reader and the Connections Panel don't, because they change as the reader navigates.

| You have… | Use… |
| --- | --- |
| A response you saved, fetched on your server, received from an MCP tool, or exported, for a Text Segment, Bilingual Segment, or Source Card | The element's `data` property |
| A route to Sefaria that your host controls | The element's `acquisition` property (advanced) |
| Local data for a Reader or Connections Panel | A capability, described in [Serve local data to a Reader](#serve-local-data-to-a-reader) (advanced) |

Both cases start from corrected API-shaped JSON. That is the JSON body Sefaria's API returns, in the shape the toolkit's corrected API description expects.

## Supply data once

Check unknown JSON before you pass it on. `validateExternalResponse` from `@arithmomaniac/sefaria-client` returns `{ valid, issues }`. Each issue has an `instancePath` that points to the place in the response where the problem is.

Then set `data` on the Text Segment, Bilingual Segment, or Source Card. The example sets it even when the check fails, so the card shows its own error instead of staying blank. You can skip the assignment instead. `data` is a JavaScript property, not an HTML attribute, so set it from script. Import elements from the package root, which registers them.

<CodeLanguageToggle :snippet="snippets['supplied-source-card-data']" />

The Source Card expects the texts API response, because that is the request it would have made. The [Components reference](/reference/components.md) lists the shape each element expects.

Three elements accept `data`, because their content doesn't change. Valid `data` is authoritative and makes no requests:

- Text Segment (`sefaria-text-segment`)
- Bilingual Segment (`sefaria-bilingual-segment`)
- Source Card (`sefaria-source-card`)

When `data` is set, it wins over `sref`. In the example above, the only request the page makes is the one to your own `/data/micah-6-8.json`.

What happens with data that isn't usable:

- **Invalid data.** The element shows its error state and drops any content it showed before. It cancels any load in progress and doesn't fall back to loading `sref`.
- **Valid but empty data.** It is still authoritative. The element shows its empty state and doesn't load `sref`.
- **Data set back to `undefined`.** A connected element with a non-blank `sref` loads from it again, through its acquisition choice.

Supplied data also follows the element's `translation-fallback` setting. It defaults to `none` on Text Segment and Bilingual Segment, and to `default` on Source Card. If the data lacks the translation language you asked for, the element shows the same "No french text." state as a live load would. It never requests the default translation. The [Components reference](/reference/components.md) describes each element's states.

To see the failure in your own code as well, read [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md).

## Control loading <Badge type="info" text="Advanced" />

Most pages don't need this section.

### Route loading through your host

To control where an element loads from, set its `acquisition` property to one of three choices:

- `{ kind: "client", client }`: use a client you created with `createSefariaClient`, with that client's cache settings.
- `{ kind: "capability", capability }`: use your own functions.
- `{ kind: "disabled" }`: don't load anything.

To set the shared default instead, call `configureSefariaAcquisition(choice)`. Elements with their own `acquisition` ignore it. You can call it again until the first element uses the shared default. After that, it throws.

With `capability` or `disabled`, the element never falls back to requesting Sefaria from the browser.

A capability is an object with either or both of two async functions, `getText` and `getLinks`. Each takes a request and an `AbortSignal`, and returns `{ payload, status }`. The component validates the payload. The type names are in [Package imports and exports](/reference/package-imports-and-exports.md).

If an element needs a function your capability doesn't have, the load fails with an error. With `disabled`, any load the element attempts fails with "Standalone Sefaria acquisition is disabled." That includes the text a Reader asks for. If a later load fails, an element that already showed text keeps it. Its `status` becomes `error`, and its error event fires. [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) shows how to read both.

### Serve local data to a Reader

The Reader and the Connections Panel have no `data` property. To show data you already hold, give them a capability with `acquisition`. The capability answers from your local data for the references it has. For any other reference, it throws a clear error or hands the request to another source.

The Reader asks for the text of its root reference. It may also ask for the surrounding section, and for links. Serve each reference you want it to show. Each response is checked like any other payload.

<CodeLanguageToggle :snippet="snippets['local-reader-capability']" />

This example serves only `Micah 6:8`. The Reader loads without any request to Sefaria. The only request is your own `/data/micah-6-8.json`. Navigating to another reference fails with the error the capability throws.

#### Example: a Reader inside AI chat

The MCP App example is an app shown inside an AI chat. It passes `createMcpReaderAcquisition(host)` to the Reader:

<CodeLanguageToggle :snippet="snippets['mcp-reader-acquisition']" />

`getText` calls the MCP server tool `get_text`. `getLinks` calls `get_links_between_texts`. Both go through `host.callServerTool` and pass the signal along, so the host learns when work is cancelled. The code checks each tool result with `admitSourceResponse` or `admitConnectionsResponse` before returning it.

This capability supports only the Reader's default selectors, the primary edition plus the translation, and it throws for others. It provides both functions. This Reader loads and navigates through the host tools and makes no direct browser requests to Sefaria. See [Reader inside AI chat](/examples/reader-inside-ai-chat.md).

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [Client reference](/reference/client.md) {.learn-more}
