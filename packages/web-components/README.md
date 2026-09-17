> Created/edited by GitHub Copilot; pending human review.

# `@arithmomaniac/sefaria-web-components`

`@arithmomaniac/sefaria-web-components` provides pure view-model factories and request-free Lit elements for Sefaria reading surfaces. Elements receive component-specific rendering data through JavaScript properties; they do not accept references, clients, raw API payloads, or `fetch`.

This is a private built package, not a published npm installation. Its export map resolves to `dist` JavaScript and declarations, while `custom-elements.json` and the generated [custom-element reference](../../docs/reference/custom-elements.md) describe the browser surface.

## Choose an entry point

| Goal | Recommended entry point |
| --- | --- |
| Register all current custom elements | `@arithmomaniac/sefaria-web-components` |
| Render a passage or range | `@arithmomaniac/sefaria-web-components/source-card` |
| Render one primary/translation pair | `@arithmomaniac/sefaria-web-components/bilingual-segment` |
| Render one selected edition | `@arithmomaniac/sefaria-web-components/text-segment` |
| Render a reference label | `@arithmomaniac/sefaria-web-components/ref-label` |
| Render and page contextual links | `@arithmomaniac/sefaria-web-components/connections-panel` |
| Bind headless controllers to registered elements | `@arithmomaniac/sefaria-web-components/bindings` |
| Use the supported stateful Reader | `@arithmomaniac/sefaria-web-components/reader-controller` and `@arithmomaniac/sefaria-web-components/reader` |
| Build custom host navigation | `@arithmomaniac/sefaria-web-components/reader-session` |

## Prebuilt Reader

```ts
import "@arithmomaniac/sefaria-web-components";
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { bindReaderController } from "@arithmomaniac/sefaria-web-components/bindings";
import { loadReaderController } from "@arithmomaniac/sefaria-web-components/reader-controller";

const reader = document.createElement("sefaria-reader");
document.body.append(reader);

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  createSefariaClient(),
);
const unbind = bindReaderController(reader, controller);

controller.setPresentation({
  originEntryId: controller.snapshot.reader.currentEntryId,
  patch: { vocalizationMode: "nikkud" },
});

await controller.replaceRoot({ tref: "Micah 6:7" });

window.addEventListener(
  "pagehide",
  () => {
    unbind();
    controller.dispose();
  },
  { once: true },
);
```

## Optional component controllers

Each endpoint-backed component subpath exports a headless controller factory alongside its pure and async factories. A controller owns one component's pending attempt, cancellation, stale-result suppression, committed terminal view model, supplied-response validation, and subscriptions. It makes no request until `load` is called.

```ts
import "@arithmomaniac/sefaria-web-components";
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createSourceCardController } from "@arithmomaniac/sefaria-web-components/source-card";

const card = document.createElement("sefaria-source-card");
const controller = createSourceCardController(createSefariaClient());
const unbind = bindSourceCardController(card, controller);
document.body.append(card);

await controller.load({ tref: "Micah 6:8" });

window.addEventListener(
  "pagehide",
  () => {
    unbind();
    controller.dispose();
  },
  { once: true },
);
```

The controller's immutable snapshot keeps a pending or failed named attempt separate from its previous committed result. Network, schema, abort, and programmer failures reject with their original cause; a documented HTTP response remains a component-specific terminal view model. `setSuppliedData` validates unknown corrected API-shaped JSON and calls the same pure projection with zero requests. Connections additionally retains one current corrected links payload for zero-I/O category and page projection.

The `bindings` subpath contains DOM adapters only. Importing it does not register elements or access DOM globals; import the package root separately when the host wants package-wide registration. Unbinding removes element listeners and the snapshot subscription without disposing the caller-owned controller.

Hebrew-capable elements expose the typed `vocalizationMode` property and the `vocalization-mode` attribute with `taamim_and_nikkud`, `nikkud`, and `none` presets. The default preserves all marks. Changing the property is local presentation work over the existing safe view model; it does not refetch or rerun a component factory. A controlled Reader retains the setting per semantic history entry and exposes it separately as `controller.snapshot.presentation`. Following a connection pushes history, while `replaceRoot` starts a fresh root on the same controller and element after source qualification succeeds. An exact canonical item already covered by the current source capture and the same edition selectors reuses that capture with zero source requests while still creating a fresh root and loading its connections. Aliases, uncovered references, and edition changes use normal source qualification. During qualification, `bindReaderController` sets the request-free element's `rootLoading` property so the committed root remains visible under an accessible loading treatment. A host can also set `rootLoading` before supplying the first view model to show the full initial Reader loading state.

The Reader's optional `toolbar-actions` slot places additive host-owned controls after the built-in action controls once a view model is committed. Read action targets from the current `controller.snapshot.reader.selectedTarget` or current Reader view model when the action activates; the slot carries no data context and does not replace required Reader content. The built-in `chatExport` property and event remain the supported chat-specific affordance.

Use `::part(toolbar)`, `::part(history)`, `::part(source-pane)`, and `::part(connections-pane)` for coarse Reader-region styling. No child parts are forwarded. Prefer the shared `--sefaria-*` properties for theme-wide color, type, radius, and scale changes. A host that overrides region layout or visibility owns the resulting responsive behavior.

Use a component's pure factory when corrected API-shaped JSON has already crossed a validated server, MCP, fixture, stored-data, or user-input boundary. Use its async factory for browser client mode. A successful async result is the same projection as the pure factory over its captured payload.

See [Render text](../../docs/guides/render-text.md) for smaller components, [Reader navigation](../../docs/guides/reader-navigation.md) for packaged versus custom composition, and the [component specification](../../docs/specs/components.md) for exact contracts.
