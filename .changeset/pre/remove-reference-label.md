---
"@sefaria/web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

**Breaking (alpha):** remove the Reference Label element. `<sefaria-ref-label>` is no longer registered, and the root exports `SefariaRefLabel`, `RefLabelLanguage`, and `RefLabelRequest`, the `./ref-label` subpath, the `sefaria-ref-label-error` event, and the unused `resolveReference` member of `SefariaDataLoader` (with `SefariaReferenceDataSourceRequest`) are removed. The script-tag module no longer registers the tag, so an existing `<sefaria-ref-label>` on a page using the moving `cdn/alpha` URL stays an unrendered unknown element; pages pinned to an earlier `cdn/<version>` are unaffected. Source Card still shows its English and Hebrew heading, now from a private template built from its own text response, with no extra request. For a citation link, use an ordinary anchor such as `<a href="https://www.sefaria.org/Micah.6.8">Micah 6:8</a>`; for a passage with its heading, use Source Card.
