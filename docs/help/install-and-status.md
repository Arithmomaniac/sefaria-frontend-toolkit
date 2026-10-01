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
| `sefaria-client.js` | `import { createSefariaClient, text, validateExternalResponse } from "…"` | Named client functions. It registers nothing. |
| `sefaria-text-transform.js` | `import { normalizeText, applyVocalization, applyVocalizationToHtml, createTextPreview } from "…"` | Named text functions. It registers nothing. |

All three are ES modules and none sets a global. A plain `<script>` without `type="module"` does not work. Use `<script type="module">` or `import`. No token is needed.

### Load the files

To show components, add the elements file:

```html
<script
  type="module"
  src="https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"
></script>
```

To call the client or text tools, import them:

```js
import { createSefariaClient } from "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-client.js";
import { normalizeText } from "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-text-transform.js";
```

To take everything from one file, use `import * as client from "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-client.js"`.

Components need only `sefaria-elements.js`. It bundles its own copy of the client and text code. If your page also imports the client or text files directly, that shared code downloads twice.

To use the client and text files, see [Data and text tools: start here](/data-and-text-tools/start-here.md).

### Newest or pinned version

The `alpha` address serves the newest build, and it changes without notice. To stay on one build, swap `alpha` for a version number in any of the three files. For example:

```html
<script
  type="module"
  src="https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/0.0.0-alpha.36533219551.1/sefaria-elements.js"
></script>
```

To find versions, open [the list of hosted versions](https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/index.html). It shows which versions are active and which version the `alpha` address serves right now. Programs can read the same list as JSON from [catalog.json](https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/catalog.json).

Pinned addresses stay available while their version is active. A version can be retired without notice.

## Packages

The toolkit has three packages: `@arithmomaniac/sefaria-client`, `@arithmomaniac/sefaria-text-transform`, and `@arithmomaniac/sefaria-web-components`. They are published to GitHub Packages as prereleases. They are not published on npmjs.com.

GitHub Packages asks for a token, even for public packages. Create a personal access token with the `read:packages` scope ([GitHub's steps](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages)). Then add this to your `.npmrc`. Set `NODE_AUTH_TOKEN` to your token:

```ini
@arithmomaniac:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install an exact version. Copy the newest version number from the [package page on GitHub](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/pkgs/npm/sefaria-web-components). All three packages share the same version. Leave out the packages you don't need. Yarn and pnpm work too, with their usual install commands.

```sh
version="0.0.0-alpha.<run-id>.<run-attempt>"
npm install "@arithmomaniac/sefaria-client@$version" "@arithmomaniac/sefaria-text-transform@$version" "@arithmomaniac/sefaria-web-components@$version"
```

The packages also carry an `alpha` tag that follows the newest build. An exact version pins the toolkit release. Commit your lockfile and install from it to fix the other dependencies too. For example, run `npm ci`. Yarn and pnpm read the same `.npmrc` scope line. Yarn can also use its own setting, [`npmScopes`](https://yarnpkg.com/configuration/yarnrc#npmScopes). Types are included; no `@types` package is needed.

If you get a 401, 403, or `E404` error, check:

- the name of the failing package
- that your token has the `read:packages` scope
- that your account has access to the package
- the tag or version you requested

For import paths, see [Package imports and exports](/reference/package-imports-and-exports.md). For framework setup, see [Use with a framework](/use-components/use-with-a-framework.md).

## Runtimes

The components need a browser. The client and text tools run in JavaScript runtimes. In other languages, call [Sefaria's API](https://developers.sefaria.org) directly.

| Runtime | Coverage | Notes |
| --- | --- | --- |
| Chromium, Firefox, and WebKit | Tested in CI | Component tests run with the script tag. |
| Node.js 22 | Tested in CI | Client and text-tool tests run on Ubuntu and Windows. The minimum is Node.js 22.12. |
| Deno, Bun, and edge runtimes | Not tested in CI | The code uses standard `fetch` and needs no DOM, so any modern runtime with ES modules and `fetch` should work. |

## What alpha means

The toolkit is experimental and unofficial. It is developed in collaboration with Sefaria, but it is not an official Sefaria product. One maintainer looks after it. Names and addresses may change. The package names on this page are current as of commit `455f036`.

## License and text rights {#license-and-text-rights}

The toolkit is licensed under GPL-3.0-only. Generally, if you distribute a combined work that includes the toolkit, you license that work as a whole under GPLv3. You also provide its corresponding source. Separate programs that are merely distributed alongside it are different. This is not legal advice. Read the [GNU GPL text](https://www.gnu.org/licenses/gpl-3.0.html) and the toolkit's [LICENSE](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/LICENSE), and ask a lawyer if you're unsure. Each script version folder includes `LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`.

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
