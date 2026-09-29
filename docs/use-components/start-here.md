---
title: "Use components › Start here"
description: "Put your first Sefaria source on a page with two lines of HTML, or with a package import."
---

> Created/edited by GitHub Copilot; pending human review.

# Put your first source on a page

Copy the two lines below into any page that allows a script tag and custom HTML. The first line loads the toolkit's components. The second line shows `Micah 6:8` as a Source Card, a box that displays the text and says where it comes from.

<StatusNote />

<SourceCardSnippet />

The `alpha` address always loads the newest build. For a fixed version, see [Install and status](/help/install-and-status.md).

## What is a web component?

A web component is a custom HTML tag that the browser understands. After the script loads, you can use `<sefaria-source-card>` like any other HTML tag. That is why the same tag works in plain HTML, a content management system, React, Alpine, or another framework.

<span class="learn-more__label">Learn more:</span> [Using custom elements (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) · [How the toolkit works](/concepts/how-the-toolkit-works.md) {.learn-more}

## Loading and failure

The card fetches the text from Sefaria when it appears on the page. While it waits, it shows a loading state. If it can't reach Sefaria, it shows an error message and sends an error event that your code can listen for. It never shows old saved text in place of the live text.

<span class="learn-more__label">Learn more:</span> [Loading, ready, and error states](/concepts/how-the-toolkit-works.md#status) · [Troubleshoot a page](/help/troubleshoot-a-page.md) {.learn-more}

## Script tag or package

Use the script tag if your page has no build step, if you are editing a field in a content management system, or if you just want to try the toolkit quickly. Use the package if your app already has a build step. The package lets you import the component, bundle it with your code, and let your framework control when it loads.

::: code-group

```html [Script tag]
<script
  type="module"
  src="https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"
></script>
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

```ts [Package route]
import "@arithmomaniac/sefaria-web-components/source-card";
```

```html [Package route HTML]
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
```

:::

## Choose what to show next

- [Just the citation](/use-components/show-text/label-a-citation.md)
- [One text](/use-components/show-text/show-one-passage.md)
- [Hebrew and translation](/use-components/show-text/hebrew-and-translation.md)
