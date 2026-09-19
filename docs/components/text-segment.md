> Created/edited by GitHub Copilot; pending human review.

# Text segment

Use `<sefaria-text-segment>` for one prepared text edition. The host supplies a text-segment view model; the element renders its direction, safe markup, and prepared footnotes without requesting data.

## Use it when

Choose this surface when your layout already owns the reference heading, edition choice, and surrounding controls. It is the smallest text surface for one primary or translation edition.

## Try it

<PlaygroundEmbed project="text-segment" title="Edit the text-segment example" />

The maintained project switches between the supplied Hebrew and English editions. The host assigns `vocalizationMode` to change presentation over the existing view model:

- `taamim_and_nikkud` keeps cantillation and vowel marks.
- `nikkud` keeps vowel marks without cantillation.
- `none` removes vocalization from displayed Hebrew.

The authored data, empty, loading, and projection-error states are available in the <SiteLink to="/examples/explorer/authored.html?component=text-segment&amp;scenario=data">component state explorer</SiteLink>.

## Interaction and accessibility

This element emits no events. The view model supplies the text direction, so a host should not force every segment into one global direction. Footnote markers and notes are prepared data, not arbitrary HTML that the element should sanitize again. Keep the reference and edition context outside the segment when the reader needs that information.

## Exact contract and source

- [Generated element properties](../reference/custom-elements.md#sefaria-text-segment)
- [Render-text guide](../guides/render-text.md)
- [Text-markup guide](../guides/text-markup.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/text-segment/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/text-segment.scenarios.ts)

For the surrounding validation and factory path, see [Render supplied data](../learn/02-supplied-data.md).
