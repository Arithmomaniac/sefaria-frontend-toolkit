# @sefaria/api-client

## 0.1.0-alpha.0

### Minor Changes

- ef5234a: Expose the source-confirmed Israel/diaspora selector for the parasha topic and remove the misleading `sort_fields` default from the generated search request **schema**. The SDK already passed omitted fields through unchanged, and pagesheetrank weighting has always required an explicit one-element `sort_fields`; now `zSearchPostData.parse` also leaves omitted fields absent instead of inserting `["pagesheetrank"]`. Correct the calendar HTTP 200 response type to distinguish a parasha with a required `ref` from the source-confirmed JSON error for an invalid `diaspora` value. The schema parser's output changes for callers relying on the former search default, and calendar callers now need to narrow the success/error response union.
- 0d11376: > Created/edited by GitHub Copilot; pending human review.

  Transfer toolkit ownership to Sefaria and rename the packages from `@arithmomaniac/sefaria-client`, `@arithmomaniac/sefaria-text-transform`, and `@arithmomaniac/sefaria-web-components` to `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. Update imports and registry scope configuration when migrating. New toolkit releases use the MIT license with copyright Sefaria. Retained older releases keep their original bytes, filenames, and licenses.

  New browser releases use `sefaria-api-client.js` instead of `sefaria-client.js`. All three packages now include standalone browser modules, a toolkit license, and dependency notices under `dist/browser`. npm publication remains deferred. The guarded GitHub Packages bootstrap and Sefaria Pages release paths require hosted qualification before activation.

### Patch Changes

- 04dca3a: Publish self-contained browser ES modules `sefaria-client.js` and `sefaria-text-transform.js` beside `sefaria-elements.js` in each script release.
- 4b2448e: Document client error behavior, cache limits, package summary, and overlay guard reference metadata without changing generated API contracts.
- 0d11376: > Created/edited by GitHub Copilot; pending human review.

  Build each standalone browser module once and reuse its exact packaged bytes for script releases. Validate private build evidence and reject missing or stale inputs instead of rebundling silently. Share CI and first-publication validation and publishing steps while preserving their distinct activation and visibility checks, serialized publication, and verified version output. Retained browser archives and the deferred npm publication policy are unchanged.
