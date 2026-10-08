---
"@sefaria/web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

**Breaking (alpha):** Text Segment now uses one optional `language` attribute/property for original or translated text. Omit it to select Sefaria's primary edition. Replace Text Segment `version-language` / `versionLanguage` or `translation-language` / `translationLanguage` with `language`, and DOM-free `version.translationLanguage` with `version.language`. No deprecated aliases are retained. `translation-fallback` now applies to `language`; its default remains `none`, and exact edition titles never fall back. Language values remain full family names such as `french`, not short codes. Other components retain `translation-language` for their translation side.
