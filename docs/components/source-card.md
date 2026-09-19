> Created/edited by GitHub Copilot; pending human review.

# Source card

Use `<sefaria-source-card>` for a passage or short range with reference details, edition attribution, aligned text, and optional item selection. The host supplies the view model and decides whether a selection should trigger another action.

## Use it when

Choose the source card when a product needs a bounded passage with enough context to identify its source. Use a text segment for one edition without card-level attribution, or the Reader when users need navigation and connections.

## Try it

<PlaygroundEmbed project="source-card" title="Edit the source-card example" />

The maintained project supplies Micah 6:8, enables selection, and changes vocalization without a request. The source-card-specific controls are:

- `selectable` enables selection for items with canonical targets.
- `selectedPosition` identifies the original item position path.
- `showAddressLabels` controls compact address labels.
- `contentLanguage`, `layout`, `sideOrder`, and `vocalizationMode` change presentation over the supplied model.

The element emits `sefaria-source-select` with the selected reference and position. The host receives that event and chooses what to do next; the element does not fetch a new passage.

Use the authored explorer for a <SiteLink to="/examples/explorer/authored.html?component=source-card&amp;scenario=many-items">multi-item selectable card</SiteLink>, a <SiteLink to="/examples/explorer/authored.html?component=source-card&amp;scenario=one-sided">one-sided item</SiteLink>, and the <SiteLink to="/examples/explorer/authored.html?component=source-card&amp;scenario=error">projection-error state</SiteLink>.

## Interaction and accessibility

Selection is opt-in. Keep `selectedPosition` as the view-model position path rather than deriving a reference from an array index. Preserve the component's generated selection controls and status updates; do not query its shadow DOM. For live data, use the maintained controller or async factory and keep pending, committed, and failed states distinct.

## Exact contract and source

- [Generated element properties and event](../reference/custom-elements.md#sefaria-source-card)
- [Load data and handle interaction](../learn/03-live-data.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/source-card/)
- [Maintained vanilla controller host](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/source-card.scenarios.ts)

For exact controller and factory types, use the [source-card package README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md).
