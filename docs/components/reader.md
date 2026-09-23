> Created/edited by GitHub Copilot; pending human review.

# Reader

Use `<sefaria-reader>` for source text, connections, responsive panes, semantic history, and host-owned actions. Assign `sref` for the ordinary standalone path. Reader raw seeds initialize or transactionally replace state.

## Try it

<PlaygroundEmbed project="reader" title="Edit the supplied-data Reader example" />

The supplied project has finite `Micah 6:8` source and links coverage. The live page assigns `sref` only after **Start live demo**:

<SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open the standalone Reader</SiteLink>.

## Diagnostics and advanced hosts

Read-only `status`, `rootLoading`, `selectedRef`, `currentEntryId`, and `readerError` expose semantic diagnostics without exposing private prepared state. Reader error events preserve current failures.

Advanced spatial hosts use the supported `reader-session` semantic/raw facade for history, pins, budgets, `entryInfo`, stable raw source/connections records, and raw transitions. The `reader` subpath supplies shared raw source qualification. Neither exposes prepared rendering/content or owns DOM placement.

## Customization

The `toolbar-actions` slot is additive. The documented parts are `toolbar`, `history`, `source-pane`, and `connections-pane`. Read a host action's target from `reader.selectedRef` when it activates.

## Exact contract and source

- [Generated element properties, events, slots, and parts](../reference/custom-elements.md#sefaria-reader)
- [Reader lesson](../learn/04-reader.md)
- [Reader navigation guide](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/guides/reader-navigation.md)
- [Standalone Reader source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader/)
