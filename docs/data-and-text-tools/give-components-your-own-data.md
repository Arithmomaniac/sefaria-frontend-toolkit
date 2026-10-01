---
title: "Use the data and text tools › Give components your own data"
description: "Render Sefaria components from data you already hold, or route their loading through your own source, so they don't request Sefaria from the browser."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Give components your own data

Components normally load their text from Sefaria. If you already hold the response, or you want your own server to stand between the page and Sefaria, you can change that. There are two cases. With `data`, the element makes no request at all. With a data source, it still loads, and navigates in the Reader, but from the place you choose.

Only three elements accept `data`. The Reader and the Connections Panel don't, because they change as the reader navigates.

| You have… | Use… |
| --- | --- |
| A response you saved, fetched on your server, received from an MCP tool, or exported, for a Text Segment, Bilingual Segment, or Source Card | The element's `data` property |
| Control where a component gets its data, such as local data for a Reader or Connections Panel | Its data source (advanced), described in [Control loading](#control-loading) |

Both cases start from corrected API-shaped JSON. That is the JSON body Sefaria's API returns, in the shape the toolkit's corrected API description expects.

## Supply data once

Check unknown JSON before you pass it on. `validateExternalResponse` from `@arithmomaniac/sefaria-client` returns `{ valid, issues }`. Each issue has an `instancePath` that points to the place in the response where the problem is.

Then set `data` on the Text Segment, Bilingual Segment, or Source Card. `data` is a JavaScript property, not an HTML attribute, so set it from script. Import elements from the package root, which registers them.

The example sets `data` even when the check fails, so the card shows its own error instead of staying blank. You can skip the assignment instead.

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
- **Data set back to `undefined`.** A connected element with a non-blank `sref` loads from it again, through its data source.

Supplied data also follows the element's `translation-fallback` setting. It defaults to `none` on Text Segment and Bilingual Segment, and to `default` on Source Card. If the data lacks the translation language you asked for, the element shows the same "No french text." state as a live load would. It never requests the default translation. The [Components reference](/reference/components.md) describes each element's states.

To see the failure in your own code as well, read [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md).

## Control loading <Badge type="info" text="Advanced" />

### Choose a data source

Choose where the component gets its data: use a toolkit client, provide a custom loader, or disable loading. A custom loader supplies `getText`, `getLinks`, or both, using local data or your own service.

In code, the data source is the `source` property. A custom loader is `{ kind: "custom", loader: { getText, getLinks } }`.

The three choices are:

- **Toolkit client**, `{ kind: "client", client }`. Use a client you created with `createSefariaClient`, with that client's cache settings.
- **Custom loader**, `{ kind: "custom", loader }`. Use your own functions.
- **Loading disabled**, `{ kind: "disabled" }`. Don't load anything.

To set the shared data source instead, call `configureSefariaDataSource(choice)`. Elements with their own `source` ignore it. You can call it again until the first element uses the shared data source. After that, it throws.

With a custom loader or loading disabled, the element never falls back to requesting Sefaria from the browser.

A custom loader is an object with either or both of two async functions, `getText` and `getLinks`. Its type is `SefariaDataLoader`. Each function takes a request and an `AbortSignal`, and returns `{ payload, status }`. The component validates the payload. The type names are in [Package imports and exports](/reference/package-imports-and-exports.md).

If an element needs a function your custom loader doesn't have, the load fails with an error. With loading disabled, any load the element attempts fails with "Sefaria data loading is disabled." That includes the text a Reader asks for. If a later load fails, an element that already showed text keeps it. Its `status` becomes `error`, and its error event fires. [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) shows how to read both.

### Serve local data with a custom loader

The Reader and the Connections Panel have no `data` property. To show data you already hold, give them a custom loader through `source`. The custom loader answers from your local data for the references it has. For any other reference, it throws a clear error or hands the request to another source.

The Reader asks for the text of its root reference. It may also ask for the surrounding section, and for links. Serve each reference you want it to show. Each response is checked like any other payload.

<CodeLanguageToggle :snippet="snippets['local-reader-loader']" />

This example serves only `Micah 6:8`. The Reader loads without any request to Sefaria. The only request is your own `/data/micah-6-8.json`. Navigating to another reference fails with the error the custom loader throws.

#### Example: a Reader inside AI chat

The MCP App example is an app shown inside an AI chat. It passes `createMcpReaderSource(host)`, a custom loader, to the Reader:

<CodeLanguageToggle :snippet="snippets['mcp-reader-acquisition']" />

`getText` calls the MCP server tool `get_text`. `getLinks` calls `get_links_between_texts`. Both go through `host.callServerTool` and pass the signal along, so the host learns when work is cancelled. The code checks each tool result with `admitSourceResponse` or `admitConnectionsResponse` before returning it.

This custom loader supports only the Reader's default selectors, the primary edition plus the translation, and it throws for others. It provides both functions. This Reader loads and navigates through the host tools and makes no direct browser requests to Sefaria. See [Reader inside AI chat](/examples/reader-inside-ai-chat.md).

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [Client reference](/reference/client.md) {.learn-more}
