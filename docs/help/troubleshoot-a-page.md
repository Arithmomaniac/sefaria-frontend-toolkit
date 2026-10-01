---
title: "Help › Troubleshoot a page"
description: "Match what you see on the page to its cause and fix, or get support."
humanReviewed: false
---

> Created/edited by GitHub Copilot; pending human review.

# Troubleshoot a page

Find what you see below, then follow the fix.

## Read the element's status

Each component has a `status` property with one of four values:

- `empty`: there is nothing to show. There is no input, or the data was prepared successfully and is empty or unresolved.
- `loading`: the element is fetching or preparing text.
- `ready`: the element prepared something to show. It may be partial.
- `error`: something failed. A first load failure shows a message. If a later reload fails, the element can keep the previous text while `status` is `error`.

Check `status` first. Then use the event for the cause.

The element fires `sefaria-<component>-error`, for example `sefaria-source-card-error`, when a live request or its preparation is rejected. The event's `detail` is `{ error, sref }`.

For the four elements other than the Reader, a documented 400 or 404 answer and invalid supplied data show an error without that event. The Reader does fire `sefaria-reader-error` when it rejects a seed you supplied and when its first (root) load fails. See [When there's nothing to show](/use-components/add-the-complete-reader.md#when-there-s-nothing-to-show).

There is no generic ready event, so read `status`.

```html
<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
<script>
  const card = document.querySelector("sefaria-source-card");
  card.addEventListener("sefaria-source-card-error", (event) => {
    console.log(event.detail.sref, event.detail.error);
    console.log(card.status);
  });
</script>
```

<span class="learn-more__label">Learn more:</span> [How the toolkit works](/concepts/how-the-toolkit-works.md#status) {.learn-more}

## Symptoms

### The page is stuck loading, or Sefaria is unreachable

**What you see:** the loading message stays, or an error message appears and `status` is `error`.

**Why:** the request to Sefaria did not complete. A network failure or a blocked request can cause this. The element keeps the original cause in the event's `error`. It does not retry on its own.

**Fix:**

- Check your network and any content-security rules that block requests to sefaria.org.
- Reload the page, or clear `sref` and set it back to start a new request.

### The reference is invalid or unknown

**What you see:** an error message from Sefaria, and `status` is `error`.

**Why:** some requests get a 400 or 404 answer with a message, and the component shows that message.

**Fix:** check the spelling of `sref`. Try a reference that you know works, such as `Micah 6:8`.

### Your supplied data is invalid

**What you see:** an error message, even though `sref` is set.

**Why:** when you set `data`, the element uses it and does not load by `sref`. If the data is invalid, the element shows an error and does not fall back to `sref`.

**Fix:** make the data match the shape the component expects, or remove `data` to load by `sref`. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md).

### Nothing is shown

**What you see:** a blank or empty message, and `status` is `empty` or `ready`.

**Why:** with `empty`, there is no input, or the prepared data is empty or unresolved. With `ready`, Sefaria may have returned no text for the edition you asked for. The component then shows an empty message such as "No primary text is available."

**Fix:** set `sref` or `data`. If the text is empty, try another reference or edition.

### The translation is wrong or missing

**What you see:** the wrong language, or a message that says the language is missing or that another language is shown.

**Why:** `translation-fallback` decides what happens when Sefaria reports that your `translation-language` is absent. The default depends on the element:

- Text Segment and Bilingual Segment default to `none`. They make no fallback request. Text Segment shows "No french text." Bilingual Segment keeps the primary side and shows that message on the translation side.
- Source Card and Reader default to `default`. They load Sefaria's default translation, which isn't always English. They show a notice that names the missing language and the language shown. For example, the notice for French says "french is unavailable" and then names english. This costs one extra request.
- Set `translation-fallback="default"` on a segment to show the fallback text. The segments show no notice.

No element falls back for an existing empty edition, a failed request, or an exact `version-title`.

**Fix:** pick a language or edition that the reference has. See [Choose what text readers see](/across-components/choose-what-text-readers-see.md).

### The vowels are wrong

**What you see:** vowel points or cantillation marks you didn't want, or missing ones.

**Why:** `vocalization-mode` accepts `taamim_and_nikkud` (the default), `nikkud`, and `none`. The value `none` removes vowel points and cantillation. It also removes sof pasuq (׃) and a paseq (׀) that follows a space. It keeps maqaf and ordinary punctuation. The element rejects other values.

**Fix:** set `vocalization-mode` to the value you want.

### The install fails

**What you see:** a 401, 403, or `E404` error from your package manager.

**Why:** common causes are:

- the wrong package name
- a token without `read:packages`
- an account without access
- a tag or version that doesn't exist

**Fix:** follow [Install and status](/help/install-and-status.md#packages).

### The client throws a validation error in your code

**What you see:** a thrown `SefariaContractError`.

**Why:** Sefaria answered in a way the client does not accept. Examples are an undocumented status, invalid JSON, or a body that doesn't match the schema.

By default, a documented HTTP error whose body passes validation comes back as `result.error`. With `throwOnError: true`, the client throws it. A malformed error body still throws `SefariaContractError`.

Each item in `issues` has an `instancePath`, such as `/versions/0/text`. It points to a place in the response. That place is not necessarily the field at fault.

**Fix:** read `issues` and handle both cases in your code. See [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) and [The client and Sefaria's API](/concepts/the-client-and-sefarias-api.md).

### The text looks wrong or has unsafe markup

**What you see:** stray tags, odd characters, or markup you don't trust.

**Why:** Sefaria text contains HTML-like markup, and stored text needs cleaning before you show it.

**Fix:** read [Clean text and safety](/concepts/clean-text-and-safety.md).

## Still stuck? Get support {#get-support}

The toolkit is experimental and has one maintainer. There is no promised response time.

To report a problem, [open an issue](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/issues/new) and include:

- the reference, such as `Micah 6:8`
- the component or function
- your browser or runtime, and its version
- the element's `status`
- the error event's `detail` or the thrown error
- the validation path (`instancePath`), if there is one
- the toolkit version. With `alpha`, include the `alpha` value from catalog.json at the time you reproduced the problem. Or reproduce it with a pinned address. Otherwise use the pinned or package version.

If the problem is with Sefaria's texts, translations, or API data, contact Sefaria through its [Contact Us page](https://developers.sefaria.org/page/contact-us).
