---
title: "Help › Install and status"
description: "Choose an install route, understand what alpha status means, and read the license and text rights."
---

> Created/edited by GitHub Copilot; pending human review.

<!-- npm-release-version: 0.1.0-alpha.0 -->

# Install and status

<StatusNote />

You can add the toolkit to a page with one script tag, or install it as npm packages. Pick the route that fits how you build.

## Choose a route

Choose the [hosted files](#hosted-files) when you have a plain HTML page and want the components, client, or text tools without a build step. Choose the [packages](#packages) when you have a build tool, a framework, or code that calls the client or text tools.

## Hosted files

Each npm package contains one self-contained browser ES module. jsDelivr is the primary CDN. UNPKG is an alternative. Choose by goal.

| File | How to load it | What you get |
| --- | --- | --- |
| `sefaria-elements.js` | `<script type="module" src="…">` | Loading it registers all five tags. It also exports the element classes and `configureSefariaDataSource`. |
| `sefaria-api-client.js` | `import { createSefariaClient, text, validateExternalResponse } from "…"` | Named client functions. It registers nothing. |
| `sefaria-text-transform.js` | `import { normalizeText, applyVocalization, applyVocalizationToHtml, createTextPreview } from "…"` | Named text functions. It registers nothing. |

All three are ES modules. These files don't create a global variable. A plain `<script>` without `type="module"` does not work. Use `<script type="module">` or `import`. No token is needed.

Use exact-version URLs. No bundler, import map, stylesheet, or CDN transformation is required.

### Load the files

To show components, add the elements file:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js"
></script>
```

To call the client or text tools, import them:

```js
import { createSefariaClient } from "https://cdn.jsdelivr.net/npm/@sefaria/api-client@0.1.0-alpha.0/dist/browser/sefaria-api-client.js";
import { normalizeText } from "https://cdn.jsdelivr.net/npm/@sefaria/text-transform@0.1.0-alpha.0/dist/browser/sefaria-text-transform.js";
```

To take everything from one file, use `import * as client from "https://cdn.jsdelivr.net/npm/@sefaria/api-client@0.1.0-alpha.0/dist/browser/sefaria-api-client.js"`.

Components need only `sefaria-elements.js`. It bundles its own copy of the client and text code. If your page also imports the client or text files directly, that shared code downloads twice.

To use the client and text files, see [Data and text tools: start here](/data-and-text-tools/start-here.md).

### Exact-version CDN addresses

These addresses load the same packaged browser files. Choose a host explicitly. The toolkit does not fall back between hosts.

| Module | jsDelivr | UNPKG |
| --- | --- | --- |
| Client | `https://cdn.jsdelivr.net/npm/@sefaria/api-client@0.1.0-alpha.0/dist/browser/sefaria-api-client.js` | `https://unpkg.com/@sefaria/api-client@0.1.0-alpha.0/dist/browser/sefaria-api-client.js` |
| Text tools | `https://cdn.jsdelivr.net/npm/@sefaria/text-transform@0.1.0-alpha.0/dist/browser/sefaria-text-transform.js` | `https://unpkg.com/@sefaria/text-transform@0.1.0-alpha.0/dist/browser/sefaria-text-transform.js` |
| Elements | `https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js` | `https://unpkg.com/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js` |

For example, the alternative elements import is:

```html
<script
  type="module"
  src="https://unpkg.com/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js"
></script>
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

Each package colocates `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt` in `dist/browser`. A pinned npm version identifies package bytes, not a promise of permanent third-party hosting. CDN caches can lag a release or retain bytes after package removal.

### Historical Pages scripts

Older run-numbered Pages scripts are not npm versions. Their moving `cdn/alpha` alias is separate from the npm `alpha` tag and does not follow new npm releases. Existing archives retain their original bytes, filenames and licenses. Schema-2 archives use `sefaria-client.js`, not the current npm filename. Consult the [legacy hosted-version catalog](https://sefaria.github.io/sefaria-frontend-toolkit/cdn/index.html) for retained pins. A Pages version may be retired separately. Use npm-backed CDN URLs for new pages.

## Packages

The toolkit has three public npm packages: [`@sefaria/api-client`](https://www.npmjs.com/package/@sefaria/api-client), [`@sefaria/text-transform`](https://www.npmjs.com/package/@sefaria/text-transform), and [`@sefaria/web-components`](https://www.npmjs.com/package/@sefaria/web-components). Installation is anonymous and needs no GitHub token or registry-specific credentials. These examples use [`0.1.0-alpha.0`](https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v0.1.0-alpha.0).

All three packages share one reviewed numbered version. Use exact versions and commit your lockfile. Leave out the packages you don't need.

```sh
npm install @sefaria/api-client@0.1.0-alpha.0 @sefaria/text-transform@0.1.0-alpha.0 @sefaria/web-components@0.1.0-alpha.0
```

The moving prerelease tag is `alpha`. To opt into whichever reviewed alpha release it currently selects:

```sh
npm install @sefaria/web-components@alpha
```

Releases are deliberate numbered versions, not main-build snapshots. Alpha releases are prereleases and are not deliberately promoted to `latest`. Use an explicit version or `@alpha`, not an unversioned install. An exact version pins the toolkit release. Commit your lockfile and use `npm ci`, or your package manager's frozen install, to fix other dependencies too. Types are included, so no `@types` package is needed.

For import paths, see [Package imports and exports](/reference/package-imports-and-exports.md). For framework setup, see [Use with a framework](/use-components/use-with-a-framework.md).

## Runtimes

The components need a browser. The client and text tools run in JavaScript runtimes. In other languages, call [Sefaria's API](https://developers.sefaria.org) directly.

CI tests the components in Chromium, Firefox, and WebKit with the script tag. CI tests the client and text tools in Node.js 22 on Ubuntu and Windows. The minimum is Node.js 22.12.

Deno, Bun, and edge runtimes such as Cloudflare Workers are not tested in CI. The code uses standard `fetch` and needs no DOM, so any modern runtime with ES modules and `fetch` should work.

## What alpha means

A community-driven project with Sefaria backing and support. The toolkit is experimental. Names and APIs may change. Sefaria owns the toolkit. This does not promise a support SLA.

## License and text rights {#license-and-text-rights}

The toolkit uses the [MIT license](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/LICENSE), copyright Sefaria. Keep the copyright and permission notice when redistributing the software. Dependencies retain their own licenses and notices. Each package's `dist/browser` folder includes `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`. Historical Pages releases retain their original licenses, including GPL releases.

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
