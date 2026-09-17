---
layout: home
title: Sefaria Frontend Toolkit

hero:
  name: Sefaria Frontend Toolkit
  text: Build a useful Jewish text experience
  tagline: Sefaria is a free digital library of Jewish texts and translations. The toolkit turns its data into an accessible Reader, focused UI components, and headless TypeScript building blocks.
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
---

> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

<LandingPreview />

## Choose the shortest useful path

<div class="path-grid">
  <article class="path-card">
    <h3>Start with the Reader</h3>
    <p>Use the complete controlled surface when people need to read a passage, inspect connections, follow commentary, and move through history.</p>
    <p><SiteLink to="/learn/04-reader.html">Build the Reader path →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Compose with components</h3>
    <p>Choose among seven current rendering surfaces, then open the matching supplied-data or explicit-live example.</p>
    <p><SiteLink to="/components.html">Browse the component catalog →</SiteLink></p>
  </article>
  <article class="path-card">
    <h3>Use the headless APIs</h3>
    <p>Call the validated client, pure text transforms, or component factories from a browser, server boundary, fixture, or MCP integration.</p>
    <p><SiteLink to="/get-started.html#headless-client-transform-and-factory-path">Follow the headless path →</SiteLink></p>
  </article>
</div>

## A practical first run

Use Node.js 22.12 or later and the repository-pinned pnpm. This starts the documentation and builds its isolated examples:

```powershell
corepack enable
pnpm install
pnpm dev:site
```

Opening the landing page and supplied-data previews makes no Sefaria request. Pages labeled **Start live demo** contact Sefaria only after that explicit action. For an external consumer, follow the supported [workspace or local-tarball setup](learn/02-supplied-data.md#try-it); authenticated private prereleases are a separate package source, not evidence of public npm availability.

Continue with [Get started](get-started.md), jump to the [component catalog](components.md), or scan the [examples](examples.md) and [guides](guides/index.md).
