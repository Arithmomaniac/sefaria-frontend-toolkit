---
title: "Concepts › The client and Sefaria's API"
description: "How the toolkit's client is generated from a pinned copy of Sefaria's API description, what it corrects and checks, and how its short-lived cache and drift check work."
---

> Created/edited by GitHub Copilot; pending human review.

# The client and Sefaria's API

The toolkit talks to Sefaria through one small piece of code, the client, the workspace package `@arithmomaniac/sefaria-client`. It is published to GitHub Packages as a prerelease, not to npm; see [Install and status](/help/install-and-status.md). This page explains where the client's types come from, what it checks, and how its cache behaves. It doesn't teach individual endpoints. For those, see [Sefaria's API reference](https://developers.sefaria.org).

## Where the client's types come from

Sefaria publishes a description of its API in the OpenAPI format. OpenAPI is a standard, machine-readable way to list the addresses you can request and the shape of JSON each one returns. Tools can turn that list into code.

The toolkit keeps a copy of Sefaria's description, and it doesn't fetch a new one at build time. The file `packages/client/openapi/upstream.json` holds the exact bytes of `docs/openAPI.json` from the Sefaria-Project repository. The file `packages/client/openapi/source.json` records the repository, the path, the commit SHA, and a SHA-256 checksum. Generation checks the bytes against it and stops if they differ.

From that copy, `pnpm openapi:generate` produces the types, one function for each of the 60 operations, and the schemas and response validators. A schema states which fields a JSON body must have and what type each one is. Generated files sit under `packages/client/src/generated`. Each has a header that says "Do not edit" and names the Sefaria commit. Running `pnpm openapi:check` regenerates the files and fails if the committed ones are stale.

The generated code is not the whole client. A small hand-written layer around it adds response checking and the cache. You create a client with `createSefariaClient()`.

The client changes when the pinned copy changes, when the corrections change, or when the generator changes.

## What the toolkit corrects

Sefaria's description doesn't always match what the server returns. The toolkit fixes these differences in `packages/client/openapi/overlay.yaml`. It's an OpenAPI Overlay: a standard format that lists edits to apply to an OpenAPI file. Generation merges the overlay into the pinned copy and generates the client from the result.

The policy is to review the pinned Sefaria source and its tests before adding a correction. A deployed response is used when the source doesn't show the shape.

Each correction has guards. A guard is a precondition that checks the part of the upstream file the correction changes. It can require that the part is absent, equal to an expected value, or matches a hash. Generation checks the guards before it applies the overlay. If one fails, generation stops with an error.

A guard proves that the part still has the shape it had when the correction was written. It doesn't prove the correction is still needed. A person decides that when a guard fails or when Sefaria changes its file.

<span class="learn-more__label">Learn more:</span> [The list of corrections](/reference/api-corrections.md) · [Client reference](/reference/client.md) {.learn-more}

## What validation catches

Before the client returns a response, it checks it against the contract for that method, path, and status. It parses JSON bodies with Zod, a schema library. That covers success bodies and the error bodies Sefaria documents. The content type must match a documented one.

One operation is checked differently. `GET /api/img-gen/{tref}` returns a PNG image. The client checks its status and content type, and it doesn't check the image with a schema.

A response fails the check when it has an undocumented status, isn't valid JSON, or doesn't match its schema. The client then throws `SefariaContractError`. The error carries:

- `operationId`, `method`, `path`, and `status`
- `issues`, a list of what failed
- the original `response`

Each entry in `issues` has an `instancePath`, a `schemaPath` (a location in the contract), and a `keyword`. It may also have a `message`. The example omits the other fields.

```json
{
  "instancePath": "/versions/0/text",
  "schemaPath": "…",
  "keyword": "invalid_union"
}
```

`instancePath` is a JSON Pointer: a path into the JSON that was received. Each segment is a key or an array position, so `/versions/0/text` means the `text` field of the first item in `versions`. The root of the response is the empty string.

`keyword` is Zod's issue code for a schema failure. Other checks use categories such as `invalid-json` and `content-type`.

Read it as where in the response the check failed. It isn't always the exact field at fault. It also doesn't tell you what correction the description needs. Something else may be wrong, such as the response itself or a fake `fetch` you supplied in a test.

If you report a validation error, include the `operationId`, the `status`, and each issue's `instancePath` and `keyword`. [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) shows how to read these fields.

### HTTP errors and network failures

By default, a documented non-2xx response whose body passes validation comes back as `result.error`. With `throwOnError: true`, the client throws it instead. Error-shaped payloads that Sefaria documents under HTTP 200 stay in `result.data`.

A network failure or an abort passes through unchanged. The client doesn't turn either one into empty data.

## The response cache

Each client has its own in-memory cache. It isn't shared between clients, and it isn't saved anywhere. When the client is discarded, its cache goes with it.

The defaults are `100 entries`, `10 MiB` of response bodies, and `five minutes`. You can change them inside the `cache` option:

```ts
createSefariaClient({
  cache: { ttlMs: 30_000, maxEntries: 50, maxBytes: 1_048_576 },
});
```

Pass `cache: false` to turn the cache off. The three limits go inside `cache`, not at the top level. The shape is `cache: { ttlMs, maxEntries, maxBytes }`.

The cache stores a response only when all of these are true:

- It's a `GET` response with status 200.
- It passed validation.
- It came from a generated operation.

It doesn't store requests that carry credentials, conditional requests, a few operations the client marks as not cacheable, or error-shaped answers. The cache key includes the method, the URL, the headers, and the fetch settings.

A cache hit means fewer network requests. The data is the same validated data the first request returned. The cache doesn't change who owns the data or what it looks like.

<span class="learn-more__label">Learn more:</span> [Client reference](/reference/client.md) · [How the toolkit works](/concepts/how-the-toolkit-works.md) {.learn-more}

## How drift is detected

Drift is when Sefaria's published description moves away from the pinned copy. The command `pnpm openapi:drift` looks for it. It finds the latest commit on the default branch of Sefaria-Project that changed `docs/openAPI.json`, downloads that file, and compares it with the pin. It reports added, removed, and changed paths and schemas. It also reports which correction guards would fail. A failed request or an unreadable file is an error, not "no drift".

A GitHub Actions workflow, `openapi-drift.yml`, runs the command every day and on demand. When drift exists, it creates or updates the open issue labeled `openapi-drift`. When the pin matches again, it closes that issue. It doesn't change the pin. A maintainer refreshes it.

The workflow also has an optional step that requests Copilot's coding agent and asks it to prepare a draft pull request. That step is optional and needs a separate token. It's not yet proven end to end.

Between drift checks, validation can still catch responses that break the pinned, corrected contract, for operations your code calls.

## What this page doesn't cover

The client doesn't retry requests, merge duplicate requests, or keep data after it's discarded. It has no shared cache. For documentation freshness, `pnpm check:api-docs` checks that the toolkit's own (non-generated) exported declarations and selected properties have JSDoc. It doesn't compare reference pages with the code.

If something on this page doesn't match what you see, [get support](/help/troubleshoot-a-page.md#get-support).
