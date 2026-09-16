> Created/edited by GitHub Copilot; pending human review.

# 2. Set up and render supplied data

## Objective

Run the private toolkit from this workspace, an exact authenticated GitHub Packages prerelease, or locally packed tarballs; validate a supplied `Micah 6:8` payload; project it with the pure source-card factory; and render it with zero requests.

## Prerequisites

- Complete [Web Components and ownership](01-web-components.md).
- Node.js 22.12 or later, pnpm 11.22.0, and Chromium.
- Repository access for the workspace path, or authenticated access to the private GitHub Packages prereleases. There is no public npm registry or CDN distribution.

## Try it

For the workspace path:

```powershell
corepack enable
pnpm install
pnpm build
pnpm dev:vanilla
```

The maintained vanilla example validates its imported JSON fixture before projection. This is its initial render path:

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

The same maintained page also has **Start live demo**. That explicit action calls `loadSourceCardViewModel` through the public client against the deployed Sefaria API without changing the initial zero-request path.

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

## Expected result

The card initially displays the supplied Micah 6:8 text and attribution with host request count zero. The browser's global `fetch` also remains unused. Selecting **Start live demo** increments the host counter and replaces the supplied example only after the live Sefaria request succeeds. A rejected request remains visible and does not relabel the supplied example as live data.

<iframe class="example-frame" title="Vanilla supplied-data example" src="../examples/vanilla/index.html"></iframe>

## Who owns what

The fixture is unknown JSON until `zCoreV3TextsResponse` validates it. `createSourceCardViewModel` owns projection and text preparation. The element owns presentation. The initial path does not call the client. The explicit second path lets the host call the public async factory with an injected deterministic transport.

## Exercise

Inspect `data-request-count` before and after the explicit client action. Then add a counter around `globalThis.fetch` before the module loads and confirm it stays zero because the example's admitted client action uses its injected fixture transport.

## Source and run links

- Run: `pnpm dev:vanilla`
- Source: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts)
- Fixture transport and tests: [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite)
- Package artifact qualification: [`scripts/test-tarball-consumer.mjs`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/scripts/test-tarball-consumer.mjs)

## Next step

Continue to [Load live data and handle interaction](03-live-data.md), or take the parallel [React path](react.md).
