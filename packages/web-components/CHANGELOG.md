# @sefaria/web-components

## 0.1.1-alpha.0

### Minor Changes

- > Created/edited by GitHub Copilot; pending human review.

  **Breaking (alpha):** Text Segment now uses one optional `language` attribute/property for original or translated text. Omit it to select Sefaria's primary edition. Replace Text Segment `version-language` / `versionLanguage` or `translation-language` / `translationLanguage` with `language`, and DOM-free `version.translationLanguage` with `version.language`. No deprecated aliases are retained. `translation-fallback` now applies to `language`; its default remains `none`, and exact edition titles never fall back. Language values remain full family names such as `french`, not short codes. Other components retain `translation-language` for their translation side.

### Patch Changes

- @sefaria/api-client@0.1.1-alpha.0
  - @sefaria/text-transform@0.1.1-alpha.0

## 0.1.0-alpha.0

### Minor Changes

- b8d3f12: > Created/edited by GitHub Copilot; pending human review.

  Add declarative standalone `sref` loading and authoritative supplied-data inputs to all seven public elements, normalize removed optional string attributes back to absent selectors, replace public prepared-state orchestration with raw and semantic boundaries, and migrate the maintained examples, integrations, documentation, and generated metadata.

- 7aea91f: > Created/edited by GitHub Copilot; pending human review.

  Replace separate sanitization and footnote extraction with one deterministic text-normalization contract, canonical Sefaria metadata spans, semantic and content-preserving Masorah markup, and render-ready footnote records.

- 0544704: Add the `translation-fallback` attribute and property so Text Segment, Bilingual Segment, Source Card, and Reader can disable default translation fallback when a preferred translation family is unavailable.
- 0bf9fea: > Created/edited by GitHub Copilot; pending human review.

  **Breaking (alpha):** remove Reader raw seed input and Connections Panel public `data`. `<sefaria-reader>` no longer has a `data` property, and the root and `./reader` exports no longer include `ReaderRawSeedData`, `ReaderRawSourceSeed`, or `ReaderRawConnectionsSeed`. The `./reader-session` facade no longer accepts raw seed-shaped `{ source: { payload, status, effectiveRequest } }` inputs in `createReaderSession`, `replaceRoot`, or `completeSourceNavigation`; callers must pass admitted `ReaderSessionSeed` records or use element source. `<sefaria-connections-panel>` no longer has a `data` property. Text Segment, Bilingual Segment, and Source Card keep authoritative raw `data` with zero-request rendering.

  To migrate mutable Reader or Connections Panel local data, provide `source={kind: "custom", loader}`. Implement `getText` and `getLinks` from a local corrected-payload map for supported refs, and either throw a clear unsupported-ref error or delegate to a host-proxied loader for unsupported refs. For example, a Reader opened at `Micah 6:8` should serve the target and any requested context such as `getText({ sref: "Micah 6:8" })` and `getText({ sref: "Micah 6" })` and `getLinks({ sref: "Micah 6:8", withText: true })` from local validated payloads without exposing public prepared state or falling back to browser HTTP.

- 1b6ece3: > Created/edited by GitHub Copilot; pending human review.

  **Breaking (alpha):** remove the Reference Label element. `<sefaria-ref-label>` is no longer registered, and the root exports `SefariaRefLabel`, `RefLabelLanguage`, and `RefLabelRequest`, the `./ref-label` subpath, the `sefaria-ref-label-error` event, and the unused `resolveReference` member of `SefariaDataLoader` (with `SefariaReferenceDataSourceRequest`) are removed. The script-tag module no longer registers the tag, so an existing `<sefaria-ref-label>` on a page using the moving `cdn/alpha` URL stays an unrendered unknown element; pages pinned to an earlier `cdn/<version>` are unaffected. Source Card still shows its English and Hebrew heading, now from a private template built from its own text response, with no extra request. For a citation link, use an ordinary anchor such as `<a href="https://www.sefaria.org/Micah.6.8">Micah 6:8</a>`; for a passage with its heading, use Source Card.

- 2a4f62f: > Created/edited by GitHub Copilot; pending human review.

  **Breaking (alpha):** remove standalone edition attribution from `<sefaria-text-segment>` and `<sefaria-bilingual-segment>`. Both elements no longer render a compact `versionTitle (languageFamilyName, actualLanguage)` line, no longer render the "X is unavailable; showing Y" translation-fallback notice, and no longer accept the `hideAttributions`/`hide-attributions` property. `TextSegmentDataViewModel` drops its segment-only `edition` and `unavailableTranslationLanguage` fields; supplied `data` consumers that read those fields must stop doing so. Source Card and Reader are unaffected: they keep their own independent `hideAttributions`/`hide-attributions` property, their own attribution rendering (including the translation-fallback notice), and continue to display attribution for nested Text Segment/Bilingual Segment content they compose. For attribution alongside a passage, use Source Card or Reader; for a standalone segment, attribution and any fallback notice must now come from the surrounding host.

