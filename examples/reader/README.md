> Created/edited by GitHub Copilot; pending human review.

# Reader examples

Run both Reader destinations from the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/reader dev
```

The build step is required on a fresh checkout because this Vite consumer resolves the private toolkit packages through their `dist` exports.

## Supported controlled Reader

[Open `controlled.html`](controlled.html?tref=Micah%206%3A8) for the shortest supported path. The page creates an `@arithmomaniac/sefaria-client` instance, calls `loadReaderController` from `@arithmomaniac/sefaria-web-components/reader-controller`, binds it to `<sefaria-reader>`, routes later form submissions through `replaceRoot` on the same controller, reports controller task state, and disposes requests, subscriptions, and bindings.

The deep link prefills the reference but makes no request. Select **Start live demo** to initialize the controller. Later submissions keep the old source visible until the replacement qualifies, then start a fresh breadcrumb trail without replacing the element or controller. The element remains request-free. Source selection, connection navigation, history, external root replacement, and errors flow through the controller owned by the host.

The page also demonstrates bounded customization. A page-local bookmark button is placed through the Reader's `toolbar-actions` slot, reads the exact current selected target from the controller snapshot when clicked, and is disabled during source or connections loading. The example styles only the documented `toolbar`, `history`, `source-pane`, and `connections-pane` parts plus existing `--sefaria-*` tokens. It adds no persistence or sharing service and does not inspect Reader shadow DOM.

## Website-owned spatial workspace

[Open `index.html`](index.html?tref=Micah%206%3A8) when studying custom composition. This host owns multiple source/connections panes, activation, close/prune policy, session pins, contextual requests, cancellation, and compact responsive selection. It reuses `@arithmomaniac/sefaria-web-components/reader-session`, the public factories, and the same component events, but the spatial pane policy is example code rather than supported Reader API policy.

Both pages accept a URL-encoded `?tref=` initial reference and retain `Micah 6:8` as the bounded fallback. The query value only prefills the form; neither page loads it before the user starts the live demo.
