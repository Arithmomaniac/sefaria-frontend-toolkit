---
"@sefaria/web-components": patch
---

> Created/edited by GitHub Copilot; pending human review.

Replace internal jargon in reader-facing messages. Connections panel previews now read "No English text." and "No Hebrew text.", and its non-`Error` preparation fallback reads "Connections could not be displayed.". A standalone selectable Source Card now labels verse buttons "Select <ref>"; the Reader keeps "Show connections for <ref>" for its inner card through private preparation. Add a browser regression test that a mouse-clicked Connections category button keeps focus on the same element without matching `:focus-visible`.
