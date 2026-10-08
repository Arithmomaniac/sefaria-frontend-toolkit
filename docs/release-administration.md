> Created/edited by GitHub Copilot; pending human review.

# Release administration

Sefaria Frontend Toolkit uses public numbered npm releases and packaged browser files delivered by jsDelivr and UNPKG. Engineering owns exact package assets and qualification; Sefaria administrators own npm access and GitHub approval. This guide is the setup and recovery reference, not evidence that provider setup or a publishing path has passed. Read [Evidence](evidence.md#conditional-post-launch-documentation) for the launch record and [Development](development.md#numbered-npm-releases) for commands.

## GitHub approval

In `Sefaria/sefaria-frontend-toolkit`, maintain the `npm-release` environment with the designated `engineering-sefaria` reviewer and only a Branch rule for `main`. Allow self-review and leave normal administrator bypass available. Confirm setup during administration; the workflow relies on GitHub's native approval rather than checking protection settings through an API on every run. Leave `github-pages` unchanged. Do not add an npm token secret or enable a package-publishing variable.

## npm ownership and first publisher

Confirm Sefaria controls the `sefaria` npm organization and can publish `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. GitHub ownership does not establish npm ownership. Identify an authorized Sefaria npm maintainer with 2FA and access to view/download the draft GitHub Release. Avi needs no npm membership; share no credentials.

The initial publication procedure uses `0.1.0-alpha.0` under `alpha`. After separate authorization, engineering prepares one source-bound draft and provides its exact link, verified filenames, checksums and `MAINTAINER-COMMANDS.ps1`. The maintainer downloads the actual `.tgz` assets and runs those commands with their own account/2FA in client, text-transform, web-components order. No clone/build/repack or file transfer from Avi is needed. Automatic GitHub source archives are not package assets. Partial publication preserves the draft for explicit integrity-confirmed recovery.

The complete release has exactly six assets: `sefaria-api-client-0.1.0-alpha.0.tgz`, `sefaria-text-transform-0.1.0-alpha.0.tgz`, `sefaria-web-components-0.1.0-alpha.0.tgz`, `release-manifest.json`, `SHA256SUMS.txt` and `MAINTAINER-COMMANDS.ps1`. For later versions, use the filenames in their manifest and generated commands. Never republish the initial version or replace its assets to include later README edits.

## Later trusted publishing

After the package identities exist, configure each package's trusted publisher for organization `Sefaria`, repository `sefaria-frontend-toolkit`, caller `release-npm.yml`, environment `npm-release`, and permission for direct `npm publish` rather than stage-only publication. Verify this path before disallowing traditional tokens. Only the approved publication job receives temporary OIDC credentials.

Trusted publishing remains separately unqualified until an authorized hosted run proves the exact caller and native approval path. Do not treat the first maintainer publication or a reported configuration change as that proof.

## Verification and delivery

Use `verify-finalize` after maintainer publication. The same draft becomes public only after all three exact npm records, dependencies, integrity and an anonymous installed consumer verify. The public initial release URL is `https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v0.1.0-alpha.0`. Alpha is a prerelease and is not deliberately promoted to `latest`; npm's first-package tag behavior must be observed, not assumed.

Run the read-only npm and dual-CDN commands from Development against the original captured assets. jsDelivr is primary and UNPKG is the alternative; no separate CDN account or upload is needed. Consumer documentation deployment requires both hosts' exact bytes, MIME/CORS, notices and actual browser imports to qualify. Pages remains the documentation/example host, and retained Pages CDN archives are restored unchanged. Their retirement is a separate explicitly authorized operation, not part of publishing npm or updating documentation.

Report environment protection, npm ownership, publisher/draft access and qualification outcomes to engineering without sharing credentials. No GitHub Packages setup, personal Avi npm access or shared publishing secret is required.
