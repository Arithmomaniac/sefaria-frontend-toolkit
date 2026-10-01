> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

This private, unpublished example progressively enhances ordinary Sefaria citation links with `<sefaria-source-card>` in a host-owned native modal `<dialog>`. The article author supplies the native `href` and explicit `data-sefaria-ref`. Eligible activation opens the dialog and assigns card `sref`; close and destroy clear the reference and disconnect the card. The page does not detect citations, rewrite prose, poll, hover-activate, or bulk preload.

## Run locally

From a clone of the repository:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev:linked-article
```

Open the loopback URL printed by Vite. No live data loads on page open. Click the `Micah 6:8` link, or focus it and press Enter, to open a live source preview. Disable JavaScript or use modifier/context-menu navigation to confirm that the authored `https://www.sefaria.org/Micah.6.8` destination remains usable.

## Ownership

[`src/app.ts`](src/app.ts) owns activation policy, the native modal dialog, close-button focus, Escape/button close, focus return to the originating link, client creation, explicit tagged source, integration failure reporting, and cleanup. Source Card owns loading, cancellation, stale-result suppression, validation, private preparation, status, and error events. Closing disconnects the card; reopening starts a fresh cache-disabled source. Ordinary Source Card content is rendered without a separate preview limit.

Deterministic tests inject a strict fixture transport that rejects unexpected methods, origins, paths, and query parameters. Unknown response JSON still crosses the real `@arithmomaniac/sefaria-client` validation boundary before Source Card privately prepares it.

The retired automatic Linker, bookmarklet, detection, extraction, and polling implementation remains available in the immutable [`7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7` archive](https://github.com/Arithmomaniac/sefaria-web-components/tree/7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7/demos/linker).
