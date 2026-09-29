> Created/edited by GitHub Copilot; pending human review.

# @arithmomaniac/sefaria-text-transform

Makes Sefaria's HTML safe to display and prepares vowels and footnotes, with no UI and no network. Run `normalizeText` first: it sanitizes. `applyVocalizationToHtml` does not sanitize, and `createTextPreview` normalizes its input itself.

Experimental and unofficial. Names and addresses may change. This is not an official Sefaria product.

## Install

The packages are prereleases on GitHub Packages, not npmjs.com. GitHub Packages asks for a token even to download public packages. Add this to your user-level `.npmrc`, using a GitHub personal access token (classic) with `read:packages` in `NODE_AUTH_TOKEN`:

```ini
@arithmomaniac:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Types are included; no `@types` package is needed. [Install and status](https://arithmomaniac.github.io/sefaria-frontend-toolkit/help/install-and-status.html) has the install command and the choices.

## First success

<!-- Snippet owner: examples/site-snippets/text-transform-first-success.ts. Keep this block identical. -->

```ts
import {
  applyVocalizationToHtml,
  normalizeText,
} from "@arithmomaniac/sefaria-text-transform";

// Sefaria text you already have, for example from a file or a database.
const stored =
  'הִגִּ֥יד לְךָ֛ אָדָ֖ם מַה־טּ֑וֹב <span class="mam-spi-samekh" onclick="alert(1)">{ס}</span>';

// 1. Make the markup safe first.
const { bodyHtml } = normalizeText(stored);

// 2. Then remove the cantillation marks and keep the vowels.
const withVowels = applyVocalizationToHtml(bodyHtml, "nikkud");

console.log(bodyHtml);
console.log(withVowels);
```

## Next steps

- [Use the data and text tools](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/start-here.html)
- [Clean up stored Sefaria text](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/clean-up-stored-sefaria-text.html)
- [Clean text and safety](https://arithmomaniac.github.io/sefaria-frontend-toolkit/concepts/clean-text-and-safety.html)
- [Text transform reference](https://arithmomaniac.github.io/sefaria-frontend-toolkit/reference/text-transform.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/IMPLEMENTATION.md).
