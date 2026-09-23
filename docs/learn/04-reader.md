> Created/edited by GitHub Copilot; pending human review.

# 4. Use the Reader or compose a custom host

## Objective

Use the standalone Reader for the ordinary path, then identify when the lower-level Reader session is appropriate.

## Prerequisites

- Complete [Load live data](03-live-data.md).
- Choose one coordinated Reader or application-owned spatial panes.

## Try it

The maintained controlled page waits for **Start live demo**, then assigns its root to one persistent Reader:

```ts
import "@arithmomaniac/sefaria-web-components";

const reader = document.createElement("sefaria-reader");
reader.setAttribute("sref", "Micah 6:8");
document.body.append(reader);
```

Use `reader.acquisition = { kind: "client", client }` when the host needs an explicit client. Later root changes update the `sref` attribute; successful admission begins a fresh root history transaction without replacing the element.

Open the <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">standalone Reader</SiteLink> or the <SiteLink to="/examples/reader/index.html?tref=Micah%206%3A8">spatial Reader</SiteLink>. Both preserve the no-unsolicited-traffic gate.

## Expected result

- Reader owns source and links acquisition, cancellation, semantic history, Back, breadcrumbs, local connections reprojection, and accessible failures.
- `selectedRef`, `currentEntryId`, `rootLoading`, `status`, and `readerError` are public read-only diagnostics.
- Raw seeds initialize or transactionally replace Reader state; they do not behave like persistent ordinary `data`.
- The spatial example uses `reader-session` semantic entries and immutable raw records while separately owning panes, pins, compact selection, and pruning.

<PlaygroundEmbed project="reader" title="Edit the finite supplied-data Reader" />

The supplied project remains finite. Covered Micah source and links data render with zero requests; uncovered navigation reports an explicit limitation.

## Who owns what

| Choice | Toolkit owns | Host additionally owns |
| --- | --- | --- |
| Standalone Reader | Root workflow, acquisition, semantic history, navigation, loading, errors, and rendering | Activation, optional acquisition source, placement, and lifecycle |
| Spatial composition | Reader session semantics and immutable raw records | Pane identity, placement, pins, pruning, timing, and unavailable-state policy |

MCP is an advanced acquisition environment. The App supplies validated raw seeds or a host capability, and continuation remains host-proxied with no browser HTTP fallback.

## Exercise

Follow a covered supplied connection, then confirm that an uncovered target reports a limitation. Open the live Reader and assign another root without replacing the element.

## Source and run links

- Standalone Reader: <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">open example</SiteLink>
- Full editor: <SiteLink to="/examples/playground/index.html?project=reader">reader project</SiteLink>

## Next step

Continue to [Customize presentation and use headless APIs](05-customization.md).
