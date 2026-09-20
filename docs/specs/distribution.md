> Created/edited by GitHub Copilot; pending human review.

# Package distribution specification

## Status

This specification defines the current public prerelease distribution contract. The three existing package records are public, and synchronized release `0.0.0-alpha.35489617787.2` passed hosted publication and installed-consumer qualification on September 20, 2026.

## Package set

The publication set contains exactly:

- `@arithmomaniac/sefaria-client`
- `@arithmomaniac/sefaria-text-transform`
- `@arithmomaniac/sefaria-web-components`

The package names are experimental and subject to change. The packages are published only to the npm-format GitHub Packages registry at `https://npm.pkg.github.com`; they are not published on npmjs.com and have no supported CDN distribution.

## Source and published manifests

Every committed workspace manifest remains `private: true`, uses version `0.0.0`, and retains `workspace:*` for internal toolkit dependencies. This prevents accidental publication from a package directory and preserves workspace resolution.

The publication job builds isolated staged packages. A staged manifest sets `private: false`, sets public access and the GitHub Packages registry in `publishConfig`, replaces each internal `workspace:*` dependency with the exact synchronized release version, and includes only the reviewed built files, package README, root license, and applicable generated metadata.

## Release gate and versioning

Only a push to the current `main` head may publish, after the complete Linux and Windows validation matrix and fail-closed `check` job succeed. The one-time rollout gate `PUBLIC_PACKAGES_ENABLED` must also equal `true`; it remains unset while the new workflow lands and is enabled only after all three existing package records are public. The publication job uses repository-scoped `packages: write` and the run's short-lived `GITHUB_TOKEN`; it must not use a long-lived publishing secret.

Every publication uses the immutable prerelease version `0.0.0-alpha.<run-id>.<run-attempt>` and the `alpha` tag. The client publishes first, followed by text transform and Web Components. A failed partial publication is repaired by a later run attempt with a new synchronized version; versions are never overwritten.

## Visibility and verification

GitHub package settings own package visibility. A staged manifest or `--access public` command does not prove that an existing record is public.

Immediately before publishing, the job must authenticate to the registry metadata for all three existing package records and verify their names, current valid alpha versions, repository linkage, and exact internal dependency metadata. It must also request each canonical package page without authentication, without following redirects, and require HTTP 200. A missing, private, redirected, unauthorized, rate-limited, or failed package page blocks publication.

After publishing, verification repeats those checks for the new synchronized version. It then installs the exact three versions into an isolated consumer through GitHub Packages, rejects workspace, link, file, or tarball resolution, validates installed manifests and paths, removes staged artifacts and token-referencing configuration, and imports every Node-safe public subpath.

## Consumer authentication

GitHub Packages requires authentication to install public npm-format packages. Consumers configure only the `@arithmomaniac` scope for `https://npm.pkg.github.com` and authenticate with a classic personal access token carrying `read:packages`, or with an authorized repository `GITHUB_TOKEN` in GitHub Actions.

Documentation must never include a token value or imply anonymous installation. It must distinguish npm-compatible package tooling from npmjs.com publication and must identify the synchronized exact alpha version being installed.

## Completion

Public distribution is delivered only after:

1. all three existing package records and their version history are public;
2. the public-visibility preflight passes;
3. a new synchronized `main` prerelease publishes and verifies;
4. an ordinary read-only consumer credential installs and imports the exact release without package-specific private access; and
5. the deployed documentation describes the authenticated GitHub Packages procedure, provisional names, experimental support level, and absence from npmjs.com.
