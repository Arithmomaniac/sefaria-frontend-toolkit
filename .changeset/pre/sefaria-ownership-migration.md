---
"@sefaria/api-client": minor
"@sefaria/text-transform": minor
"@sefaria/web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

Transfer toolkit ownership to Sefaria and rename the packages from `@arithmomaniac/sefaria-client`, `@arithmomaniac/sefaria-text-transform`, and `@arithmomaniac/sefaria-web-components` to `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. Update imports and registry scope configuration when migrating. New toolkit releases use the MIT license with copyright Sefaria. Retained older releases keep their original bytes, filenames, and licenses.

New browser releases use `sefaria-api-client.js` instead of `sefaria-client.js`. All three packages now include standalone browser modules, a toolkit license, and dependency notices under `dist/browser`. npm publication remains deferred. The guarded GitHub Packages bootstrap and Sefaria Pages release paths require hosted qualification before activation.
