> Created/edited by GitHub Copilot; pending human review.

# Connections panel

Use `<sefaria-connections-panel>` for grouped connected references, bounded pages, and optional captured previews. The host supplies the current connection view model and decides whether a category, page, preview, or selected reference needs a new operation.

## Use it when

Choose the connections panel when related texts are a supporting surface beside a passage. Use the Reader when connections, source text, history, and navigation belong to one coordinated reading experience.

## Try it

<PlaygroundEmbed project="connections-panel" title="Edit the connections-panel example" />

The maintained project starts with a supplied category summary, enables captured previews, and lets the host hide those previews without changing data. Selecting an entry updates host status; this supplied-data project does not navigate.

Explore the <SiteLink to="/examples/explorer/authored.html?component=connections-panel&amp;scenario=details">detail page with a partial preview</SiteLink> and <SiteLink to="/examples/explorer/authored.html?component=connections-panel&amp;scenario=metadata-only">metadata without previews</SiteLink>.

## Interaction and accessibility

The panel emits events for category changes, page changes, preview requests, and connection selection. Handle those events in the host and provide a new view model when data changes. `showPreviews` only controls captured preview visibility; it is not an implicit request switch. Keep the current category and page visible so keyboard users understand what changed.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-connections-panel)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/connections-panel/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/connections-panel.scenarios.ts)
- [Browser state qualification](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/development-status.browser.test.ts)

For composed navigation and lifecycle, see [Reader navigation and host boundaries](../guides/reader-navigation.md).
