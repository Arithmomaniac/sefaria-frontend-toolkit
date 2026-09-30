---
"@arithmomaniac/sefaria-web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

**Breaking (alpha):** remove standalone edition attribution from `<sefaria-text-segment>` and `<sefaria-bilingual-segment>`. Both elements no longer render a compact `versionTitle (languageFamilyName, actualLanguage)` line, no longer render the "X is unavailable; showing Y" translation-fallback notice, and no longer accept the `hideAttributions`/`hide-attributions` property. `TextSegmentDataViewModel` drops its segment-only `edition` and `unavailableTranslationLanguage` fields; supplied `data` consumers that read those fields must stop doing so. Source Card and Reader are unaffected: they keep their own independent `hideAttributions`/`hide-attributions` property, their own attribution rendering (including the translation-fallback notice), and continue to display attribution for nested Text Segment/Bilingual Segment content they compose. For attribution alongside a passage, use Source Card or Reader; for a standalone segment, attribution and any fallback notice must now come from the surrounding host.
