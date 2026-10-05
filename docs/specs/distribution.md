> Created/edited by GitHub Copilot; pending human review.

# Package distribution specification

## Status

This specification defines the Sefaria-owned distribution contract. The ownership migration, first publication under the new package names, and hosted qualification are planned until the rollout steps below complete. Historical publication under the former package scope does not qualify these new identities.

## Package set

The publication set contains exactly:

- `@sefaria/api-client`
- `@sefaria/text-transform`
- `@sefaria/web-components`

The package names are experimental and subject to change. The packages are published only to the npm-format GitHub Packages registry at `https://npm.pkg.github.com`; they are not published on npmjs.com. The separate browser script source specified below provides anonymous loading without installing those packages.

## Browser script source

**Implementation status:** local build and deterministic qualification are implemented, and a P5 release is hosted. New builds produce one self-contained, minified, tree-shaken ES module registering all five remaining elements. Consumers need neither package-registry authentication nor a build step, import map, external runtime dependency, or separate stylesheet. The module preserves the package-root exports and existing element contracts; it does not add source, retry, caching, or rendering policy.

The pinned path is `https://sefaria.github.io/sefaria-frontend-toolkit/cdn/<package-version>/sefaria-elements.js`. The moving path is `https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js`.

```html
<script
  type="module"
  src="https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"
></script>
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

### Data and text-tool modules

**Implementation status:** local build, deterministic qualification, and hosting are implemented. The `alpha` channel and releases since PR #47 serve all three modules. Older pinned releases serve only `sefaria-elements.js`. Builds produce two self-contained, minified ES modules beside `sefaria-elements.js`. Each one re-exports one package root API.

| File                        | Package root              |
| --------------------------- | ------------------------- |
| `sefaria-api-client.js`     | `@sefaria/api-client`     |
| `sefaria-text-transform.js` | `@sefaria/text-transform` |

Browser filenames are independent of scoped package names. New client modules use `sefaria-api-client.js`; retained older releases keep `sefaria-client.js`. `sefaria-elements.js` is named for the elements it registers. The data modules add no source, retry, caching, or transport policy beyond the package root. They run without an import map. Like the elements module, they also run inside an opaque-origin sandboxed `srcdoc` iframe, where Sefaria requests carry `Origin: null`.

```js
import {
  createSefariaClient,
  text,
  validateExternalResponse,
} from "https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-api-client.js";
import {
  normalizeText,
  applyVocalization,
} from "https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-text-transform.js";
```

A module instance is independent: a client module and the elements module do not share a client, cache, or default source. All three modules in a release share one license, notice, source archive, and manifest. Releases retained from before this change keep their elements-only file set.

Each newly published, fully verified synchronized package release automatically receives a script release with the same version and source commit. Partial package publication must not advertise a script release. The package producer's run ID and attempt own the version; a Pages redeployment does not create a version. Historical package releases are not automatically backfilled.

Repeated loading must not throw, including separate evaluations of identical module bytes. Existing definitions win. Loading multiple versions does not replace registered elements, and configuring one module instance does not configure another; mixing versions and their exports is not a supported composition strategy.

### Retention and hosting

The retained P5 pin `0.0.0-alpha.36313907924.1` includes Popup. Removing Popup from new builds does not change that archive or pin; a later successful publication advances `alpha` without rewriting retained releases.

Published versioned files are immutable **while retained**, not permanently available. Maintainers may retire any version at any time without notice. Pinned URLs may consequently stop working. There is no automatic age- or count-based eviction, and a retired version must never be reused.

GitHub Releases hold complete artifact archives. A separate automation-owned, version-controlled catalog records expected hashes, producer identity, and active or retired state. Every deployment restores every active version from its original archive, never by rebuilding old source. Missing or changed active artifacts fail deployment; absence is not retirement. Explicit retirement records a tombstone before a later deployment removes the path. Provider/browser caches may delay visible removal.

The complete assembled site has a conservative publication budget of 1,000,000,000 bytes. Exceeding it blocks upload with measured size and retained-version cleanup candidates; it never triggers automatic retirement. GitHub operations have a fresh 60-second deadline per request, and hosting jobs have explicit outer time limits.

The moving `alpha` directory contains the exact files of the newest active release, ordered by producer run number and attempt rather than completion time. Retiring the newest release selects the next active release. If none remain, no script alias is served and the catalog reports that state.

The supported host is `https://sefaria.github.io/sefaria-frontend-toolkit/`. The ownership migration supersedes the earlier promise to preserve the personal-account Pages location: those URLs are no longer supported. Retained releases keep their original bytes at the Sefaria host. Repository redirects do not preserve old project-site URLs.

