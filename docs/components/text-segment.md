> Created/edited by GitHub Copilot; pending human review.

# Text segment

Use `<sefaria-text-segment>` for one selected text edition. Assign component-specific raw `data` for zero-request rendering or `sref` for standalone loading. The element owns validation, selection, safe private preparation, direction, markup, footnotes, and status.

## Use it when

Choose this surface when the surrounding layout already owns the reference heading, attribution, and controls.

## Try it

<PlaygroundEmbed project="text-segment" title="Edit the text-segment example" />

The supplied project switches between Hebrew and English selected data. `vocalizationMode` changes display without requesting again. With only `sref`, the element uses the documented primary-version default; language-family and exact-version properties refine selection.

## Interaction and accessibility

The element emits no data-action events. Current acquisition or validation failures emit `sefaria-text-segment-error` and remain accessible through read-only status. Direction comes from the selected version, not a host-wide language assumption.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-text-segment)
- [Render-text guide](../guides/render-text.md)
- [Text-markup guide](../guides/text-markup.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/text-segment/)
