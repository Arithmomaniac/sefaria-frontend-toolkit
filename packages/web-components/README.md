> Created/edited by GitHub Copilot; pending human review.

# @arithmomaniac/sefaria-web-components

Six browser-standard custom elements that show Sefaria texts, each loading by a reference or rendering data you supply.

Experimental and unofficial. Names and addresses may change. This is not an official Sefaria product.

## Install

The packages are prereleases on GitHub Packages, not npmjs.com. GitHub Packages asks for a token even to download public packages. Add this to your user-level `.npmrc`, using a GitHub personal access token (classic) with `read:packages` in `NODE_AUTH_TOKEN`:

```ini
@arithmomaniac:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Types are included; no `@types` package is needed. [Install and status](https://arithmomaniac.github.io/sefaria-frontend-toolkit/help/install-and-status.html) has the install command and the choices.

## Elements

Import the package root once to register every element: `import "@arithmomaniac/sefaria-web-components";`. Each element loads by `sref` or renders data you supply through its `data` property.

- `<sefaria-ref-label>`: a reference's English and Hebrew names
- `<sefaria-text-segment>`: one passage in one edition
- `<sefaria-bilingual-segment>`: one passage in its primary edition with a translation
- `<sefaria-source-card>`: a source with its text and attribution
- `<sefaria-connections-panel>`: the commentaries and other texts connected to a reference
- `<sefaria-reader>`: a passage with its connected texts, and navigation between them

## First success

<!-- Snippet owner: examples/site-snippets/source-card-package.ts. Keep this block identical. -->

```ts
import "@arithmomaniac/sefaria-web-components";

// Importing the package root registers every element.
const card = document.createElement("sefaria-source-card");
card.setAttribute("sref", "Micah 6:8");
document.body.append(card);
```

## Next steps

- [Use components](https://arithmomaniac.github.io/sefaria-frontend-toolkit/use-components/start-here.html)
- [Use with a framework](https://arithmomaniac.github.io/sefaria-frontend-toolkit/use-components/use-with-a-framework.html)
- [Give components your own data](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/give-components-your-own-data.html)
- [Components reference](https://arithmomaniac.github.io/sefaria-frontend-toolkit/reference/components.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/IMPLEMENTATION.md).
