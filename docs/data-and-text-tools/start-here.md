---
title: "Use the data and text tools › Start here"
description: "Fetch a checked Sefaria response, clean Sefaria's HTML text, or do both in Node.js, with runnable examples for Micah 6:8."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Fetch data or clean text

The toolkit has two independent packages. The client fetches from Sefaria's API and checks each JSON response against the corrected API description. The text tools turn Sefaria's HTML into safe HTML, keep footnotes separate, and choose which vowel and cantillation marks to show. Use either one alone, or both. Neither needs a browser or a DOM, so they run on a server.

## Install

<StatusNote />

Install `@arithmomaniac/sefaria-client`, `@arithmomaniac/sefaria-text-transform`, or both. Each works without the other. They are on GitHub Packages, which needs an access token before you can install. [Install and status](/help/install-and-status.md) shows how to set up the token and gives the exact install command for the current version. These steps need Node.js 22.12 or later. That page also lists the other JavaScript runtimes the packages are meant for.

Each example below is a complete ES module. Save the JavaScript version as a file such as `fetch.mjs` and run `node fetch.mjs`. For the TypeScript version, save it as `fetch.ts` and use your usual TypeScript tooling. Node.js 22.18 and later can also run it directly with `node fetch.ts`.

## Fetch one checked response

<CodeLanguageToggle :snippet="snippets['client-first-success']" />

The first part prints `Micah 6:8 · he · Miqra according to the Masorah`. `createSefariaClient()` makes a client for `https://www.sefaria.org`. `text.getV3Texts` is the generated function for Sefaria's texts API (v3). With no `version` option, Sefaria returns the edition marked primary (`isPrimary`). Here that is the Hebrew Masoretic text.

The result has `data` on success. When Sefaria answers with a documented HTTP error, such as 404 for an unknown reference, the result has `error` with the documented error body. Then `data` is undefined. If a response doesn't match the API description, the call throws a `SefariaContractError` instead of returning data. Network failures also throw. They are not turned into empty data.

The second part checks JSON you got another way, such as from storage or a file. `validateExternalResponse` returns `{ valid, issues }` and does not throw. It prints `Invalid at /isSpanning: Invalid input: expected boolean, received string`. Each issue's `instancePath` is a JSON Pointer into the checked value. It points to the place in the data. It doesn't say how to fix it.

<span class="learn-more__label">Learn more:</span> [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) · [The client and Sefaria's API](/concepts/the-client-and-sefarias-api.md) {.learn-more}

## Clean text you already have

<CodeLanguageToggle :snippet="snippets['text-transform-first-success']" />

This makes no network request. It prints two lines:

```text
הִגִּ֥יד לְךָ֛ אָדָ֖ם מַה־טּ֑וֹב <span data-sefaria-mam="setumah">{ס}</span>
הִגִּיד לְךָ אָדָם מַה־טּוֹב <span data-sefaria-mam="setumah">{ס}</span>
```

`normalizeText` is the sanitizer. It removed the `onclick` attribute and turned Sefaria's `mam-spi-samekh` class into `data-sefaria-mam="setumah"`, a marker for a closed paragraph break in the Masoretic text. It returns `bodyHtml` and `notes`. The `notes` field holds footnotes kept separately.

`applyVocalizationToHtml(html, "nikkud")` removes the cantillation marks (taamim) and keeps the vowel points (nikkud), as the second line shows. It changes only text, not markup. Normalize first, then vocalize, because the vocalization helper does not make HTML safe. The other modes are `taamim_and_nikkud` and `none`. [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) lists exactly which marks each mode removes.

<span class="learn-more__label">Learn more:</span> [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) · [Clean text and safety](/concepts/clean-text-and-safety.md) {.learn-more}

## Use both together

<CodeLanguageToggle :snippet="snippets['client-and-text-first-success']" />

This asks for `version: ["translation"]`, which returns Sefaria's default translation. That isn't always English. For Micah 6:8 today it is "THE JPS TANAKH: Gender-Sensitive Edition". The output is:

```text
THE JPS TANAKH: Gender-Sensitive Edition:
“You have been told, O mortal, what is good,<br>And what  G<small>OD</small> requires of you:<br>Only to do justice<br>And to love goodness,<br>And to walk modestly with your God;<span data-sefaria-note="0"></span>
1 footnote(s) kept separately.
```

Sefaria's poetry `<span class="...">` wrappers are gone. Ordinary formatting such as `<small>` and `<br>` stays. The footnote marker became an empty `<span data-sefaria-note="0">` placeholder. Its content is in `notes[0]`. The `typeof version.text !== "string"` check skips text for a whole chapter, which Sefaria sends as a list of strings.

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md) · [Give components your own data](/data-and-text-tools/give-components-your-own-data.md) {.learn-more}

## Next steps

- [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md)
- [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md)
- [Give components your own data](/data-and-text-tools/give-components-your-own-data.md)
- [How the toolkit works](/concepts/how-the-toolkit-works.md)
- [Client reference](/reference/client.md)
- [Text tools reference](/reference/text-transform.md)
