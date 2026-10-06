---
"@sefaria/web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

Source Card and Reader edition attribution now shows one language name, the canonical language-family name used by `translation-language` and `version-language`: `(hebrew)` instead of `(hebrew, he)`. **Breaking (alpha):** `SourceCardAttributionViewModel` no longer has an `actualLanguage` field; supplied `data` consumers that set or read it must stop doing so.
