> Created/edited by GitHub Copilot; pending human review.

# Get started

Start with the job that your product needs, not with the largest package. The toolkit has independently useful layers: validated Sefaria transport data, pure text preparation, focused declarative components, and a complete standalone Reader. You can stop at any layer.

<picture>
  <source media="(max-width: 640px)" srcset="./images/integration-depths-mobile.svg">
  <img src="./images/integration-depths.svg" alt="Choose the toolkit layer that matches your product">
</picture>

The arrows show ways to combine layers, not mandatory steps. A server can stop after validated transport. A search or AI pipeline can use only text preparation. A custom application can render validated transport data itself. Browser products can add one focused component or the complete standalone Reader.

| Your product needs | Start here |
| --- | --- |
| Validated Sefaria responses for a server, script, browser app, test, or MCP host | `@arithmomaniac/sefaria-client` |
| Safe text HTML, bounded previews, footnotes, or vocalization changes over data you already have | `@arithmomaniac/sefaria-text-transform` |
| Corrected data for your own UI | The client contracts plus text transforms |
| One citation, segment, passage card, popup, or connections view | A focused Web Component |
| Reading, connections, commentary navigation, and semantic history | The standalone Reader |

Headless means that no browser element is registered.

A host is the application that owns the component. It decides when live loading is activated, where the element appears, and whether to supply explicit acquisition.

## Use the client without components

Use `@arithmomaniac/sefaria-client` when your application wants supported Sefaria transport data but owns its own processing and presentation. The client is the runtime-validation boundary; it does not register elements or create prepared component state.

```ts
import { createSefariaClient, text } from "@arithmomaniac/sefaria-client";

const client = createSefariaClient();

export function loadValidatedText(tref: string) {
  return text.getV3Texts({
    client,
    path: { tref },
  });
}
```

`loadValidatedText` is the transport boundary that a server endpoint, search or indexing job, MCP tool, test harness, or custom application can call. Its returned value is validated against the operation and status contract before the application stores, transforms, or renders it. Documented HTTP errors remain typed response payloads. Invalid JSON, undocumented statuses, network failures, and aborts do not become empty or successful data. Continue with the [client package reference](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md) for the generated operations, schemas, validators, and error behavior.

## Use text transforms without the client

Use `@arithmomaniac/sefaria-text-transform` when text has already arrived through an API, server, fixture, stored record, or user-controlled boundary. Its operations are deterministic and DOM-free; they do not fetch data or register custom elements.

```ts
import { createTextPreview } from "@arithmomaniac/sefaria-text-transform";

export function prepareSearchPreview(apiHtml: string) {
  return createTextPreview(apiHtml, 3500);
}
```

The result contains bounded safe HTML, decoded visible text, and a truncation flag. The same package sanitizes reviewed Sefaria markup, extracts footnotes, and applies the three current vocalization modes. These operations fit search indexing, AI input preparation, terminal or desktop presentation, offline data, and any product that already has a renderer. Read the [text-transform package guide](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md) and [text-markup guide](guides/text-markup.md) for exact contracts.

## Use raw component data with your own renderer

The element path accepts corrected component-specific raw data and privately prepares it. If an application owns a completely different renderer, use the corrected client contracts and text-transform package directly rather than depending on private prepared component state.

## Add a focused component

Use the [component catalog](components.md) when the product needs one reference label, text segment, bilingual segment, Source Card, Popup, or Connections Panel.

1. Assign validated component-specific raw `data` for zero-request rendering, or assign `sref` for standalone loading.
2. Optionally assign a tagged client, host capability, or disabled acquisition choice.
3. Listen for semantic events and read public read-only status or diagnostics.

The [supplied-data lesson](learn/02-supplied-data.md) teaches the zero-request path first. The [live-data lesson](learn/03-live-data.md) adds `sref` after an explicit activation.

## Build a complete Reader

Use this path when users need bilingual text, connections, commentary navigation, and semantic history.

1. Create and connect `<sefaria-reader>`.
2. Assign an explicit acquisition source when the lazy browser default is not appropriate.
3. Assign `sref` as an attribute after the host's activation gate.
4. Observe read-only Reader status and semantic diagnostics.
5. Clear inputs or remove the element during host teardown.

Advanced spatial hosts use the supported `reader-session` semantic/raw facade for history, pins, budgets, `entryInfo`, stable raw records, and raw transitions. The `reader` subpath supplies shared raw source qualification. Neither advanced subpath exposes prepared rendering/content.

<SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open the standalone Reader preview</SiteLink>

## Installation status

Public GitHub Packages prereleases are available for installation. Package names are subject to change. These are npm-format packages hosted by GitHub Packages; they are not published on npmjs.com, and GitHub requires authentication even when their visibility is public.

Create a classic GitHub personal access token with `read:packages`. Keep the token in your user environment rather than a repository file:

```powershell
$env:NODE_AUTH_TOKEN = "<your classic GitHub token>"
```

Configure only the toolkit scope in your user-level npm configuration:

```ini
@arithmomaniac:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

Choose one published synchronized alpha version and use that exact version for every toolkit package:

```powershell
$version = "0.0.0-alpha.<run-id>.<run-attempt>"
pnpm add "@arithmomaniac/sefaria-client@$version" "@arithmomaniac/sefaria-text-transform@$version" "@arithmomaniac/sefaria-web-components@$version"
```

Do not commit a token or an expanded token value in `.npmrc`. GitHub Actions consumers can use an authorized repository `GITHUB_TOKEN` instead of a personal token. You can also evaluate the [interactive examples](examples.md) without installing packages, or use the repository-only [local package setup](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md#build-and-pack-the-library-tarballs) for integration qualification.

If a component, editor, Reader, or live operation behaves unexpectedly, start with the symptom-led [troubleshooting guide](guides/troubleshooting.md) before changing package, request, or browser policy.

Clone the source only to change the toolkit or run its complete validation. Contributor setup and commands remain in the repository [Development guide](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md).

## Continue

- [Choose a component](components.md)
- [Learn step by step](learn/01-web-components.md)
- [See runnable examples](examples.md)
- [Read task-focused guides](guides/index.md)