- 64deb6d: > Created/edited by GitHub Copilot; pending human review.

  Rename the standalone loading API from acquisition terms to data-source terms with no compatibility aliases.

  | Old | New |
  | --- | --- |
  | element `acquisition` property | `source` property |
  | `SefariaAcquisition` | `SefariaDataSource` |
  | `kind: "capability"` | `kind: "custom"` |
  | `capability` field | `loader` field |
  | `SefariaAcquisitionCapability` | `SefariaDataLoader` |
  | `SefariaAcquisitionResponse` | `SefariaDataLoaderResponse` |
  | `SefariaTextAcquisitionRequest` | `SefariaTextLoadRequest` |
  | `SefariaLinksAcquisitionRequest` | `SefariaLinksLoadRequest` |
  | `configureSefariaAcquisition` | `configureSefariaDataSource` |
  | `@arithmomaniac/sefaria-web-components/acquisition` | `@arithmomaniac/sefaria-web-components/data-source` |
  | `ReaderDataSource` | `ReaderRecordLoader` |
  | `createSefariaReaderDataSource` | `createSefariaReaderRecordLoader` |
  | MCP `createMcpReaderAcquisition` | MCP `createMcpReaderSource` |

- 0d11376: > Created/edited by GitHub Copilot; pending human review.

  Transfer toolkit ownership to Sefaria and rename the packages from `@arithmomaniac/sefaria-client`, `@arithmomaniac/sefaria-text-transform`, and `@arithmomaniac/sefaria-web-components` to `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. Update imports and registry scope configuration when migrating. New toolkit releases use the MIT license with copyright Sefaria. Retained older releases keep their original bytes, filenames, and licenses.

  New browser releases use `sefaria-api-client.js` instead of `sefaria-client.js`. All three packages now include standalone browser modules, a toolkit license, and dependency notices under `dist/browser`. npm publication remains deferred. The guarded GitHub Packages bootstrap and Sefaria Pages release paths require hosted qualification before activation.

- 372fcef: > Created/edited by GitHub Copilot; pending human review.

  Source Card and Reader edition attribution now shows one language name, the canonical language-family name used by `translation-language` and `version-language`: `(hebrew)` instead of `(hebrew, he)`. **Breaking (alpha):** `SourceCardAttributionViewModel` no longer has an `actualLanguage` field; supplied `data` consumers that set or read it must stop doing so.

- b17eda8: `<sefaria-text-segment>` now defaults to a transparent background. Set `--sefaria-surface` on the element or an ancestor to tint it. Other elements keep the tinted default surface.

### Patch Changes

- 6744943: > Created/edited by GitHub Copilot; pending human review.

  Replace internal jargon in reader-facing messages. Connections panel previews now read "No English text." and "No Hebrew text.", and its non-`Error` preparation fallback reads "Connections could not be displayed.". A standalone selectable Source Card now labels verse buttons "Select <ref>"; the Reader keeps "Show connections for <ref>" for its inner card through private preparation. Add a browser regression test that a mouse-clicked Connections category button keeps focus on the same element without matching `:focus-visible`.

- eaf8d76: Move element reference prose into source JSDoc so custom element metadata includes summaries, data and empty-state notes, event descriptions, event details, and cancelability.
- 0d11376: > Created/edited by GitHub Copilot; pending human review.

  Build each standalone browser module once and reuse its exact packaged bytes for script releases. Validate private build evidence and reject missing or stale inputs instead of rebundling silently. Share CI and first-publication validation and publishing steps while preserving their distinct activation and visibility checks, serialized publication, and verified version output. Retained browser archives and the deferred npm publication policy are unchanged.

- Updated dependencies [04dca3a]
- Updated dependencies [7aea91f]
- Updated dependencies [ef5234a]
- Updated dependencies [4b2448e]
- Updated dependencies [4b2448e]
- Updated dependencies [0d11376]
- Updated dependencies [0d11376]
  - @sefaria/api-client@0.1.0-alpha.0
  - @sefaria/text-transform@0.1.0-alpha.0
