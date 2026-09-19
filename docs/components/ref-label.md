> Created/edited by GitHub Copilot; pending human review.

# Reference label

Use `<sefaria-ref-label>` for a canonical English or Hebrew reference heading. It can remain plain text or become a link when the resolved view model contains a canonical Sefaria URL.

## Use it when

Choose the reference label for a heading, citation, or compact result label. It is smaller and less opinionated than a source card: it does not render passage text, editions, or selection controls.

## Try it

<PlaygroundEmbed project="ref-label" title="Edit the reference-label example" />

The maintained project switches between a resolved reference and an endpoint-reported unresolved state. Set `linked` when the host wants the data-state label to render as the supplied canonical link. Set `labelLanguage` when the surrounding interface needs Hebrew labels instead of English labels.

The supplied-data authored states also show loading, empty, and HTTP-error outcomes:

- <SiteLink to="/examples/explorer/authored.html?component=ref-label&amp;scenario=data">Open the resolved label</SiteLink>
- <SiteLink to="/examples/explorer/authored.html?component=ref-label&amp;scenario=empty">Open the unresolved label</SiteLink>
- <SiteLink to="/examples/explorer/authored.html?component=ref-label&amp;scenario=error">Open the error label</SiteLink>

## Interaction and accessibility

The element has no custom events. With `linked={false}`, it is display text. With `linked={true}` and a data-state view model, the result is a normal link, so the host should preserve ordinary keyboard activation and link context. Do not invent a request or resolve a reference in the element; the host or controller supplies the view model.

## Exact contract and source

- [Generated element properties](../reference/custom-elements.md#sefaria-ref-label)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/ref-label/)
- [Authored states](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/ref-label.scenarios.ts)
- [Browser state qualification](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/development-status.browser.test.ts)

For a complete request and validation path, continue to [Render supplied data](../learn/02-supplied-data.md). Use the generated reference for exact property types.
