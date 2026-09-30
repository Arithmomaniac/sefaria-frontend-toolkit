---
title: "Across components › Match your site's look"
description: "Set colors, fonts, corner rounding, text size, and light or dark mode for every toolkit component at once, using shared --sefaria-* CSS properties."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import theming from "../../examples/site-snippets/component-theming.html?raw";
</script>

# Match your site's look

This page changes how components look, not which text appears. To change the text, see [Choose what text readers see](/across-components/choose-what-text-readers-see.md).

[Show one passage](/use-components/show-text/show-one-passage.md#match-your-sites-colors-and-fonts) first introduced styling. This page gathers every setting.

Every toolkit component reads the same set of CSS custom properties, called tokens, whose names start with `--sefaria-`. Set a token once and every component in scope picks it up. Tokens pass down to every component inside the element where you set them. Each component uses the tokens that apply to it. You need a page with at least one working component and access to your CSS.

## Where to set tokens

- Set tokens on `:root` to change every component on the page.
- Set them on any element that contains components to change only the components inside it.

Components you haven't restyled keep their default look. Tokens you don't set keep their defaults.

## The tokens

| Token | What it changes |
| --- | --- |
| `--sefaria-surface` | Component background. |
| `--sefaria-surface-muted` | Secondary background areas. |
| `--sefaria-fg` | Text color. |
| `--sefaria-fg-muted` | Secondary text. |
| `--sefaria-border` | Borders. |
| `--sefaria-border-strong` | Reserved. No component uses it yet, so setting it has no visible effect today. |
| `--sefaria-accent` | Highlights, such as focus outlines and selected items. |
| `--sefaria-accent-soft` | Reserved. No component uses it yet, so setting it has no visible effect today. |
| `--sefaria-danger` | Reserved. No component uses it yet, so setting it has no visible effect today. |
| `--sefaria-link` | Link color. |
| `--sefaria-shadow` | Reserved. No component uses it yet, so setting it has no visible effect today. |
| `--sefaria-panel-radius` | Corner rounding of panels such as cards and the connections panel. Default: `0.75rem`. |
| `--sefaria-control-radius` | Corner rounding of Connections Panel buttons and Source Card verse-number buttons. Default `0.3rem`. The Reader's own buttons stay pill-shaped. |
| `--sefaria-font-scale` | Multiplies each component's base font size. Default `1`. Text sized relative to it follows. Some Reader interface text has fixed sizes and doesn't. |
| `--sefaria-font-hebrew` | Hebrew text font. The default starts with "Noto Serif Hebrew". |
| `--sefaria-font-english` | English text font. The default starts with Georgia. |
| `--sefaria-font-label-hebrew` | Reserved. No component uses it yet, so setting it has no visible effect today. |
| `--sefaria-font-label-english` | Font for Reader buttons and its loading message. Default: `system-ui, sans-serif`. History labels use `--sefaria-font-english`. |

Hebrew reference and verse-number labels use `--sefaria-font-hebrew`.

The default colors come in light and dark pairs, so you only need to set the colors you want to change. The same list appears in [Reference › Components](/reference/components.md).

## Follow or force light and dark mode

The default colors use the CSS `light-dark()` function. To make them follow the reader's system setting, declare this once on your page:

```css
:root {
  color-scheme: light dark;
}
```

Setting `color-scheme` on an element that contains components also works. `color-scheme: light` or `color-scheme: dark` forces one mode. Your own token values can use `light-dark()` too, as the example does.

The example scopes a set of tokens to one container and opts in to dark mode. Choose **Force dark** to set `color-scheme: dark` on the page root. The link color and the card background change to their dark values, and no new request is made.

<LiveEditor :code="theming" title="Set tokens and force dark mode" />

<span class="learn-more__label">Learn more:</span> [color-scheme on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) · [light-dark() on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) {.learn-more}

## Why your page's selectors don't reach inside

Components render inside a shadow DOM, a browser feature that keeps a component's markup and styles separate from the page. Your selectors, such as `p { color: red; }`, can't reach inside.

You can style a component through the tokens, through the element's own box (`display`, `margin`, width), and, for the Reader, through its named parts: `sefaria-reader::part(toolbar)`, `::part(history)`, `::part(source-pane)`, and `::part(connections-pane)`. Inherited text settings such as `font-weight` can still pass in.

The Reader uses `display: grid`. The other components are `display: block` by default. Set `margin` or `display` on the element itself to place it in your layout.

Styling never makes a request. Changing tokens, the color scheme, or box styles only redraws what is already there.

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [::part on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) {.learn-more}

## Next steps

- [Choose what text readers see](/across-components/choose-what-text-readers-see.md): change translations, editions, and vowel marks.
- [Reference › Components](/reference/components.md): every token and default.
