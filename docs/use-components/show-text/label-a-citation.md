---
title: "Use components › Label a citation"
description: "Show a Sefaria reference as a readable English or Hebrew label, optionally linked to Sefaria, and style it to match your page."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
import refLabel from "../../../examples/site-snippets/ref-label.html?raw";
import refLabelStyling from "../../../examples/site-snippets/ref-label-styling.html?raw";
import refLabelStates from "../../../examples/site-snippets/ref-label-states.html?raw";
</script>

# Label a citation

The Reference Label, `<sefaria-ref-label>`, turns a reference such as `Micah 6:8` into Sefaria's own readable name for it, in English, Hebrew, or both. It can also link to the passage on Sefaria. It is the smallest toolkit component, so it is a good place to learn the styling settings that every component shares.

## Show a label

Set `sref` to the reference. The label asks Sefaria's reference endpoint (`/api/ref/{ref}`) once, then shows the canonical form, such as `Micah 6:8` or `מיכה ו׳:ח׳`.

- `label-language` chooses the language: `english` (the default), `hebrew`, or `both`. `both` shows English, then Hebrew, side by side.
- `linked` turns the label into a link to the passage on www.sefaria.org, such as `https://www.sefaria.org/Micah.6.8`. Without it, the label is plain text.

The example shows a linked label, then a label in both languages. To try changes, choose Edit, change the code, and choose Run.

<LiveEditor :code="refLabel" title="Linked and bilingual labels" />

## Match your site's colors and fonts

Set CSS custom properties on `:root` or on any element that contains the label. Common ones are `--sefaria-link`, `--sefaria-fg`, `--sefaria-surface` (the component background), `--sefaria-accent`, `--sefaria-font-english`, `--sefaria-font-hebrew`, `--sefaria-font-scale` (a multiplier; the default is 1), and `--sefaria-panel-radius`. The same properties style the other toolkit components.

Page styles don't reach inside the component. Only these properties and the element's own box, such as `display` and `margin`, are styled from outside.

Toolkit elements are `display: block` by default. To place a label inside a sentence, add `sefaria-ref-label { display: inline; }` to your CSS.

The default colors follow the reader's system light or dark setting only when your page declares `:root { color-scheme: light dark; }`. Use `color-scheme: light` or `color-scheme: dark` to force one. Changing styles doesn't make a new request.

The example sets a link color, a font, a larger font scale, and inline display, and opts in to dark mode.

<LiveEditor :code="refLabelStyling" title="Style a label inline" />

<span class="learn-more__label">Learn more:</span> [Match your site's look](/across-components/match-your-sites-look.md) · [Reference › Components](/reference/components.md) {.learn-more}

## When there's nothing to show

The label's `status` property is `empty`, `loading`, `ready`, or `error`. Here is what each situation looks like:

| Situation | What readers see | `status` | Error event |
|---|---|---|---|
| Waiting for Sefaria | `Loading Micah 6:8.` | `loading` | No |
| Sefaria can't be reached, for example offline or blocked | The error message, as an alert | `error` | `sefaria-ref-label-error` |
| Sefaria says the text isn't a reference | `"Not a book 3:4" is not a recognized Sefaria reference.` | `empty` | No |
| No `sref` and no `data` | Nothing | `empty` | No |

Read `status` from the element in JavaScript. To react to a failed load, listen for `sefaria-ref-label-error`. It bubbles and crosses the component boundary, and `event.detail` holds `{ error, sref }`. Invalid supplied `data` also shows an error and sets `status` to `error`, but it doesn't send the event, because the event is for failed loading.

The example has a good reference, a text that isn't a reference, and an empty label. Choose **Show each status** to log each one's status.

<LiveEditor :code="refLabelStates" title="Read status and listen for errors" />

<span class="learn-more__label">Learn more:</span> [Troubleshoot a page](/help/troubleshoot-a-page.md) · [Component events](/reference/components.md#events) {.learn-more}

## Use your own data

If you already have Sefaria's reference response, set the label's `data` property to it. The label then makes zero requests. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

## Next steps

- [Show one passage](/use-components/show-text/show-one-passage.md) to display the text itself.
- [Show an attributed passage](/use-components/show-an-attributed-passage.md) to display text with its source.
