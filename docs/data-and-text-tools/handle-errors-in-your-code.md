---
title: "Use the data and text tools › Handle errors in your code"
description: "Tell apart documented Sefaria errors, contract errors, and network or cancellation failures in your own code, and decide what to retry and what to report."
---

<script setup>
import { data as snippets } from "./snippets.data.ts";
</script>

> Created/edited by GitHub Copilot; pending human review.

# Handle errors in your code

A generated call such as `text.getV3Texts({ client, path: { tref } })` either returns a result or throws. Three different failures need three different responses.

| Kind | Returned or thrown | How to detect | Retry? |
| --- | --- | --- | --- |
| Documented HTTP error | Returned | `error` is set; `response.status` has the code | No |
| Response doesn't match the API description | Thrown | Caught: `failure instanceof SefariaContractError` | Usually no; report it |
| Request failed or was cancelled | Thrown | Any other error, often a `TypeError` or an `AbortError` | Network failure: maybe. Cancellation: no |

This page covers errors in your own code. If a component on a visible page shows an error, see [Troubleshoot a page](/help/troubleshoot-a-page.md).

## Branch on each kind

<CodeLanguageToggle :snippet="snippets['client-errors']" />

```text
Sefaria error 404: Could not find title in reference
Unexpected response shape: {"operationId":"get-v3-texts","method":"GET","path":"/api/v3/texts/{tref}","status":200,"issues":[{"instancePath":"","keyword":"content-type","message":"Expected application/json, received text/html."}]}
Request failed: TypeError: fetch failed
Request failed: AbortError: Reader left the page
```

The demo passes stand-in `fetch` functions to `createSefariaClient({ fetch })` so each case happens on demand without the network. In real code, use `createSefariaClient()`.

- **Documented error, returned.** When Sefaria answers with a status its API description documents as an error (for the texts API, 400 and 404), you get `{ data: undefined, error, response }`. `error` is the documented body, already checked against the description. For the texts API it is `{ error: string }`. `response.status` has the status code. (If you pass `throwOnError: true`, the call throws that checked body instead.)
- **Contract error, thrown.** `SefariaContractError` means the response doesn't match the API description. Causes include a wrong body shape, invalid JSON, a content type the description doesn't list (such as an HTML error page), and a status the description doesn't document for that operation, such as an unexpected 500. The error has `operationId`, `method`, `path` (the path template, such as `/api/v3/texts/{tref}`), `status`, `issues`, and `response` (the original `Response`, if you need headers).
- **Anything else, thrown.** Usually the request failed (network, DNS, offline) or you cancelled it through an `AbortSignal` passed as `signal`. A mistake in your own call, such as an invalid `baseUrl`, also lands here. You get the original error or abort reason. The client never turns these into empty or success-shaped data. Treat a cancellation as expected, not as a fault.

## Read a validation path

Each entry in `issues` has these fields:

- `instancePath`: a JSON Pointer to the place in the response that doesn't match. An empty string means the whole response, as in the content-type issue above.
- `schemaPath`: which response schema in the API description was used. It isn't the exact rule that failed.
- `keyword`: the kind of mismatch, such as `invalid_type`, `content-type`, or `undocumented-status`.
- `message`: a readable explanation. It is optional in the type, but the client fills it in.

The path shows where the mismatch is. It doesn't say how the description should change.

## Should you retry?

The client doesn't retry anything automatically, so the decision is yours.

- A network failure may be worth retrying with backoff.
- A cancellation isn't: your code asked for it.
- A documented 404, such as an unknown reference, is unlikely to change if you simply retry.
- A contract error is also unlikely to go away by itself. Report it.

The client keeps a small in-memory cache per client. It stores only successful, checked responses, so errors are never cached.

## What to report

When you ask for help, include `operationId`, `method`, `path`, `status`, and the `issues` (`instancePath`, `keyword`, `message`). The snippet's report object has exactly these fields. Leave out personal data. See [Get support](/help/troubleshoot-a-page.md#get-support).

<span class="learn-more__label">Learn more:</span> [The client and Sefaria's API](/concepts/the-client-and-sefarias-api.md) · [Client reference](/reference/client.md) {.learn-more}
