> Created/edited by GitHub Copilot; pending human review.

# 4. Use the Reader or compose a custom host

## Objective

Choose the supported controlled Reader when its navigation model fits, and understand the additional responsibilities you accept when composing spatial source and connections panes yourself.

The controlled Reader is the shortest complete path. The toolkit supplies its controller, factories, and element; the host provides the starting reference and data access, binds the controller, and cleans up. You do not implement source selection, connection navigation, cancellation, Back, or breadcrumbs from scratch.

## Prerequisites

- A modern browser.
- Decide whether your host needs a complete stateful Reader or custom pane placement.

## Try it

Open the <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">controlled Reader</SiteLink> for the supported controller path or the <SiteLink to="/examples/reader/index.html?tref=Micah%206%3A8">spatial Reader</SiteLink> for application-owned pane composition. Both wait for **Start live demo** before requesting Sefaria data.

The supported integration creates the browser client, loads a controller once, binds it to one persistent element, and disposes both:

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindReaderController } from "@arithmomaniac/sefaria-web-components/bindings";
import { loadReaderController } from "@arithmomaniac/sefaria-web-components/reader-controller";

const element = document.createElement("sefaria-reader");
document.body.append(element);

const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  createSefariaClient({ cache: false }),
);
const unbind = bindReaderController(element, controller);

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

## Expected result

- **Embedded supplied-data Reader:** editing and following a covered Micah connection uses only the project's saved text and links. A target outside that saved data reports `source-unavailable`; it does not make a request or pretend that the target has no text.
- **Controlled live Reader:** the toolkit controller manages Back, breadcrumbs, cancellation, and source-to-connections navigation. During a new root load, `rootLoading` keeps the last successful Reader visible. If the exact requested text is already in the current validated response, the controller reuses it instead of requesting the source again.
- **Spatial live example:** the host places and removes multiple panes itself. It also owns which pane is active, the compact layout, pins, limits, and operation timing.

<PlaygroundEmbed project="reader" title="Edit the finite supplied-data Reader" />

The same Reader presentation can run with different data paths. A regular website controller can use `@arithmomaniac/sefaria-client`; an MCP App controller uses host-mediated tools because the sandbox cannot make the same direct requests. In both cases the element receives rendering data and emits events rather than fetching.

The routes only prefill their `?tref=` values and make no Sefaria request before activation.

## Who owns what

| Choice | Toolkit owns | Host additionally owns |
| --- | --- | --- |
| Controlled Reader | Controller state, navigation, captures, cancellation, binding to the request-free Reader element | Starting reference, client, lifecycle, and placement |
| Spatial composition | Reusable reader session, data source, factories, view models, and elements | Ordered panes, parent/child placement, compact active pane, pruning, pins, cancellation, and visible limits |

The spatial example is a distinct option, not a second supported all-purpose Reader API. Do not copy its private pane coordinator into the component package.

For finite-capture limits, unavailable targets, request failures, and cleanup, use the [troubleshooting guide](../guides/troubleshooting.md).

## Exercise

In the embedded Reader, change HTML or CSS and choose **Run**. Follow a covered Micah connection, then choose a target outside the supplied capture and confirm that the explicit unavailable message leaves the committed Reader visible. In the controlled live Reader, use Back and submit another reference; confirm that the element stays mounted while its breadcrumb trail starts over.

## Source and run links

- Hosted controlled Reader: <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">open example</SiteLink>
- Hosted spatial Reader: <SiteLink to="/examples/reader/index.html?tref=Micah%206%3A8">open example</SiteLink>
- Full editor: <SiteLink to="/examples/playground/index.html?project=reader">reader project</SiteLink>
- Maintained editor source: [`examples/playground/projects/reader/`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/reader)
- Controlled source: [`examples/reader/src/controlled-app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/reader/src/controlled-app.ts)
- Spatial source: [`examples/reader/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/reader/src/app.ts)
- Repository design notes: [Reader navigation and host ownership](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/guides/reader-navigation.md)

## Next step

Continue to [Customize presentation and use headless APIs](05-customization.md).
