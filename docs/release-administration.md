> Created/edited by GitHub Copilot; pending human review.

# Release administration

Sefaria Frontend Toolkit is preparing public numbered npm releases and browser delivery through jsDelivr and UNPKG. Engineering prepares verified package assets; administration establishes ownership and approval. Hosted launch remains pending.

## GitHub approval

In `Sefaria/sefaria-frontend-toolkit`, configure the `npm-release` environment with the designated Sefaria release approver and only a Branch rule for `main`. Allow self-review and leave normal administrator bypass available. Confirm setup once; the workflow relies on GitHub's native approval rather than checking protection settings through an API on every run. Leave `github-pages` unchanged. Do not add an npm token secret or enable a package-publishing variable.

## npm ownership and first publisher

Confirm Sefaria controls the `sefaria` npm organization and can publish `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. GitHub ownership does not establish npm ownership. Identify an authorized Sefaria npm maintainer with 2FA and access to view/download the draft GitHub Release. Avi needs no npm membership; share no credentials.

After separate authorization, engineering runs preparation for `0.1.0-alpha.0` and provides the exact draft link, verified filenames, checksums and publish commands. The maintainer downloads the actual `.tgz` assets and runs those commands with their own account/2FA in client, text-transform, web-components order. No clone/build/repack or file transfer from Avi is needed. Automatic GitHub source archives are not package assets. Partial publication preserves the draft for explicit integrity-confirmed recovery.

## Later trusted publishing

After the package identities exist, configure each package's trusted publisher for organization `Sefaria`, repository `sefaria-frontend-toolkit`, caller `release-npm.yml`, environment `npm-release`, and permission for direct `npm publish` rather than stage-only publication. Verify this path before disallowing traditional tokens. Only the approved publication job receives temporary OIDC credentials.

The same draft becomes public only after all three npm records, dependencies, integrity and anonymous consumer verify. Alpha is a prerelease, not latest. CDN qualification and Pages retirement are separate later gates; no CDN account or upload is needed.

Send engineering confirmation of environment protection, npm ownership, the initial publisher and draft access. All remain pending until verified. No GitHub Packages setup, personal Avi npm access or shared publishing secret is required.
