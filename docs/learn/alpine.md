> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from Alpine

## Objective

Use Alpine 3 as a light declarative host for the same source-card controller, binder, properties, and canonical selection event as the vanilla and React paths. Keep the controller outside Alpine's reactive proxy and keep requests out of the custom element.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load data and handle interaction](03-live-data.md).
- Use the maintained Alpine app, which includes the required framework and toolkit dependencies.

## Try it

Use the embedded maintained app below or <SiteLink to="/examples/alpine/index.html">open it directly</SiteLink>.

The data provider creates the source-card controller in a closure. Alpine receives only plain host state and methods, so its proxy never wraps the controller's private fields.

```ts
export function createAlpineSourceCardExample(client: SefariaClient) {
  const controller = createSourceCardController(client);
  controller.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
  let host;
  let unbind;
  let unsubscribe;

  return {
    contentLanguage: "both",
    vocalizationMode: "taamim_and_nikkud",
    selectedPosition: undefined,
    attach(element: SefariaSourceCard, reactiveState) {
      host = reactiveState;
      unbind = bindSourceCardController(element, controller);
      unsubscribe = controller.subscribe((snapshot) => {
        host.status = describe(snapshot);
      });
    },
    destroy() {
      unsubscribe?.();
      unbind?.();
      controller.dispose();
    },
  };
}
```

The element is registered before `Alpine.start()`. Alpine binds after the element exists, and an element-local effect assigns values as DOM properties. The selected-position array is copied across the proxy boundary. `x-bind` is not used to serialize a view model or request into an attribute.

```html
<sefaria-source-card
  x-init="$nextTick(() => attach($el, $data))"
  x-effect="syncCard($el, contentLanguage, layout, sideOrder, vocalizationMode, selectable, selectedPosition)"
  @sefaria-source-select="selectSource($event)"
></sefaria-source-card>
```

## Expected result

Validated supplied `Micah 6:8` data renders with zero live loads. Submitting the form calls the supplied public client through the source-card controller. Alpine displays the canonical reference from the current committed view model and displays the canonical reference emitted by the selected component row.

Changing displayed sides, layout, side order, width, theme, or Hebrew vocalization performs zero requests. A failed replacement keeps the previous committed card visible with an explicit prior-result label. Alpine's `destroy` lifecycle removes the binding and subscription and disposes pending controller work.

<iframe class="example-frame" title="Alpine custom-element integration" src="../examples/alpine/index.html"></iframe>

## Who owns what

Alpine owns form state, explicit activation, presentation properties, selected position, canonical readouts, failure labels, and declarative event handling. The closure-owned controller owns supplied validation, loading, cancellation, stale-result rejection, request execution, and projection. The binder owns only `viewModel` assignment. The element remains request-free.

## Exercise

Submit `micah 6:8` and confirm the committed readout is canonical `Micah 6:8`. Change all three Hebrew-mark presets and confirm the load-attempt count does not change. Select the rendered row and confirm Alpine receives the canonical reference while the selected-position array is absent from the element's HTML attributes.

## Source and run links

- [`source-card-example.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/src/source-card-example.ts)
- [`index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/index.html)
- [`source-card-example.browser.test.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/src/source-card-example.browser.test.ts)
- [Alpine example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/README.md)

## Next step

Continue with [Use the controlled Reader or compose a custom host](04-reader.md).
