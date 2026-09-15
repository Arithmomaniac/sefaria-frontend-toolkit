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
| Use the supported stateful Reader | `@arithmomaniac/sefaria-web-components/reader-controller` and `@arithmomaniac/sefaria-web-components/reader` |
| Build custom host navigation | `@arithmomaniac/sefaria-web-components/reader-session` |

## Prebuilt Reader

```ts
import "@arithmomaniac/sefaria-web-components";
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { bindReaderController } from "@arithmomaniac/sefaria-web-components";
import { loadReaderController } from "@arithmomaniac/sefaria-web-components/reader-controller";

const reader = document.createElement("sefaria-reader");
document.body.append(reader);

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  createSefariaClient(),
);
const unbind = bindReaderController(reader, controller);

window.addEventListener(
  "pagehide",
  () => {
    unbind();
    controller.dispose();
  },
  { once: true },
);
```

Use a component's pure factory when corrected API-shaped JSON has already crossed a validated server, MCP, fixture, stored-data, or user-input boundary. Use its async factory for browser client mode. A successful async result is the same projection as the pure factory over its captured payload.

See [Render text](../../docs/guides/render-text.md) for smaller components, [Reader navigation](../../docs/guides/reader-navigation.md) for packaged versus custom composition, and the [component specification](../../docs/specs/components.md) for exact contracts.
