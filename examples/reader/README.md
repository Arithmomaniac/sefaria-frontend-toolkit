> Created/edited by GitHub Copilot; pending human review.

# Reader example

The example package exposes two explicitly activated website paths.

## Standalone Reader

Open [`controlled.html`](controlled.html?tref=Micah%206%3A8). The deep link only prefills the input. **Start live demo** assigns an explicit client acquisition property and `sref` attribute to one persistent `<sefaria-reader>`.

Later form submissions assign a new root to the same element. Reader owns source qualification, links loading, cancellation, semantic history, Back, breadcrumbs, local reprojection, and errors. The page-local bookmark action reads `reader.selectedRef` when activated and adds no request or persistence.

## Spatial Reader

Open [`index.html`](index.html?tref=Micah%206%3A8) when the application needs multiple visible panes. The host owns pane placement, compact selection, pins, pruning, cancellation timing, and limits while reusing `reader-session` semantic entries and immutable raw records.

Both routes preserve the no-unsolicited-traffic gate.

Build the workspace before starting the direct development server:

```powershell
pnpm build
pnpm --filter @sefaria-example/reader dev
```
