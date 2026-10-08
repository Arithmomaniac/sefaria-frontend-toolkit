---
title: "Help › Install and status"
description: "Choose an install route, understand what alpha status means, and read the license and text rights."
---

> Created/edited by GitHub Copilot; pending human review.

# Install and status

<StatusNote />

You can add the toolkit to a page with one script tag, or install it as npm packages. Pick the route that fits how you build.

## Choose a route

Choose the [hosted files](#hosted-files) when you have a plain HTML page and want the components, client, or text tools without a build step. Choose the [packages](#packages) when you have a build tool, a framework, or code that calls the client or text tools.

## Hosted files

The CDN serves three ES-module files from one folder. Choose by goal.

| File | How to load it | What you get |
| --- | --- | --- |
| `sefaria-elements.js` | `<script type="module" src="…">` | Loading it registers all five tags. It also exports the element classes and `configureSefariaDataSource`. |
| `sefaria-api-client.js` | `import { createSefariaClient, text, validateExternalResponse } from "…"` | Named client functions. It registers nothing. |
| `sefaria-text-transform.js` | `import { normalizeText, applyVocalization, applyVocalizationToHtml, createTextPreview } from "…"` | Named text functions. It registers nothing. |

All three are ES modules. These files don't create a global variable. A plain `<script>` without `type="module"` does not work. Use `<script type="module">` or `import`. No token is needed.

The client filename changes to `sefaria-api-client.js` in the next qualified Sefaria release. Retained older releases use `sefaria-client.js` instead. Until that release is activated, use an older pinned version with its original client filename rather than the new alpha client URL below.

### Load the files

To show components, add the elements file:

```html
<script
  type="module"
  src="https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"
></script>
```

To call the client or text tools, import them:

```js
import { createSefariaClient } from "https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-api-client.js";
import { normalizeText } from "https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-text-transform.js";
```

To take everything from one file, use `import * as client from "https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-api-client.js"`.

Components need only `sefaria-elements.js`. It bundles its own copy of the client and text code. If your page also imports the client or text files directly, that shared code downloads twice.

To use the client and text files, see [Data and text tools: start here](/data-and-text-tools/start-here.md).

### Newest or pinned version

The legacy Pages `alpha` address serves the newest retained script release, not each new main build. No new Pages snapshots are automatically published while npm delivery is prepared. To stay on one retained release, swap `alpha` for a version number in any of the three files. Older versions may have only the components file. For example:

```html
<script
  type="module"
  src="https://sefaria.github.io/sefaria-frontend-toolkit/cdn/0.0.0-alpha.36918501033.1/sefaria-elements.js"
></script>
```

To find versions, open [the list of hosted versions](https://sefaria.github.io/sefaria-frontend-toolkit/cdn/index.html). It shows which versions are active and which version the `alpha` address serves right now. Programs can read the same list as JSON from [catalog.json](https://sefaria.github.io/sefaria-frontend-toolkit/cdn/catalog.json).

Pinned addresses stay available while their version is active. A version can be retired without notice.

## Packages

The toolkit has three packages: `@sefaria/api-client`, `@sefaria/text-transform`, and `@sefaria/web-components`. Public npm publication of `0.1.1-alpha.0` is pending qualification. The command below is planned installation guidance, not a claim that the packages are already live. After all three packages verify, npm installation will be anonymous and need no GitHub token or registry-specific credentials.

All three packages share one reviewed numbered version. Use exact versions and commit your lockfile. Leave out the packages you don't need.

```sh
version="0.1.1-alpha.0"
npm install "@sefaria/api-client@$version" "@sefaria/text-transform@$version" "@sefaria/web-components@$version"
```

The planned prerelease tag is `alpha`. Releases are deliberate reviewed versions, not main-build snapshots. An exact version pins the toolkit release. Use `npm ci`, or your package manager's frozen install, to fix other dependencies too. Types are included, so no `@types` package is needed. A missing version during rollout is not a reason to obtain a GitHub Packages token or choose an unrelated package.

For import paths, see [Package imports and exports](/reference/package-imports-and-exports.md). For framework setup, see [Use with a framework](/use-components/use-with-a-framework.md).

### Planned npm CDN delivery

jsDelivr is the primary planned host. UNPKG is the alternative. These exact-version URLs remain pending hosted qualification. No transformation, import map, or automatic fallback between hosts is used.

| Package module | Planned jsDelivr URL |
| --- | --- |
| Client | `https://cdn.jsdelivr.net/npm/@sefaria/api-client@0.1.1-alpha.0/dist/browser/sefaria-api-client.js` |
| Text tools | `https://cdn.jsdelivr.net/npm/@sefaria/text-transform@0.1.1-alpha.0/dist/browser/sefaria-text-transform.js` |
| Elements | `https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.1-alpha.0/dist/browser/sefaria-elements.js` |

The UNPKG alternative replaces `https://cdn.jsdelivr.net/npm/` with `https://unpkg.com/` and retains the exact package, version and path. Each package colocates `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt` in `dist/browser`. All three modules and both hosts must match the qualified package bytes before cutover. Sefaria npm ownership, initial publication and hosted qualification remain external prerequisites. Existing Pages releases are restored unchanged until a separately approved cutover. Third-party CDNs may retain bytes after deletion and do not inherit the Pages retirement policy.

## Runtimes

The components need a browser. The client and text tools run in JavaScript runtimes. In other languages, call [Sefaria's API](https://developers.sefaria.org) directly.

CI tests the components in Chromium, Firefox, and WebKit with the script tag. CI tests the client and text tools in Node.js 22 on Ubuntu and Windows. The minimum is Node.js 22.12.

Deno, Bun, and edge runtimes such as Cloudflare Workers are not tested in CI. The code uses standard `fetch` and needs no DOM, so any modern runtime with ES modules and `fetch` should work.

## What alpha means

A community-driven project with Sefaria backing and support. The toolkit is experimental. Names and APIs may change. Sefaria owns the toolkit. This does not promise a support SLA.

## License and text rights {#license-and-text-rights}

New toolkit releases use the [MIT license](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/LICENSE), copyright Sefaria. Keep the copyright and permission notice when redistributing the software. Dependencies retain their own licenses and notices. Each script version folder includes `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`. Older releases retain the original license shipped in that folder, including GPL releases.

The rights to the texts are separate. Each Sefaria edition has its own license, so check the edition you display. On sefaria.org, open a passage and choose "About this Text" to see the current version's license. Sefaria's [Copyright and Data Use](https://developers.sefaria.org/docs/usage-of-our-name-and-logo) page explains the rules for using its data.

Attribution works like this:

- Source Card and Reader show each side's edition title and one full language-family name, such as `(english)`. They link the title to the edition's source only when the source is a valid http(s) address.
- Text Segment and Bilingual Segment show no edition attribution.

These attributions don't show the license. The Connections Panel (also inside the Reader) can show "Licenses reported" in a connection preview when Sefaria provides it. Sefaria's API returns optional `license` fields, so your own code can read and display them too.

## Where to go next

- [Choose what text readers see](/across-components/choose-what-text-readers-see.md)
- [Use components: start here](/use-components/start-here.md)
- [Data and text tools: start here](/data-and-text-tools/start-here.md)
- [Start with an AI assistant](/use-components/start-with-an-ai-assistant.md)
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md)
- Questions: [Get support](/help/troubleshoot-a-page.md#get-support)
