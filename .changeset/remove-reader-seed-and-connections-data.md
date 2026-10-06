---
"@sefaria/web-components": minor
"@sefaria-example/mcp-app": minor
---

> Created/edited by GitHub Copilot; pending human review.

**Breaking (alpha):** remove Reader raw seed input and Connections Panel public `data`. `<sefaria-reader>` no longer has a `data` property, and the root and `./reader` exports no longer include `ReaderRawSeedData`, `ReaderRawSourceSeed`, or `ReaderRawConnectionsSeed`. The `./reader-session` facade no longer accepts raw seed-shaped `{ source: { payload, status, effectiveRequest } }` inputs in `createReaderSession`, `replaceRoot`, or `completeSourceNavigation`; callers must pass admitted `ReaderSessionSeed` records or use element source. `<sefaria-connections-panel>` no longer has a `data` property. Text Segment, Bilingual Segment, and Source Card keep authoritative raw `data` with zero-request rendering.

To migrate mutable Reader or Connections Panel local data, provide `source={kind: "custom", loader}`. Implement `getText` and `getLinks` from a local corrected-payload map for supported refs, and either throw a clear unsupported-ref error or delegate to a host-proxied loader for unsupported refs. For example, a Reader opened at `Micah 6:8` should serve the target and any requested context such as `getText({ sref: "Micah 6:8" })` and `getText({ sref: "Micah 6" })` and `getLinks({ sref: "Micah 6:8", withText: true })` from local validated payloads without exposing public prepared state or falling back to browser HTTP.
