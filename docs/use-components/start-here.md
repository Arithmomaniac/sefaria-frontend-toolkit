---
title: "Use components › Start here"
description: "Put your first Sefaria source on a page with two lines of HTML, or with a package import."
---

> Created/edited by GitHub Copilot; pending human review.

# Put your first source on a page

Copy the two lines below into any page that allows a script tag and custom HTML. The first line loads the toolkit's components as a module script. The second line shows `Micah 6:8` as a Source Card, a box that displays the text and says where it comes from.

<StatusNote />

<SourceCardSnippet />

The script pins npm release `0.1.0-alpha.0` through jsDelivr. [Install and status](/help/install-and-status.md) lists UNPKG alternatives and explains the moving npm `alpha` tag.

## What is a web component?

A web component is a custom HTML tag that the browser understands. After the script loads, you can use `<sefaria-source-card>` like any other HTML tag. That is why the same tag works in plain HTML, a content management system, React, Alpine, or another framework.

<span class="learn-more__label">Learn more:</span> [Using custom elements (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) · [How the toolkit works](/concepts/how-the-toolkit-works.md) {.learn-more}

## Loading and failure

The card fetches the text from Sefaria when it appears on the page. While it waits, it shows a loading state. The first load can fail. Then the card shows an error message. It also sends an error event that your code can listen for. The card has no saved text to show instead. A later reload can fail after the card shows text. Then the card keeps that text on screen. Its `status` becomes `error`.

<span class="learn-more__label">Learn more:</span> [Loading, ready, and error states](/concepts/how-the-toolkit-works.md#status) · [Troubleshoot a page](/help/troubleshoot-a-page.md) {.learn-more}

## Script tag or package

- **Script tag:** one self-contained file, no build step, no token. Use it if your page has no build step, or if you're editing a field in a content management system. It's also the quickest way to try the toolkit.
- **Package:** for apps with a build step. Install `@sefaria/web-components`, import the package root once, and bundle it with your code. Your framework controls when it loads.

Load the script tag with `type="module"`. Need the client or text tools without UI? See [Hosted files](/help/install-and-status.md#hosted-files).

::: code-group

```html [Script tag]
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@sefaria/web-components@0.1.0-alpha.0/dist/browser/sefaria-elements.js"
></script>
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

```sh [Package install]
npm install @sefaria/web-components@0.1.0-alpha.0
```

```ts [Package route]
import "@sefaria/web-components";
```

```html [Package route HTML]
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

:::

## Choose what to show next

- [One text](/use-components/show-text/show-one-passage.md)
- [Hebrew and translation](/use-components/show-text/hebrew-and-translation.md)

To cite a source without quoting it, use a plain link to Sefaria, such as `<a href="https://www.sefaria.org/Micah.6.8">Micah 6:8</a>`.
