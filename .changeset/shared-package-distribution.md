---
"@sefaria/api-client": patch
"@sefaria/text-transform": patch
"@sefaria/web-components": patch
---

> Created/edited by GitHub Copilot; pending human review.

Build each standalone browser module once and reuse its exact packaged bytes for script releases. Validate private build evidence and reject missing or stale inputs instead of rebundling silently. Share CI and first-publication validation and publishing steps while preserving their distinct activation and visibility checks, serialized publication, and verified version output. Retained browser archives and the deferred npm publication policy are unchanged.
