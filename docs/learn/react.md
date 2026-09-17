> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Use the Web Components from React

## Objective

Use React 19 to load one source card explicitly, assign presentation state as custom-element properties, and receive a canonical selection event back into React. The shared controller owns supplied-data validation, loading, cancellation, and stale-result rejection; the binder assigns only the component view model.

This is an integration pattern, not a React wrapper package or toolkit runtime dependency.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load data and handle interaction](03-live-data.md).
- Import `@arithmomaniac/sefaria-web-components` before rendering the custom element.
- Include typed JSX declarations for the properties and event used by the page. The maintained declaration is [`examples/react-vite/src/custom-elements.d.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/custom-elements.d.ts).

```tsx
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-source-card": {
        ref?: Ref<SefariaSourceCard>;
        contentLanguage?: SefariaSourceCard["contentLanguage"];
        vocalizationMode?: SefariaSourceCard["vocalizationMode"];
        selectedPosition?: SefariaSourceCard["selectedPosition"];
        "onsefaria-source-select"?: (
          event: CustomEvent<SourceSelection>,
        ) => void;
      };
    }
  }
}
```

## Try it

Run the maintained app:

```powershell
pnpm dev:react
```

React 19 assigns a JSX prop as a DOM property when the registered custom element exposes that property. This means arrays and view-model objects do not become string attributes. The exact lowercase event prop is significant: `onsefaria-source-select` listens for the emitted `sefaria-source-select` event.

```tsx
const snapshot = useSyncExternalStore(
  (notify) => controller.subscribe(() => notify()),
  () => controller.snapshot,
);
const [selected, setSelected] = useState<SourceSelection>();
const onSourceSelection = useCallback((event: CustomEvent<SourceSelection>) => {
  setSelected({
    position: [...event.detail.position],
    ref: event.detail.ref,
  });
}, []);

return (
  <sefaria-source-card
    contentLanguage={contentLanguage}
    layout={layout}
    sideOrder={sideOrder}
    vocalizationMode={vocalizationMode}
    selectable={snapshot.result?.viewModel.state === "data"}
    selectedPosition={selected?.position}
    onsefaria-source-select={onSourceSelection}
  />
);
```

The element's binder is attached in an effect and removed before the effect-owned controller is disposed. React StrictMode can replay setup and cleanup without retaining a disposed controller or starting a request.

```tsx
useEffect(() => {
  const controller = createSourceCardController(client);
  controller.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
  setController(controller);
  return () => controller.dispose();
}, [client]);

useEffect(() => {
  if (card === null) return;
  return bindSourceCardController(card, controller);
}, [card, controller]);
```

## Expected result

Validated supplied `Micah 6:8` data renders with zero live loads. Submitting the form is the only live activation. A lowercase alias such as `micah 6:8` can produce a committed canonical `Micah 6:8` readout because the page reads the current committed view model rather than echoing the draft input.

Changing displayed sides, layout, side order, width, theme, or any of the three Hebrew vocalization presets preserves the same element and performs zero requests. Selecting the rendered row emits `sefaria-source-select`; React copies the canonical reference and position into host state and assigns the selected position back as a property. If a replacement fails, the prior committed card remains visible with an explicit prior-result label.

<iframe class="example-frame react" title="React custom-element integration" src="../examples/react/index.html"></iframe>

## Who owns what

React owns draft input, explicit activation, presentation properties, selected position, canonical readouts, failure labels, and element placement. The source-card controller owns supplied validation, attempts, cancellation, stale-result rejection, request execution, and projection. The public binder owns only `viewModel` assignment. The request-free element owns rendering and event emission.

## Exercise

Change Hebrew marks from full marks to no marks and back; the text should be reversible without another request. Submit `micah 6:8` and compare the draft input with the canonical committed readout. Select the row and confirm React receives `Micah 6:8` while the `selectedPosition` array remains a property rather than an HTML attribute.

## Source and run links

- [`app.tsx`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/app.tsx)
- [`custom-elements.d.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/custom-elements.d.ts)
- [`app.browser.test.tsx`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/app.browser.test.tsx)
- [React example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/README.md)

## Next step

Compare the same controller and property flow in [Use the Web Components from Alpine](alpine.md), or continue with [Use the controlled Reader or compose a custom host](04-reader.md).