### License, source, and size

New releases include the toolkit's MIT license with Sefaria copyright, full required third-party license notices derived from the actual bundled dependency graph, corresponding-source access, and a manifest identifying the exact source commit, dependency versions, and file hashes. Notices cover the union of dependencies bundled by every module. Manifest schema version 3 lists every module with its own measured size and uses `sefaria-api-client.js`. Restoration accepts explicit schema version 1 (elements-only) and version 2 (including `sefaria-client.js`) inventories unchanged. Mixed or unexpected inventories fail validation. Historical GPL releases retain their original license and source obligations. Missing required license or source evidence blocks publication.

The build records raw bytes and gzip bytes with fixed compression settings. Measurement is over the final minified module and is checked against its bytes; it is not a claim about the encoding served by Pages. The initial delivery also records an all-elements versus per-element/shared-chunk comparison, including the complete Source Card dependency closure.

### Script qualification

Required deterministic acceptance uses the actual production artifact on a separate-origin plain HTML host. Only Sefaria HTTP responses may be intercepted with corrected fixtures; custom source, import maps, source aliases, or development transforms cannot substitute for the script path.

Acceptance proves standalone Micah 6:8 rendering, all five registrations and absence of Popup and Reference Label in new builds, duplicate evaluation, exact outer/child request counts, supplied-data behavior, visible validation failure, cross-deploy byte identity, explicit retirement, fail-closed archive restoration, and independently recomputed sizes. For the data and text-tool modules, acceptance proves that each module has no unresolved static or dynamic module specifiers. It also proves that each module imports inside a `sandbox="allow-scripts"` `srcdoc` iframe and exposes its package-root exports. It proves that a client request from that iframe carries `Origin: null`. Local checks stay offline and cannot publish their fixture version.

Hosted delivery additionally requires anonymous loading from the actual Pages URL, correct JavaScript MIME and CORS, matching package identity, accessible notices/source, and preservation of an older active pin after a later deployment. Local workflow tests alone do not establish hosted availability.

## Source and published manifests

Every committed workspace manifest remains `private: true`, uses version `0.0.0`, and retains `workspace:*` for internal toolkit dependencies. This prevents accidental publication from a package directory and preserves workspace resolution.

The publication job builds isolated staged packages. A staged manifest sets `private: false`, sets public access and the GitHub Packages registry in `publishConfig`, replaces each internal `workspace:*` dependency with the exact synchronized release version, and includes only the reviewed built files, package README, root license, and applicable generated metadata.

## Release gate and versioning

Normal publication requires a push to the current `main` head after the complete Linux and Windows validation matrix and fail-closed `check` job succeed. The new rollout gate `SEFARIA_PACKAGES_ENABLED` must equal `true`; an inherited `PUBLIC_PACKAGES_ENABLED` value does not authorize the new namespace. A repository administrator enables the new gate only after all three Sefaria package records are public and correctly linked. The publication job uses repository-scoped `packages: write` and the run's short-lived `GITHUB_TOKEN`; it must not use a long-lived publishing secret.

CI and bootstrap call the same read-only matrix validation workflow and the same package-publication workflow. Each caller retains its fail-closed `check` and explicit main/activation gate. The publication workflow accepts only a required Boolean bootstrap mode, independently enforces that mode's event/main/activation boundary, owns the shared non-cancelable publication concurrency group, and returns the verified producer version. No caller supplies arbitrary commands, registry configuration, or credentials.

