> Created/edited by GitHub Copilot; pending human review.

# Vanilla Vite example

This private example first validates supplied `Micah 6:8` JSON, projects it with the pure source-card factory, and renders it without creating a request. **Start live demo** then exercises the public client and source-card async factory against the deployed Sefaria API. The host owns request counting, cancellation, stale-result suppression, and visible failures; a failed live request restores the clearly labeled supplied example rather than presenting it as live data.

From a fresh toolkit-branch checkout, build the private workspace packages before starting the Vite server:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/vanilla-vite dev
```

Use `pnpm --filter @sefaria-example/vanilla-vite build` for a later production bundle.
