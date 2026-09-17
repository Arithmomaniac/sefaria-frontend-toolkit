---
layout: home
title: Sefaria Frontend Toolkit

hero:
  name: Sefaria Frontend Toolkit
  text: Build a useful Jewish text experience
  tagline: Sefaria is a free digital library of Jewish texts and translations. The toolkit turns its data into an accessible Reader and focused UI components. It also provides TypeScript tools that work without UI components.
  actions:
    - theme: brand
      text: Get started
      link: /get-started.md
    - theme: alt
      text: Start with the Reader
      link: /learn/04-reader.md
    - theme: alt
      text: Try the editor
      link: /examples/playground/index.html
      target: _blank
      rel: noreferrer
---

> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

<LandingPreview />

## Choose the shortest useful path

<div class="path-grid">
  <article class="path-card">
    <h3>Start with the Reader</h3>
    <p>Use the complete Reader when people need to read a passage, inspect connections, follow commentary, and move through their history.</p>
    <p><SiteLink to="/learn/04-reader.html">Build the Reader path →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Compose with components</h3>
    <p>Choose one of seven UI components. Open a supplied-data example or a live example.</p>
    <p><SiteLink to="/components.html">Browse the component catalog →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Use the headless APIs</h3>
    <p>Use the client, text tools, or component factories without UI components. You can use them in browsers, servers, tests, and MCP integrations.</p>
    <p><SiteLink to="/get-started.html#headless-client-transform-and-factory-path">Follow the headless path →</SiteLink></p>
  </article>
</div>

## A practical first run

Use Node.js 22.12 or later. Use the pnpm version that the repository specifies.

```powershell
corepack enable
pnpm install
pnpm dev:site
```

These commands build the examples and start the documentation site.

Opening the landing page and supplied-data previews makes no Sefaria request. Pages with `Start live demo` contact Sefaria only after you select that action.

If you build an external consumer, use the supported [workspace or local-tarball setup](learn/02-supplied-data.md#try-it). Private prereleases use an authenticated package source. Their presence does not prove that a public npm package exists.

Next, choose one path:

- Read [Get started](get-started.md).
- Browse the [component catalog](components.md).
- Run the [examples](examples.md).
- Read the [guides](guides/index.md).
