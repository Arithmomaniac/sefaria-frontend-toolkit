> Created/edited by GitHub Copilot; pending human review.

<!-- npm-release-version: 0.1.0-alpha.0 -->

# Sefaria Frontend Toolkit

Bring [Sefaria](https://www.sefaria.org/)'s texts into your product at the level you need: drop in a tag to show a source, or use the JavaScript tools to fetch checked data and clean its text.

A community-driven project with Sefaria backing and support. The toolkit is experimental; names and APIs may change.

## Start here

- To show texts with tags on a page, [use the components](https://sefaria.github.io/sefaria-frontend-toolkit/use-components/start-here.html).
- To fetch checked data or clean text in your own code, [use the data and text tools](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/start-here.html).

## Install and status

Install the public npm packages at the synchronized alpha version. Leave out packages you don't need:

```sh
npm install @sefaria/api-client@0.1.0-alpha.0 @sefaria/text-transform@0.1.0-alpha.0 @sefaria/web-components@0.1.0-alpha.0
```

For a page without a build step:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js"
></script>
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

No registry token is needed. [Install and status](https://sefaria.github.io/sefaria-frontend-toolkit/help/install-and-status.html) covers pinned jsDelivr and UNPKG files, package imports, and the moving npm `alpha` tag. See the [GitHub Release](https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v0.1.0-alpha.0) for release notes and exact package assets.

## Documentation

Read the [documentation site](https://sefaria.github.io/sefaria-frontend-toolkit/). Coding assistants can start from [llms.txt](https://sefaria.github.io/sefaria-frontend-toolkit/llms.txt).

## Contribute

See [Development](docs/development.md).

## Project origin

This project began at the Microsoft Global Hackathon 2026. Thank you to Microsoft for sponsoring the hackathon and for the time and platform that helped turn the idea into working software. Sefaria now owns the toolkit, which continues as a community-driven open-source project.

## License and attribution

Copyright (c) 2026 Sefaria. This repository uses the [MIT license](LICENSE). Third-party dependencies and Sefaria text editions retain their own licenses. Historical published releases retain the license shipped with them. Source provenance is documented in [`docs/evidence.md`](docs/evidence.md).
