> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

This private, unpublished example progressively enhances ordinary Sefaria citation links with `<sefaria-popup>`. The article author supplies the native `href` and explicit `data-sefaria-ref`. Eligible activation assigns Popup `sref`, anchor, and visibility; close and destroy clear the owned reference. The page does not detect citations, rewrite prose, poll, or bulk preload.

## Run locally

From a clone of the repository:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev:linked-article
```

Open the loopback URL printed by Vite. No live data loads on page open. Click the `Micah 6:8` link, or focus it and press Enter, to start a live Sefaria popup. Disable JavaScript or use modifier/context-menu navigation to confirm that the authored `https://www.sefaria.org/Micah.6.8` destination remains usable.

## Ownership

[`src/app.ts`](src/app.ts) owns activation policy, client creation, explicit tagged acquisition, integration failure reporting, and cleanup. On eligible citation activation it assigns Popup `sref`, anchor, and visibility. The Popup owns loading, cancellation, stale-result suppression, validation, private preparation, status, and error events. Preparation is independent of visibility, and failures are not relabeled as success.

Deterministic tests inject a strict fixture transport that rejects unexpected methods, origins, paths, and query parameters. Unknown response JSON still crosses the real `@arithmomaniac/sefaria-client` validation boundary before the Popup privately prepares it.

The retired automatic Linker, bookmarklet, detection, extraction, and polling implementation remains available in the immutable [`7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7` archive](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/linker).
