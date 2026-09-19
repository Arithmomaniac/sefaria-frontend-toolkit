> Created/edited by GitHub Copilot; pending human review.

# Popup

Use `<sefaria-popup>` for a source preview anchored to authored prose or another host element. The host supplies the popup view model and anchor; the element handles placement, open state, close behavior, and focus restoration.

## Use it when

Choose the popup for progressive disclosure beside a citation. Use a source card directly when the passage should remain in the page flow, or the Reader when the user needs a complete navigation surface.

## Try it

<PlaygroundEmbed project="popup" title="Edit the popup example" />

The maintained project anchors a supplied Micah 6:8 preview to a citation button. Clicking the anchor opens the popup; Escape closes it and the host status reports that focus was restored. The linked-article example shows the same pattern in authored content:

<SiteLink to="/examples/linked-article/index.html">Open the linked-article popup example</SiteLink>

## Interaction and accessibility

Assign the actual anchor element to `anchor`, set `open` explicitly, and listen for `sefaria-popup-close`. The popup's close path is keyboard accessible and restores focus to the anchor. Keep the anchor in the document's logical reading order and provide a useful label for the citation action. Do not make the popup request data or discover citations from raw text.

## Exact contract and source

- [Generated element properties and close event](../reference/custom-elements.md#sefaria-popup)
- [Authored citation guide](../linked-article.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/popup/)
- [Linked-article source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article/)
- [Popup browser tests](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article/src/)

For request ownership and supplied-data validation, see [How the pieces fit together](../guides/data-flow.md).
