> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Vanilla Vite example

This private example first validates supplied `Micah 6:8` JSON and commits it through the public source-card controller with zero requests. Submitting the form then exercises the public client against the deployed Sefaria API. The controller and public binder own cancellation, stale-result suppression, and view-model delivery. The host owns draft input, presentation properties, canonical committed and selected-reference readouts, and visible failure labeling.

Changing displayed sides, layout, side order, or Hebrew vocalization performs zero requests. A failed replacement leaves the prior card visible with an explicit prior-result label rather than presenting fixture content as live success.

From a fresh toolkit-branch checkout, build the private workspace packages before starting the Vite server:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/vanilla-vite dev
```

Use `pnpm --filter @sefaria-example/vanilla-vite build` for a later production bundle.
