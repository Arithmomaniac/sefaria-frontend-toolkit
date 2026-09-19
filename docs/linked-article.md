> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

The linked-article example starts with ordinary authored Sefaria anchors and progressively enhances eligible activation with the request-free `<sefaria-popup>` component. The author marks each citation explicitly, and the page owns popup loading and cleanup.

## Try it

<SiteLink to="/examples/linked-article/index.html">Open the hosted linked article</SiteLink>. The maintained article uses the bounded `Micah 6:8` reference. Opening the page makes no Sefaria request; clicking the citation or focusing it and pressing Enter starts the live popup request.

## Author the native link

```html
<a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">
  Micah 6:8
</a>
```

The `href` is the native authority. With JavaScript disabled, modifier navigation, an alternate target, a download link, or a non-primary pointer activation, the browser retains ordinary anchor behavior. The explicit `data-sefaria-ref` is input only to the page enhancement.

## Own the enhancement in the page

[`examples/linked-article/src/app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/linked-article/src/app.ts) creates a cache-disabled `@arithmomaniac/sefaria-client`, calls `loadPopupViewModel`, supplies loading and terminal component view models to one `<sefaria-popup>`, aborts superseded work, rejects obsolete completions, reports rejected integration operations outside the element, and removes only its owned listeners, accessibility attributes, request, popup, and status state during cleanup.

The element receives only the popup view model, the authored anchor used for placement/focus restoration, and the open property. It receives no reference, payload, client, host, or fetch function.

## Theming

The current popup defaults to a Sefaria-inspired parchment, berry, serif, and dark-mode palette. It inherits the embedding document's `color-scheme`, and hosts can override `--sefaria-surface`, `--sefaria-surface-muted`, `--sefaria-fg`, `--sefaria-fg-muted`, `--sefaria-border`, `--sefaria-border-strong`, `--sefaria-accent`, `--sefaria-accent-soft`, `--sefaria-danger`, `--sefaria-link`, `--sefaria-shadow`, `--sefaria-font-english`, and `--sefaria-font-hebrew` on any ancestor.

The popup's shadow DOM prevents ordinary host selectors from styling its internal dialog. Popup rules do not style the authored anchor; the article owns its own link and focus presentation.