### First publication

An explicit main-only bootstrap workflow runs the same complete validation matrix while normal Sefaria publication is disabled. It requires a successful authenticated organization package inventory; an authorization failure or anonymous package-page 404 is not proof that a record is absent. Existing target records must belong to this repository. Bootstrap publishes and verifies an exact synchronized version, including isolated installed-consumer imports, but does not advertise public availability or archive a browser release. It can create initially private records; publish flags do not prove visibility.

A partial attempt is repaired by another explicit attempt with a new version, never by overwriting a version. A Sefaria package administrator confirms or changes visibility and workflow access before a repository administrator enables normal publication. Normal preflight continues to reject absent, private, redirected, or mismatched records.

Every publication uses the immutable prerelease version `0.0.0-alpha.<run-id>.<run-attempt>` and the `alpha` tag. The client publishes first, followed by text transform and Web Components. A failed partial publication is repaired by a later run attempt with a new synchronized version; versions are never overwritten.

## CDN-ready package contents

Each package also ships its corresponding self-contained ES module under `dist/browser`: `sefaria-api-client.js`, `sefaria-text-transform.js`, or `sefaria-elements.js`, with colocated `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`. A clean build produces these before packing or staging. Ordinary package exports and Node-safe subpaths are unchanged. Qualification loads files extracted from real tarballs through a separate-origin static host, without a bundler, import map, workspace fallback, or CDN transformation.

The package build bundles each browser module once and writes private build evidence under `.artifacts`. Script-release assembly copies those exact package bytes rather than bundling again. It validates fingerprints for the build recipe, module inputs, dependency identities/notices, toolkit license, and packaged browser outputs before using the captured dependency graph for combined notices and source archival. Missing, malformed, or stale evidence fails explicitly and never triggers a fallback build. This private handoff is not packed into the packages or added to the public manifest schema. Retained archives are still restored from their original bytes, not from package builds.

Publication on npmjs.com and delivery through npm-backed CDNs are planned, not enabled by preparing these files. A later launch requires Sefaria npm namespace authority, publishing authorization, a release workflow and version policy, and hosted qualification. GitHub organization membership does not establish npm authority. CDN URLs use the npm package name, version, and file path; third-party retention can outlast package deletion and does not inherit the Pages retirement policy.

## Visibility and verification

GitHub package settings own package visibility. A staged manifest or `--access public` command does not prove that an existing record is public.

Immediately before publishing, the job must authenticate to the registry metadata for all three existing package records and verify their names, current valid alpha versions, repository linkage, and exact internal dependency metadata. It must also request each canonical package page without authentication, without following redirects, and require HTTP 200. A missing, private, redirected, unauthorized, rate-limited, or failed package page blocks publication.

After publishing, verification repeats those checks for the new synchronized version. It then installs the exact three versions into an isolated consumer through GitHub Packages, rejects workspace, link, file, or tarball resolution, validates installed manifests and paths, removes staged artifacts and token-referencing configuration, and imports every Node-safe public subpath.

## Consumer authentication

GitHub Packages requires authentication to install public npm-format packages. Consumers configure only the `@sefaria` scope for `https://npm.pkg.github.com` and authenticate with a classic personal access token carrying `read:packages`, or with an authorized repository `GITHUB_TOKEN` in GitHub Actions.

Documentation must never include a token value or imply anonymous installation. It must distinguish npm-compatible package tooling from npmjs.com publication and must identify the synchronized exact alpha version being installed.

## Completion

Public distribution is delivered only after:

1. all three existing package records and their version history are public;
2. the public-visibility preflight passes;
3. a new synchronized `main` prerelease publishes and verifies;
4. an ordinary read-only consumer credential installs and imports the exact release without package-specific private access; and
5. the deployed documentation describes the authenticated GitHub Packages procedure, provisional names, experimental support level, and absence from npmjs.com.
