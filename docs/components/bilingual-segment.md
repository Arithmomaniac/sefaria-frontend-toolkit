> Created/edited by GitHub Copilot; pending human review.

# Bilingual segment

Use `<sefaria-bilingual-segment>` for one aligned primary-and-translation pair. Assign raw `data` for supplied rendering or `sref` for standalone loading.

## Use it when

Choose this surface when the host already owns heading and attribution. Use a Source Card for a passage or range.

## Try it

<PlaygroundEmbed project="bilingual-segment" title="Edit the bilingual-segment example" />

`contentLanguage`, `layout`, `sideOrder`, and `vocalizationMode` are presentation-only. The element resolves payload-owned roles and directions, and partial data remains an explicit one-sided result.

## Interaction and accessibility

The element emits no data-action events. Current failures emit `sefaria-bilingual-segment-error`. Supplied and acquired paths use the same private preparation.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-bilingual-segment)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/bilingual-segment/)
- [Data-flow guide](../guides/data-flow.md)
