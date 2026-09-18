---
layout: home
title: Sefaria Frontend Toolkit

hero:
  name: Sefaria Frontend Toolkit
  text: Bring Sefaria texts into your product
  tagline: Fetch and validate Sefaria data, prepare text and footnotes, or add request-free reading surfaces—from one citation to a controlled Reader.
  actions:
    - theme: brand
      text: Get started
      link: /get-started.md
    - theme: alt
      text: Fetch and prepare text
      link: /get-started.md#use-the-client-without-components
    - theme: alt
      text: Try the editor
      link: /examples/playground/index.html
      target: _blank
      rel: noreferrer
---

> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

<LandingPreview />

## Why this toolkit exists

Sefaria is a free digital library and data source for Jewish texts and translations. A direct API response is only the start of a product: an application still has to validate unknown JSON, prepare markup and footnotes, choose how to display Hebrew vocalization, project nested text into useful rendering data, and own any live request or navigation state.

The toolkit separates those jobs so that a third party can adopt only the part it needs. `@arithmomaniac/sefaria-client` validates the supported transport responses. `@arithmomaniac/sefaria-text-transform` provides pure sanitization, vocalization, preview, and footnote operations. Non-DOM `@arithmomaniac/sefaria-web-components` subpaths create render-ready view models and controllers. The browser package adds seven request-free components, including a controlled Reader.

You can stop at any layer. A server, test, search index, AI integration, or custom renderer can use the client or text transforms without registering a custom element. A product that wants ready-made presentation can add one focused surface or the complete Reader.

## Choose your integration depth

<div class="path-grid">
  <article class="path-card">
    <h3>Fetch and validate data</h3>
    <p>Use <code>@arithmomaniac/sefaria-client</code> when a server, script, browser app, or MCP host needs supported Sefaria responses with runtime validation.</p>
    <p><SiteLink to="/get-started.html#use-the-client-without-components">Use the client without components →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Prepare text you already have</h3>
    <p>Use <code>@arithmomaniac/sefaria-text-transform</code> with API data, stored JSON, fixtures, or user input. Sanitize supported markup, extract footnotes, create bounded previews, or change vocalization without fetching.</p>
    <p><SiteLink to="/get-started.html#use-text-transforms-without-the-client">Use the text tools on their own →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Add a focused reading surface</h3>
    <p>Use a reference label, text segment, bilingual segment, source card, popup, or connections panel when the surrounding product and navigation already belong to your application.</p>
    <p><SiteLink to="/components.html">Choose a focused component →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Build a complete Reader</h3>
    <p>Use the controlled Reader when people need to read bilingual text, inspect connections, follow commentary, and return through semantic history.</p>
    <p><SiteLink to="/learn/04-reader.html">Follow the Reader path →</SiteLink></p>
  </article>
</div>

## Evaluate without cloning

The landing preview, seven-project editor, authored component states, and live examples show the current product paths in the browser. Opening the landing page and supplied-data previews makes no Sefaria request. Pages with **Start live demo** contact Sefaria only after that explicit action.

- Edit HTML, CSS, and JavaScript in the [supplied-data editor](examples/playground/index.html).
- Compare the [seven components](components.md).
- Open the [controlled Reader](examples/reader/controlled.html?tref=Micah%206%3A8).
- Follow the independent [client, transform, factory, component, and Reader paths](get-started.md).

## Evaluate now or develop the source

Public package installation is planned for release. Until then, use the browser examples to evaluate the product; private prereleases and local tarballs support integration qualification.

**Develop the toolkit itself:** clone the repository, use Node.js 22.12 or later and the pinned pnpm version, then follow [Development](development.md). The workspace commands build examples and contributor documentation; they are not a prerequisite for understanding or evaluating the product.

Continue with [Get started](get-started.md) for the current imports and adoption paths.

## Project origin

This project began as a Microsoft Global Hackathon 2026 project. Thank you to Microsoft for sponsoring the hackathon and providing the time and platform that helped turn the initial idea into working software. The toolkit is now an independently maintained open-source project.
