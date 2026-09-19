> Created/edited by GitHub Copilot; pending human review.

# 2. Set up and render supplied data

## Objective

Run the private toolkit from this workspace, an exact authenticated GitHub Packages prerelease, or locally packed tarballs; validate a supplied `Micah 6:8` payload; project it with the pure source-card factory; and render it with zero requests.

## Prerequisites

- Complete [Web Components and ownership](01-web-components.md), or start with the browser example below.
- A modern browser. You do not need a checkout or package installation for the first evaluation.
- For local development or external consumer qualification, use the [advanced local setup](#advanced-local-setup) after the browser proof.

## Try it

The maintained source-card project is the fastest way to see the supplied-data path. It starts with a validated `Micah 6:8` payload, calls the pure factory, and renders with zero live requests.

<PlaygroundEmbed project="source-card" title="Edit the supplied-data source card" />

Use **Run** after an edit, then choose **Jump to preview** to move focus to the running result. **Back to editor** returns focus to the project heading without changing the draft, selected project, or preview identity. The editor is a trusted same-site application; edited code still runs only in its existing opaque inner preview.

## Expected result

The card initially displays the supplied Micah 6:8 text and attribution with host request count zero. The browser's global `fetch` also remains unused. Selecting **Start live demo** in the separate vanilla example increments the host counter and replaces the supplied example only after the live Sefaria request succeeds. A rejected request remains visible and does not relabel the supplied example as live data.

The maintained page creates a source-card controller and connects it with `bindSourceCardController`. It supplies the fixture through `controller.setSuppliedData`, which makes no request. **Start live demo** calls `controller.load` through the public client.

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

## Advanced local setup

Use this section only when you are developing the repository or qualifying an external consumer. For the workspace path:

```powershell
corepack enable
pnpm install
pnpm build
pnpm dev:vanilla
```

For an external local-tarball consumer, first build and pack all three private packages:

```powershell
pnpm build
$repository = (Resolve-Path .).Path
$destination = Join-Path $repository ".artifacts\local-packages"
New-Item -ItemType Directory -Force $destination
pnpm --filter @arithmomaniac/sefaria-client pack --pack-destination $destination
pnpm --filter @arithmomaniac/sefaria-text-transform pack --pack-destination $destination
pnpm --filter @arithmomaniac/sefaria-web-components pack --pack-destination $destination
Get-ChildItem $destination -Filter *.tgz
```

`pnpm --filter ... pack` runs from each package directory, so the absolute destination is intentional. Copy the three emitted tarballs into an external Vite project. Its `package.json` points the top-level dependencies at those local files:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@arithmomaniac/sefaria-client": "file:./arithmomaniac-sefaria-client-0.0.0.tgz",
    "@arithmomaniac/sefaria-text-transform": "file:./arithmomaniac-sefaria-text-transform-0.0.0.tgz",
    "@arithmomaniac/sefaria-web-components": "file:./arithmomaniac-sefaria-web-components-0.0.0.tgz"
  }
}
```

Put the matching transitive overrides in `pnpm-workspace.yaml`, which is the pnpm 11 configuration surface:

```yaml
overrides:
  "@arithmomaniac/sefaria-client": "file:./arithmomaniac-sefaria-client-0.0.0.tgz"
  "@arithmomaniac/sefaria-text-transform": "file:./arithmomaniac-sefaria-text-transform-0.0.0.tgz"
  "@arithmomaniac/sefaria-web-components": "file:./arithmomaniac-sefaria-web-components-0.0.0.tgz"

allowBuilds:
  esbuild: true
```

Use the actual tarball filenames emitted by `pnpm pack`. `pnpm package:smoke` executes this topology in a unique directory outside the checkout: it packs to an absolute destination, discovers and inspects the emitted archives, installs external consumers with exact `file:` dependencies and workspace overrides, and verifies that no workspace source or registry fallback is used.

## Source and run links

- Run: `pnpm dev:vanilla`
- Full editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>
- Maintained editor source: [`examples/playground/projects/source-card/`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/source-card)
- Source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts)
- Fixture transport and tests: [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite)
- Package artifact qualification: [`scripts/test-tarball-consumer.mjs`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/scripts/test-tarball-consumer.mjs)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md).
