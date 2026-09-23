> Created/edited by GitHub Copilot; pending human review.

# Reference label

Use `<sefaria-ref-label>` for a canonical English or Hebrew reference heading. Assign raw `data` for a supplied result or `sref` for standalone resolution.

## Try it

<PlaygroundEmbed project="ref-label" title="Edit the reference-label example" />

Set `linked` when the label should use the resolved canonical URL. Set `labelLanguage` for English or Hebrew labels. Invalid supplied data remains authoritative and never falls through to `sref`.

## Interaction and accessibility

The element has no custom data-action event. Current failures emit `sefaria-ref-label-error`. A linked resolved state is an ordinary accessible link.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-ref-label)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/ref-label/)
