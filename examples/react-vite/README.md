> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# React Vite example

This private standalone consumer uses React 19 with the existing `@arithmomaniac/sefaria-client` and `@arithmomaniac/sefaria-web-components` packages. It is an integration example, not a React wrapper package and not a toolkit runtime dependency.

Run it from the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/react-vite dev
```

The build step is required on a fresh checkout because this Vite consumer resolves the private toolkit packages through their `dist` exports.

The initial source card is committed from validated supplied data and makes no request. Submitting the form lets React call the public source-card controller. The controller owns cancellation and stale-result suppression; the binder owns `viewModel` assignment; React owns draft input, presentation properties, canonical readouts, and visible transport failures. Theme, preview width, displayed sides, layout, side order, and Hebrew vocalization are element properties and do not fetch.

Select the rendered Micah 6:8 segment to emit `sefaria-source-select`. The literal React 19 `onsefaria-source-select` prop updates React state, while the same `<sefaria-source-card>` instance remains mounted across rerenders. A failed replacement leaves the prior committed card visible with an explicit prior-result label.

The example is currently available only from this unpublished workspace or from locally packed private tarballs. It does not imply an official React package, public registry release, server rendering, hydration, or Sefaria ownership.
