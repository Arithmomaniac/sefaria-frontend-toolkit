# @sefaria-example/mcp-app

## 0.1.0-alpha.1

### Patch Changes

- Updated dependencies
  - @sefaria/web-components@0.1.1-alpha.0
  - @sefaria/api-client@0.1.1-alpha.0

## 0.1.0-alpha.0

### Minor Changes

- 0bf9fea: > Created/edited by GitHub Copilot; pending human review.

  **Breaking (alpha):** remove Reader raw seed input and Connections Panel public `data`. `<sefaria-reader>` no longer has a `data` property, and the root and `./reader` exports no longer include `ReaderRawSeedData`, `ReaderRawSourceSeed`, or `ReaderRawConnectionsSeed`. The `./reader-session` facade no longer accepts raw seed-shaped `{ source: { payload, status, effectiveRequest } }` inputs in `createReaderSession`, `replaceRoot`, or `completeSourceNavigation`; callers must pass admitted `ReaderSessionSeed` records or use element source. `<sefaria-connections-panel>` no longer has a `data` property. Text Segment, Bilingual Segment, and Source Card keep authoritative raw `data` with zero-request rendering.

  To migrate mutable Reader or Connections Panel local data, provide `source={kind: "custom", loader}`. Implement `getText` and `getLinks` from a local corrected-payload map for supported refs, and either throw a clear unsupported-ref error or delegate to a host-proxied loader for unsupported refs. For example, a Reader opened at `Micah 6:8` should serve the target and any requested context such as `getText({ sref: "Micah 6:8" })` and `getText({ sref: "Micah 6" })` and `getLinks({ sref: "Micah 6:8", withText: true })` from local validated payloads without exposing public prepared state or falling back to browser HTTP.

### Patch Changes

- Updated dependencies [b8d3f12]
- Updated dependencies [04dca3a]
- Updated dependencies [7aea91f]
- Updated dependencies [6744943]
- Updated dependencies [0544704]
- Updated dependencies [ef5234a]
- Updated dependencies [eaf8d76]
- Updated dependencies [4b2448e]
- Updated dependencies [0bf9fea]
- Updated dependencies [1b6ece3]
- Updated dependencies [2a4f62f]
- Updated dependencies [64deb6d]
- Updated dependencies [0d11376]
- Updated dependencies [0d11376]
- Updated dependencies [372fcef]
- Updated dependencies [b17eda8]
  - @sefaria/web-components@0.1.0-alpha.0
  - @sefaria/api-client@0.1.0-alpha.0
