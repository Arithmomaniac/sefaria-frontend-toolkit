> Created/edited by GitHub Copilot; pending human review.

# 2. Set up and render supplied data

## Objective

Validate a supplied `Micah 6:8` payload, assign it to a Source Card, and render with zero requests.

## Prerequisites

- Complete [Choose a surface](01-web-components.md).
- Have a corrected v3 payload or use the maintained fixture.

## Try it

<PlaygroundEmbed project="source-card" title="Edit the supplied-data source card" />

The equivalent application path is:

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

import payload from "./micah-6-8.json";

const card = document.querySelector("sefaria-source-card");
if (!card) throw new Error("The source card is missing.");

card.data = zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
card.setAttribute("selectable", "");
```

## Expected result

The element validates the component-specific raw input, privately prepares it, and renders the text and attribution. Defined `data` is authoritative and suppresses `sref`, including valid empty data. Invalid supplied data also suppresses acquisition and becomes an accessible validation failure.

## Who owns what

The boundary validator proves the unknown JSON shape. The element owns selection, sanitization, private preparation, status, and rendering. No public view model, controller, or binding is required.

## Exercise

Change presentation attributes such as `layout`, `side-order`, and `vocalization-mode`. Confirm that the preview remains zero-request.

## Source and run links

- Full editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>
- Maintained source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md).
