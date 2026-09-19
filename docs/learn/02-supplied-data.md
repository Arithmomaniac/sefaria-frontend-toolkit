> Created/edited by GitHub Copilot; pending human review.

# 2. Set up and render supplied data

## Objective

Validate a supplied `Micah 6:8` payload, project it with the pure source-card factory, and render it with zero requests.

## Prerequisites

- Complete [Web Components and ownership](01-web-components.md), or start with the browser example below.
- A modern browser is enough for the first evaluation.
- For repository development or private-package qualification, use the repository [Development guide](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md#build-and-pack-the-private-libraries) after the browser proof.

## Try it

The maintained source-card project is the fastest way to see the supplied-data path. It starts with a validated `Micah 6:8` payload, calls the pure factory, and renders with zero live requests.

<PlaygroundEmbed project="source-card" title="Edit the supplied-data source card" />

Use **Run** after an edit, then choose **Jump to preview** to move focus to the running result. **Back to editor** returns focus to the project heading without changing the draft, selected project, or preview identity. The editor is a trusted same-site application; edited code still runs only in its existing opaque inner preview.

## Expected result

The card initially displays the supplied Micah 6:8 text and attribution with host request count zero. The browser's global `fetch` also remains unused. Submitting **Load reference** in the separate vanilla example increments the host counter and replaces the supplied example only after the live Sefaria request succeeds. A rejected request remains visible and does not relabel the supplied example as live data.

The maintained page creates a source-card controller and connects it with `bindSourceCardController`. It supplies the fixture through `controller.setSuppliedData`, which makes no request. **Load reference** calls `controller.load` through the public client.

If the editor or package setup does not behave as expected, use the [troubleshooting guide](../guides/troubleshooting.md) for the relevant symptom.

The equivalent pure-factory path is:

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { createSourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";

import payload from "./micah-6-8.json";

const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
if (!card) throw new Error("The source-card element is missing.");

const validated = zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
card.viewModel = createSourceCardViewModel(validated, {
  tref: "Micah 6:8",
});
card.selectable = true;
```

## Who owns what

The fixture is unknown JSON until `zCoreV3TextsResponse` validates it. `createSourceCardViewModel` owns projection and text preparation. The source-card controller calls that factory and manages live request state. The binding supplies controller view models to the element. The initial `controller.setSuppliedData` path does not call the client. The explicit `controller.load` path uses the public client.

## Exercise

Edit the HTML, CSS, and JavaScript in the embedded source-card project. Choose **Run** after each change and confirm that the real component changes while the preview still reports supplied data. Then open the separate vanilla example and inspect `data-request-count` before and after its explicit live action.

## Source and run links

- Hosted vanilla example: <SiteLink to="/examples/vanilla/index.html">open example</SiteLink>
- Full editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>
- Maintained editor source: [`examples/playground/projects/source-card/`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/source-card)
- Source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts)
- Fixture transport and tests: [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md).
