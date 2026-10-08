> Created/edited by GitHub Copilot; pending human review.

# @sefaria/web-components

Five browser-standard custom elements that show Sefaria texts, each loading by a reference or rendering data you supply.

A community-driven project with Sefaria backing and support. The toolkit is experimental; names and APIs may change.

## Install

```sh
npm install @sefaria/web-components@0.1.0-alpha.0
```

Installation is anonymous; no registry token is needed. Types are included; no `@types` package is needed. The npm `alpha` tag follows reviewed prereleases, while this exact version stays fixed. [Install and status › Packages](https://sefaria.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) covers versions and browser/CDN imports.

## Elements

Import the package root once to register every element: `import "@sefaria/web-components";`. Each element loads by `sref`. Text Segment, Bilingual Segment and Source Card can also render data you supply through their `data` property.

- `<sefaria-text-segment>`: one passage in one edition
- `<sefaria-bilingual-segment>`: one passage in its primary edition with a translation
- `<sefaria-source-card>`: a source with its text and attribution
- `<sefaria-connections-panel>`: the commentaries and other texts connected to a reference
- `<sefaria-reader>`: a passage with its connected texts, and navigation between them

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
