> Created/edited by GitHub Copilot; pending human review.

# Package distribution specification

## Status and package set

The ownership migration is implemented. Public npm publication and npm-backed CDN delivery remain pending external qualification. The publication set is exactly `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`, synchronized by Changesets. The initial requested release is `0.1.0-alpha.0` under `alpha`. Stable releases require a later reviewed version decision and use `latest`. Prereleases must not deliberately advance `latest`; npm's first-package tag behavior must be observed rather than promising that another tag is absent.

The only maintained package publication target is public npm at `https://registry.npmjs.org`. There is no GitHub Packages bootstrap, publisher, registry credential, inventory/visibility gate, activation flag, or development snapshot. Ordinary main/PR CI performs complete shared Linux/Windows validation and fail-closed aggregation and publishes neither packages nor browser archives, regardless of legacy variable values. Pages remains the documentation/example website.

## Version and artifact authority

Committed library manifests remain `private: true`, carry reviewed synchronized numbered versions, and retain `workspace:*` internal dependencies. Version preparation uses the installed pinned Changesets CLI, preserving pending descriptions except normal CLI consumption. It creates no automatic commit or source tag. Actual pending Changesets input, not only a synthetic rehearsal, must produce the requested initial version.

Release preparation checks the exact reviewed main source SHA, consumed Changesets state, and all three source versions. Ordinary CI tarball qualification permits pending Changesets while validating the current synchronized private manifests; pending release notes are not a release authorization. Isolated public staging rewrites internal dependencies to that exact version, sets public npm publication intent, and includes only reviewed built files, README, license and applicable generated metadata. It builds once, then packs and qualifies three actual `.tgz` npm packages. Source directories remain private.

One reproducible, bounded JSON manifest binds schema version, full source SHA, synchronized version, intended dist-tag, ordered package identities, filenames, sizes, SHA-256, SHA-512/SRI, exact dependencies, and browser-file/license/notice digests. No timestamps, run-derived versions, credentials, arbitrary registry, command, or destination inputs are allowed. Reject unknown/duplicate/missing package entries, unexpected assets, path escapes, excessive sizes, malformed JSON, mismatched versions/dependencies, and source-archive substitution. Qualification uses actual tarballs, every public subpath, Node-safe imports, browser modules and framework consumers. Missing evidence is a failure, not permission to rebuild silently.

## Draft GitHub Release handoff

The top-level manual caller is `release-npm.yml`, with only `prepare`, `publish`, and `verify-finalize` operations. Preparation builds and validates read-only, then a separate `contents: write` job creates or finds one draft release for `v<version>` at the exact source SHA. Its complete asset set contains the three qualified npm tarballs, manifest, checksums and exact maintainer commands. These are uploaded package assets, not GitHub-generated source archives. Preparation receives no npm OIDC or permanent npm token.

Validate any existing source tag against the source SHA; never move a tag. Repeat preparation reuses matching assets; an incomplete draft may receive only missing originally qualified assets. Conflicting source, tag, version, names or bytes fail and are never overwritten. Verify downloaded assets byte-for-byte after upload. Publication captures and validates those exact assets before approval and publishes them without building, bundling, packing or reselecting release assets after approval.

The initial authorized Sefaria npm maintainer downloads the draft assets, verifies checksums and publishes in client, text-transform, web-components order with their own account/2FA. They need draft access and npm publishing rights, not a clone/build or manual file transfer from Avi. Avi needs no npm membership. Generated commands identify the actual draft, exact filenames, npm target, public access and correct tag.

## Approval and recovery

All operations are manual, main-only, GitHub-hosted, and serialized without canceling publication. Inputs must match actual reviewed source/version state. Linux and Windows must qualify the same source. Administrators configure `npm-release` with a designated Sefaria required reviewer and a selected `main` branch rule, and confirm that configuration during setup. Self-review and normal administrator bypass are allowed. Publication and finalization rely on GitHub's native environment approval rather than a custom per-run protection-settings API guard. Merely naming an environment does not establish protection. Administrators own setup and subsequent configuration changes; engineering cannot infer or configure them.

Later automated publication uses pinned supported Node >=22.14.0 and npm >=11.5.1, the protected `npm-release` environment and job-scoped `id-token: write`. No permanent token fallback or ambient npm credentials are accepted. Trusted publishing binds `Sefaria/sefaria-frontend-toolkit`, caller `release-npm.yml`, environment `npm-release`, and explicit direct `npm publish` permission. Build/validation/registry verification jobs have no release-writing or OIDC permission; only draft-assets and finalization jobs have `contents: write`. The draft-assets job owns both preparation upload and GET-only capture before approval, because GitHub requires push access to see drafts. Capture itself creates or changes no release or asset. The publisher retains only `contents: read` and OIDC.

