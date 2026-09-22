> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from React

## Objective

Render supplied Source Card data first, switch to standalone `sref` after explicit activation, and receive the canonical selection event in React 19.

## Prerequisites

- Import `@arithmomaniac/sefaria-web-components` before rendering the tag.
- Include typed JSX declarations for `data`, `sref`, `acquisition`, presentation properties, and `onsefaria-source-select`.

## Try it

Keep raw data and the live reference as ordinary React state:

```tsx
const [data, setData] = useState<CoreV3TextsResponse | undefined>(
  suppliedPayload,
);
const [sref, setSref] = useState("");

function onSubmit(event: FormEvent) {
  event.preventDefault();
  setData(undefined);
  setSref(tref.trim());
}

return (
  <sefaria-source-card
    data={data}
    sref={sref}
    acquisition={acquisition}
    contentLanguage={contentLanguage}
    layout={layout}
    sideOrder={sideOrder}
    vocalizationMode={vocalizationMode}
    selectable
    selectedPosition={selected?.position}
    onsefaria-source-select={onSourceSelection}
  />
);
```

React 19 assigns registered custom-element properties directly, so arrays and raw data remain JavaScript values rather than string attributes. Keep a stable explicit acquisition object and stable element identity.

## Expected result

Validated supplied `Micah 6:8` data renders with zero live loads. Form submission is the only live activation. The element owns acquisition, cancellation, stale suppression, private preparation, status, and errors. React owns draft input, presentation, selected position, host readouts, and placement.

Changing theme, width, visible sides, layout, side order, or vocalization performs zero requests. `sefaria-source-select` returns the canonical reference and position.

<iframe class="example-frame react" title="React custom-element integration" src="../examples/react/index.html"></iframe>

## Who owns what

React owns draft input, activation, presentation, selection, and placement. The element owns acquisition, cancellation, private preparation, rendering, and events.

## Exercise

Switch vocalization modes without changing the live-attempt count.

## Source and run links

- [`app.tsx`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/app.tsx)
- [`custom-elements.d.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/custom-elements.d.ts)
- [React example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/README.md)

## Next step

Continue to [Reader](04-reader.md).
