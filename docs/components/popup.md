> Created/edited by GitHub Copilot; pending human review.

# Popup

Use `<sefaria-popup>` for a source preview anchored to authored prose. Assign supplied raw `data` or standalone `sref`, plus `anchor` and `open`.

## Try it

<PlaygroundEmbed project="popup" title="Edit the popup example" />

The maintained project uses supplied `Micah 6:8` data. The linked-article example assigns `sref` only after eligible citation activation.

## Interaction and lifecycle

`open` controls visibility, not preparation eligibility. A connected Popup can prepare `sref` while closed; hiding alone does not start, restart, or cancel work. Activation-gated hosts assign and clear `sref` according to host policy.

Listen for `sefaria-popup-close` and `sefaria-popup-error`. Escape closes the popup and restores focus to the anchor.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-popup)
- [Authored citation guide](../linked-article.md)
- [Linked-article source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article/)
