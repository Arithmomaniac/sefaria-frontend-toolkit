> Created/edited by GitHub Copilot; pending human review.

# @arithmomaniac/sefaria-client

Fetches Sefaria API responses and checks them against a corrected API description before your code uses them. It has 60 generated functions grouped by Sefaria's API sections and a bounded per-client response cache.

Experimental and unofficial. Names and addresses may change. This is not an official Sefaria product.

## Install

The packages are prereleases on GitHub Packages, not npmjs.com. GitHub Packages asks for a token even to download public packages. You need a GitHub personal access token (classic) with `read:packages`. Types are included; no `@types` package is needed. [Install and status › Packages](https://arithmomaniac.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) shows the setup and the install command.

## First success

<!-- Snippet owner: examples/site-snippets/client-first-success.ts. Keep this block identical. -->

```ts
import { createSefariaClient, text } from "@arithmomaniac/sefaria-client";

const client = createSefariaClient();

// Fetch one passage. The client checks the response before you see it.
const { data, error, response } = await text.getV3Texts({
  client,
  path: { tref: "Micah 6:8" },
});

if (data === undefined) {
  console.log(`Sefaria answered HTTP ${response.status}:`, error);
} else {
  for (const version of data.versions) {
    console.log(`${data.ref} · ${version.language} · ${version.versionTitle}`);
  }
}
```

## Next steps

- [Get checked data](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/start-here.html)
- [Handle errors in your code](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/handle-errors-in-your-code.html)
- [The client and Sefaria's API](https://arithmomaniac.github.io/sefaria-frontend-toolkit/concepts/the-client-and-sefarias-api.html)
- [Client reference](https://arithmomaniac.github.io/sefaria-frontend-toolkit/reference/client.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/IMPLEMENTATION.md).
