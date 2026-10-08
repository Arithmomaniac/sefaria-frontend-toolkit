---
layout: home
title: Sefaria Frontend Toolkit
hero:
  name: Sefaria Frontend Toolkit
  text: Bring Sefaria's texts into your product at the level you need
  tagline: Drop in a tag to show a source, or use the JavaScript tools to fetch checked data and clean its text.
statusNote: true
acknowledgement: true
heroExample: true
features:
  - title: Show texts with one tag
    details: Add one Source Card tag to your page. It loads the text, shows the attribution, and handles loading and errors.
    link: /use-components/start-here.md
    linkText: Use components
  - title: Get checked data
    details: The client fetches Sefaria data and checks its shape before your code uses it.
    link: /data-and-text-tools/start-here.md
    linkText: Use the data and text tools
  - title: Clean text safely
    details: The text tools clean up Sefaria's markup, vowels, and footnotes for display.
    link: /data-and-text-tools/start-here.md
    linkText: Use the data and text tools
---

> Created/edited by GitHub Copilot; pending human review.

## Short answers

**Will it work in my stack?** The components work in any modern browser that runs JavaScript. The client and text tools also run in Node.js. For Python or other languages, call [Sefaria's API](https://developers.sefaria.org) directly.

<span class="learn-more__label">Learn more:</span> [Install and status](/help/install-and-status.md) {.learn-more}

**How do I install it?** Use the public `@sefaria` npm packages at `0.1.0-alpha.0`, or copy the version-pinned browser script above. No registry token or build step is needed for the script route. The [GitHub Release](https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v0.1.0-alpha.0) contains notes and exact package assets.

**Is it official?** It is Sefaria-owned and community-driven with Sefaria backing and support. It remains experimental, not a promise of stable APIs or a support SLA. It began at the Microsoft Global Hackathon 2026.

**Why web components?** A web component is a custom HTML tag, like `<sefaria-source-card>`. The same tag works in plain HTML, React, Alpine, and other frameworks.

<span class="learn-more__label">Learn more:</span> [Using custom elements (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) · [How the toolkit works](/concepts/how-the-toolkit-works.md) {.learn-more}

**Should I use this or Sefaria's own tools?** Use Sefaria's API, Linker, source sheets, or data exports when they already do the job. Use this toolkit to put Sefaria texts inside your own JavaScript page or app.

<span class="learn-more__label">Learn more:</span> [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) {.learn-more}