Anonymous metadata and tarball verification distinguish explicit HTTP 404 absence from authentication, rate limits, invalid JSON, network and abort failures. No automatic retry or success-shaped fallback is allowed. Explicit resume may skip an existing version only after its repository, exact internal dependency map, registry tarball bytes and integrity match the captured artifacts. Any conflict stops. A partial publish preserves the draft and all recovery assets. A rerun never invents a new version or overwrites a published one.

After all three exact npm records, dependencies, tarball integrity and an isolated anonymous installed consumer verify, a separate release-writing job finalizes the same complete draft. No premature announcement, replacement assets or additions after finalization are allowed. Alpha releases are prereleases and are explicitly not latest. Finalization must revalidate source/tag/asset identity and require completed verification. Existing correctly finalized releases may be verified idempotently; conflicts remain failures.

## Browser modules and npm CDNs

Each package contains its self-contained minified module under `dist/browser`: `sefaria-api-client.js`, `sefaria-text-transform.js`, or `sefaria-elements.js`, with `LICENSE.txt` and full `THIRD-PARTY-NOTICES.txt`. The elements module registers the five remaining elements; duplicate evaluation preserves existing definitions. The modules preserve package APIs and introduce no component, transport, caching or source behavior. No bundler, transformation, import map, external runtime dependency, stylesheet, or runtime CDN fallback is required.

jsDelivr is primary; UNPKG is the alternative. Planned URLs use exact package versions and direct files, for example `https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js` and `https://unpkg.com/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js`. All three modules require independent verification. Do not advertise these URLs as live before qualification.

Offline checks use bounded fixtures and real packed bytes, standalone separate-origin browser loading and opaque `sandbox="allow-scripts"` imports. They prove package-root exports, registrations, duplicate evaluation, Micah 6:8 rendering, exact request counts, supplied-data behavior, visible validation failures, notices and recomputed hashes/sizes in Chromium, Firefox and WebKit. Explicit read-only hosted commands separately check anonymous npm installation, both CDN hosts, exact bytes (not only HTTP 200), MIME/CORS, notices and actual browser imports. CDN lag is pending evidence, not permission to transform or substitute another source. Add browser-path exports only if actual export-map qualification requires them, with ordinary export regressions.

## Preserved Pages CDN and gated cutover

During pre-publication engineering, retain existing Pages CDN restoration and all historical archives/licenses/catalog state unchanged. No new script snapshot is automatically archived. The supported legacy host remains `https://sefaria.github.io/sefaria-frontend-toolkit/cdn/<version>/`; the moving `alpha` alias selects the newest active original archive by producer run/attempt. Retained P5 `0.0.0-alpha.36313907924.1` includes Popup; historical schema-1 elements-only and schema-2 `sefaria-client.js` inventories remain unchanged. New build schema 3 uses `sefaria-api-client.js`.

Active records restore from original GitHub Release archives, never rebuilt source. Missing or changed active archives fail deployment; absence is not retirement. Restoration accepts only explicit supported inventories. Private browser-build evidence fingerprints recipe, inputs, dependency notices, license and outputs; script assembly copies those exact bytes and fails on missing/stale evidence without rebundling. Historical GPL archives retain their original license and source obligations.

The assembled site remains bounded to 1,000,000,000 bytes, with explicit cleanup candidates and no automatic retirement. GitHub requests have fresh 60-second deadlines and hosting jobs have outer limits. Package browser modules retain raw/gzip measurement and full actual bundled-dependency notices.

Only after all three public npm packages and both CDN paths qualify may a separately reviewed and explicitly authorized cutover update public URL/generator owners and retire every active Pages CDN record through catalog tombstones. Preserve historical archive bytes, licenses, provenance and tombstones. Then remove Pages-only assembly, restoration/retirement hooks and obsolete archive code, carrying useful browser qualification into package tests and updating test-disposition evidence. Prove the deployed website remains healthy and legacy module paths are no longer served, allowing ordinary provider caching. Repository redirects do not preserve former personal Pages URLs, and retirement cannot purge third-party CDN caches.

## Completion boundaries

Offline engineering completion establishes tested npm-only staging, real reproducible assets, exact draft handoff/recovery/finalization, validation-only CI and administrator guidance. It does not establish npm ownership, provider protection, trusted publishing, draft access, hosted publication or CDN availability.

Hosted publication completion requires Sefaria npm ownership, an authorized initial publisher, matching downloadable draft assets, all three verified npm records and finalization of the same release. Full migration additionally requires actual dual-CDN qualification, separately reviewed URL cutover, authorized Pages retirement and deployed website proof. These externally owned phases remain pending until observed.
