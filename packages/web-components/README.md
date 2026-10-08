> Created/edited by GitHub Copilot; pending human review.

# @sefaria/web-components

Five browser-standard custom elements that show Sefaria texts, each loading by a reference or rendering data you supply.

A community-driven project with Sefaria backing and support. The toolkit is experimental; names and APIs may change.

## Install

Public npm release `0.1.1-alpha.0` is prepared but remains pending hosted qualification. After release, installation is anonymous and needs no GitHub token. Types are included; no `@types` package is needed. [Install and status › Packages](https://sefaria.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) owns current availability and exact-version installation guidance.

## Elements

Import the package root once to register every element: `import "@sefaria/web-components";`. Each element loads by `sref`. Text Segment, Bilingual Segment and Source Card can also render data you supply through their `data` property.

- `<sefaria-text-segment>`: one passage in one edition
- `<sefaria-bilingual-segment>`: one passage in its primary edition with a translation
- `<sefaria-source-card>`: a source with its text and attribution
- `<sefaria-connections-panel>`: the commentaries and other texts connected to a reference
- `<sefaria-reader>`: a passage with its connected texts, and navigation between them

Text Segment uses one optional `language` for original or translated text, such as `hebrew` or `french`. Omit it for Sefaria's primary edition. `version-title` chooses an exact edition; `translation-fallback` separately controls missing-language fallback and defaults to `none`. In the next alpha, this replaces Text Segment's former `version-language` and `translation-language` inputs without aliases. Two-sided components retain `translation-language` for their translation side.

## First success

<!-- Snippet owner: examples/site-snippets/source-card-package.ts. Keep this block identical. -->

```ts
import "@sefaria/web-components";

// Importing the package root registers every element.
const card = document.createElement("sefaria-source-card");
card.setAttribute("sref", "Micah 6:8");
document.body.append(card);
```

## Next steps

- [Use components](https://sefaria.github.io/sefaria-frontend-toolkit/use-components/start-here.html)
- [Use with a framework](https://sefaria.github.io/sefaria-frontend-toolkit/use-components/use-with-a-framework.html)
- [Give components your own data](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/give-components-your-own-data.html)
- [Components reference](https://sefaria.github.io/sefaria-frontend-toolkit/reference/components.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/web-components/IMPLEMENTATION.md).
