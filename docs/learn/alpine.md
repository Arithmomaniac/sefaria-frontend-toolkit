> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from Alpine

## Objective

Render supplied Source Card data first, switch to standalone `sref` after explicit activation, and receive the canonical selection event with Alpine.

## Try it

Keep component inputs as Alpine host state and assign rich values as properties:

```ts
return {
  data: suppliedPayload,
  sref: "",
  acquisition: { kind: "client", client },
  load() {
    const next = this.tref.trim();
    if (next.length === 0) return;
    this.data = undefined;
    this.sref = next;
  },
  destroy(element: SefariaSourceCard) {
    element.data = undefined;
    element.sref = "";
    element.acquisition = { kind: "disabled" };
  },
};
```

```html
<sefaria-source-card
  x-effect="syncCard($el, data, sref, acquisition, contentLanguage, layout, sideOrder, vocalizationMode, selectedPosition)"
  @sefaria-source-select="selectSource($event)"
></sefaria-source-card>
```

## Expected result

Supplied `Micah 6:8` data renders with zero requests. Form submission clears authoritative data and assigns `sref`. The element owns acquisition and lifecycle; Alpine owns draft input, presentation, host status, and event handling.

Changing presentation makes zero requests. Destroy cleanup clears owned inputs and disables acquisition.

<iframe class="example-frame" title="Alpine custom-element integration" src="../examples/alpine/index.html"></iframe>

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load live data](03-live-data.md).

## Who owns what

Alpine owns form state, activation, presentation, selection, and host status. The element owns acquisition, lifecycle, private preparation, and rendering.

## Exercise

Change vocalization modes and confirm rich values remain properties.

## Source and run links

- [`source-card-example.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/src/source-card-example.ts)
- [`index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/index.html)
- [Alpine example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/alpine-vite/README.md)

## Next step

Continue to [Reader](04-reader.md).
