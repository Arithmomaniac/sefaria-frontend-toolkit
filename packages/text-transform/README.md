> Created/edited by GitHub Copilot; pending human review.

<!-- npm-release-version: 0.1.0-alpha.0 -->

# @sefaria/text-transform

Makes Sefaria's HTML safe to display and prepares vowels and footnotes, with no UI and no network. Run `normalizeText` first: it sanitizes. `applyVocalizationToHtml` does not sanitize, and `createTextPreview` normalizes its input itself.

A community-driven project with Sefaria backing and support. The toolkit is experimental; names and APIs may change.

## Install

```sh
npm install @sefaria/text-transform@0.1.0-alpha.0
```

Installation is anonymous; no registry token is needed. Types are included; no `@types` package is needed. The npm `alpha` tag follows reviewed prereleases, while this exact version stays fixed. [Install and status › Packages](https://sefaria.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) covers versions and browser/CDN imports.

## First success

<!-- Snippet owner: examples/site-snippets/text-transform-first-success.ts. Keep this block identical. -->

```ts
import {
  applyVocalizationToHtml,
  normalizeText,
} from "@sefaria/text-transform";

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

- [Use the data and text tools](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/start-here.html)
- [Clean up stored Sefaria text](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/clean-up-stored-sefaria-text.html)
- [Clean text and safety](https://sefaria.github.io/sefaria-frontend-toolkit/concepts/clean-text-and-safety.html)
- [Text transform reference](https://sefaria.github.io/sefaria-frontend-toolkit/reference/text-transform.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/text-transform/IMPLEMENTATION.md).
