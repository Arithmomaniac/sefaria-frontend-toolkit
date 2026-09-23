> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from Alpine

## Objective

Render supplied Source Card data first, switch to standalone `sref` after explicit activation, and receive the canonical selection event with Alpine.

## Try it

Keep scalar inputs as Alpine host state. Assign the rich supplied payload and acquisition source as properties during attachment:

```ts
return {
  sref: "",
  attach(element: SefariaSourceCard) {
    element.data = suppliedPayload;
    element.acquisition = { kind: "client", client };
  },
  load(element: SefariaSourceCard) {
    const next = this.tref.trim();
    if (next.length === 0) return;
    element.data = undefined;
    element.setAttribute("sref", next);
    this.sref = next;
  },
  destroy(element: SefariaSourceCard) {
    element.data = undefined;
    this.sref = "";
    element.acquisition = { kind: "disabled" };
  },
};
```

```html
<sefaria-source-card
  x-init="attach($el)"
  :sref="sref"
  :content-language="contentLanguage"
  :layout="layout"
  :side-order="sideOrder"
  :vocalization-mode="vocalizationMode"
  :selectable="selectable"
  x-effect="$el.selectedPosition = selectedPosition === undefined ? undefined : [...selectedPosition]"
  @sefaria-source-select="selectSource($event)"
></sefaria-source-card>
```

## Expected result

Supplied `Micah 6:8` data renders with zero requests. Form submission clears authoritative data and updates the `sref` attribute. The element owns acquisition and lifecycle; Alpine owns draft input, presentation, host status, and event handling.

Changing scalar presentation attributes makes zero requests. The small property effect exists only for the array-valued `selectedPosition`; destroy cleanup clears property-only inputs and disables acquisition.

<iframe class="example-frame" title="Alpine custom-element integration" src="../examples/alpine/index.html"></iframe>

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load live data](03-live-data.md).

## Who owns what

Alpine owns form state, activation, presentation, selection, and host status. The element owns acquisition, lifecycle, private preparation, and rendering.

## Exercise

Change vocalization modes and confirm the scalar attribute updates while rich values remain properties.

## Source and run links

- [`source-card-example.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/src/source-card-example.ts)
- [`index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/index.html)
- [Alpine example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/README.md)

## Next step

Continue to [Reader](04-reader.md).
