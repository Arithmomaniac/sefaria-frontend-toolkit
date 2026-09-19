> Created/edited by GitHub Copilot; pending human review.

# Bilingual segment

Use `<sefaria-bilingual-segment>` for one aligned primary-and-translation pair. The element handles the pair's layout, side visibility, side order, direction, and vocalization over a supplied view model.

## Use it when

Choose this surface when the product needs one short aligned pair inside its own page or card. Use a source card for a passage or range with attribution and optional item selection; use the bilingual segment when the host already owns that surrounding structure.

## Try it

<PlaygroundEmbed project="bilingual-segment" title="Edit the bilingual-segment example" />

The maintained project changes `sideOrder` without replacing data. It demonstrates that presentation controls remain host-owned:

- `contentLanguage` chooses the visible roles.
- `layout` chooses the requested arrangement.
- `sideOrder` chooses which role appears first in a side-by-side layout.
- `vocalizationMode` changes displayed Hebrew presentation.

The <SiteLink to="/examples/explorer/authored.html?component=bilingual-segment&amp;scenario=partial">authored state explorer</SiteLink> includes data, loading, partial, empty, and projection-error states.

## Interaction and accessibility

The element emits no events. Each side retains the direction from its view model, so a bilingual layout can contain RTL Hebrew and LTR translation without the host rewriting either side. A partial state is an explicit missing-side result; do not replace it with an empty string or silently shift the remaining side.

## Exact contract and source

- [Generated element properties](../reference/custom-elements.md#sefaria-bilingual-segment)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/bilingual-segment/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/bilingual-segment.scenarios.ts)

For the request-free boundary and pure factory path, see [How the pieces fit together](../guides/data-flow.md).
