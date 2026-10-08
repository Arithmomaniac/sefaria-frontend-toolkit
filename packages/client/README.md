> Created/edited by GitHub Copilot; pending human review.

# @sefaria/api-client

Fetches Sefaria API responses and checks them against a corrected API description before your code uses them. It has 60 generated functions grouped by Sefaria's API sections and a bounded per-client response cache.

A community-driven project with Sefaria backing and support. The toolkit is experimental; names and APIs may change.

## Install

```sh
npm install @sefaria/api-client@0.1.0-alpha.0
```

Installation is anonymous; no registry token is needed. Types are included; no `@types` package is needed. The npm `alpha` tag follows reviewed prereleases, while this exact version stays fixed. [Install and status › Packages](https://sefaria.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) covers versions and browser/CDN imports.

## First success

<!-- Snippet owner: examples/site-snippets/client-first-success.ts. Keep this block identical. -->

```ts
import { createSefariaClient, text } from "@sefaria/api-client";

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

- [Get checked data](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/start-here.html)
- [Handle errors in your code](https://sefaria.github.io/sefaria-frontend-toolkit/data-and-text-tools/handle-errors-in-your-code.html)
- [The client and Sefaria's API](https://sefaria.github.io/sefaria-frontend-toolkit/concepts/the-client-and-sefarias-api.html)
- [Client reference](https://sefaria.github.io/sefaria-frontend-toolkit/reference/client.html)

For maintainers: [IMPLEMENTATION.md](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/client/IMPLEMENTATION.md).
