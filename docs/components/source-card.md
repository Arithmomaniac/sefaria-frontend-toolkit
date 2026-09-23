> Created/edited by GitHub Copilot; pending human review.

# Source card

Use `<sefaria-source-card>` for a passage or range with heading, edition attribution, aligned text, and optional item selection. Assign raw `data` for supplied rendering or `sref` for standalone loading.

## Try it

<PlaygroundEmbed project="source-card" title="Edit the source-card example" />

The supplied project uses `Micah 6:8`. `selectable`, `selectedPosition`, `showAddressLabels`, `contentLanguage`, `layout`, `sideOrder`, and `vocalizationMode` remain public interaction or presentation properties.

## Interaction and composition

`sefaria-source-select` reports the selected canonical reference and position. Current failures emit `sefaria-source-card-error`.

The card owns one outer response and privately prepares all child pairs. It never assigns child `sref`; ten rendered items remain one outer request and zero child requests.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-source-card)
- [Load live data](../learn/03-live-data.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/source-card/)
- [Maintained vanilla host](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite/)
