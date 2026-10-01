---
title: "Concepts › Sefaria's own texts and tools"
description: "Learn what Sefaria means by a reference and an edition, how the toolkit picks a translation, and when Sefaria's own API, Linker, MCP servers, source sheets, or data exports fit better."
---

> Created/edited by GitHub Copilot; pending human review.

# Sefaria's own texts and tools

Sefaria publishes its own documentation and tools. This page gives only the two ideas you need to use the toolkit's attributes, then points you to Sefaria for the rest.

## References and editions

A reference names a place in Sefaria's library. Sefaria calls it a "ref". `Micah 6:8` is a reference.

An edition is one specific text or translation of a work. Sefaria calls it a "version". One work can have many editions, in several languages.

Sefaria marks editions eligible for its primary-text selection with `isPrimary`. More than one edition can carry the flag. This is usually the Hebrew or original text, but not always. Sefaria's own example is the Kuzari. Its primary edition is Hebrew, although the work was written in Judeo-Arabic.

For the full explanation, read Sefaria's pages on [text references](https://developers.sefaria.org/docs/text-references) and [indexes and versions](https://developers.sefaria.org/docs/index-and-versions).

## How the toolkit picks a translation

By default, Source Card and Bilingual Segment ask Sefaria for its primary edition and its default translation.

To choose a language, set `translation-language` to a language family name, such as `english` or `french`. When you supply no `data`, the component then asks for a translation in that language. Supplied data is selected locally and never triggers a request.

A preferred translation language can be missing for a text. Depending on its `translation-fallback` setting, a component then either shows Sefaria's default translation, which isn't always English, or shows that the language is missing. Berakhot 2a:1 is an example.

Which component does which by default, and what it costs in requests, is in [Choose what text readers see](/across-components/choose-what-text-readers-see.md).

## How to tell which edition is shown

An attribution names the edition and its language. It links to the edition's source when Sefaria gives a valid address.

Only some components show an attribution. See [Choose what text readers see](/across-components/choose-what-text-readers-see.md) and [Show an attributed passage](/use-components/show-an-attributed-passage.md).

Attributions don't show the edition's license. Each edition has its own. To check the rights for text you plan to reuse, read [License and text rights](/help/install-and-status.md#license-and-text-rights). Sefaria's [Copyright and Data Use](https://developers.sefaria.org/docs/usage-of-our-name-and-logo) page and its [help article on licensing](https://help.sefaria.org/hc/en-us/articles/18490043237148-How-to-Find-and-Understand-Licensing-or-Copyright-Information) explain the rules.

## When Sefaria's own tools fit

The toolkit fits when you want Sefaria texts inside your own JavaScript page or app, with checked data, cleaned text, or ready-made display elements. Sefaria's tools can fit better, or work alongside it.

### Data and code

- **API.** Use [Sefaria's API](https://developers.sefaria.org/) directly from Python or another language, or when you need data the toolkit doesn't cover. Start with its [introduction](https://developers.sefaria.org/reference/getting-started) and the [texts endpoint](https://developers.sefaria.org/reference/get-v3-texts).

### Citations and AI

- **Linker.** The [Linker](https://developers.sefaria.org/docs/linker-v3) finds citations in your page's text and links them. The toolkit doesn't find citations. The [linked article example](/examples/linked-article.md) shows a preview for links you already have.
- **MCP servers.** The [Sefaria MCP](https://developers.sefaria.org/docs/the-sefaria-mcp) lets AI assistants search and read Sefaria. To see the toolkit's Reader inside an AI chat, open [Reader inside AI chat](/examples/reader-inside-ai-chat.md).

### Sheets and exports

- **Source sheets.** Use [Sefaria's sheets documentation](https://developers.sefaria.org/docs/sheets) to work with source sheets.
- **Data exports.** [Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) offers whole-library bulk data.

### Guides and examples

- **Educator Playbook.** The [Educator Playbook](https://developers.sefaria.org/docs/the-educator-playbook-a-quick-guide-to-vibe-coding-with-sefaria) is a quick guide to writing raw API code with AI.
- **Powered by Sefaria.** [This list](https://developers.sefaria.org/docs/powered-by-sefaria) shows projects built on Sefaria.

<span class="learn-more__label">Learn more:</span> [Choose what text readers see](/across-components/choose-what-text-readers-see.md) · [License and text rights](/help/install-and-status.md#license-and-text-rights) {.learn-more}
