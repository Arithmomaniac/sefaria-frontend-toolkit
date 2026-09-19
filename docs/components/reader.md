> Created/edited by GitHub Copilot; pending human review.

# Reader

Use `<sefaria-reader>` for a coordinated reading surface with source text, connections, compact-pane controls, retained history, and host-owned actions. The element is request-free; the supplied Reader controller owns navigation state and the host owns the permitted data source.

## Use it when

Choose the Reader when users need to read a passage, inspect connections, move through related entries, and return through semantic history. Choose smaller components when the product needs only one passage, citation popup, or connections panel.

## Try it

<PlaygroundEmbed project="reader" title="Edit the supplied-data Reader example" />

The maintained project is deliberately finite: it covers supplied Micah 6:8 source and connection data. Unsupported navigation reports `source-unavailable` instead of inventing empty content or fetching unexpectedly. For a controlled live path, open the [Reader lesson](../learn/04-reader.md#try-it) or the <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">controlled Reader example</SiteLink>; live activation remains explicit.

The Reader view model can expose source and connections together or one side at a time. Host presentation properties include `activePane`, `contentLanguage`, `layout`, `sideOrder`, `showConnectionPreviews`, `rootLoading`, `chatExport`, and `vocalizationMode`.

The authored explorer includes <SiteLink to="/examples/explorer/authored.html?component=reader&amp;scenario=paired">paired content</SiteLink>, <SiteLink to="/examples/explorer/authored.html?component=reader&amp;scenario=connections-loading">connections loading</SiteLink>, and <SiteLink to="/examples/explorer/authored.html?component=reader&amp;scenario=truncated-history">truncated history</SiteLink>.

## Interaction and accessibility

The Reader emits semantic events for Back, retained-history activation, pane changes, chat export, source selection, connection categories, connection pages, connection selection, and preview requests. The host handles the event, performs any permitted operation, and supplies the next view model. Use `rootLoading` to show a root operation without replacing committed content.

For custom compositions, preserve the Reader's focusable history and pane controls, explicit failure states, and cancellation behavior. Do not scrape private DOM events or replace the supplied Reader state machine with a second navigation model.

## Exact contract and source

- [Generated element properties, events, slots, and parts](../reference/custom-elements.md#sefaria-reader)
- [Use the Reader](../learn/04-reader.md)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/reader/)
- [Controlled Reader source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/reader.scenarios.ts)

Start with the [controlled Reader controller](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/packages/web-components/) when the supplied finite project is not enough for the product's navigation policy.
