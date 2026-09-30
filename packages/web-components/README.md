> Created/edited by GitHub Copilot; pending human review.

# @arithmomaniac/sefaria-web-components

Five browser-standard custom elements that show Sefaria texts, each loading by a reference or rendering data you supply.

Experimental and unofficial. Names and addresses may change. This is not an official Sefaria product.

## Install

The packages are prereleases on GitHub Packages, not npmjs.com. GitHub Packages asks for a token even to download public packages. You need a GitHub personal access token (classic) with `read:packages`. Types are included; no `@types` package is needed. [Install and status › Packages](https://arithmomaniac.github.io/sefaria-frontend-toolkit/help/install-and-status.html#packages) shows the setup and the install command.

## Elements

Import the package root once to register every element: `import "@arithmomaniac/sefaria-web-components";`. Each element loads by `sref` or renders data you supply through its `data` property.

- `<sefaria-text-segment>`: one passage in one edition
- `<sefaria-bilingual-segment>`: one passage in its primary edition with a translation
- `<sefaria-source-card>`: a source with its text and attribution
- `<sefaria-connections-panel>`: the commentaries and other texts connected to a reference
- `<sefaria-reader>`: a passage with its connected texts, and navigation between them

## First success

<!-- Snippet owner: examples/site-snippets/source-card-package.ts. Keep this block identical. -->

```ts
import "@arithmomaniac/sefaria-web-components";

// Importing the package root registers every element.
const card = document.createElement("sefaria-source-card");
card.setAttribute("sref", "Micah 6:8");
document.body.append(card);
```

## Next steps

- [Use components](https://arithmomaniac.github.io/sefaria-frontend-toolkit/use-components/start-here.html)
- [Use with a framework](https://arithmomaniac.github.io/sefaria-frontend-toolkit/use-components/use-with-a-framework.html)
- [Give components your own data](https://arithmomaniac.github.io/sefaria-frontend-toolkit/data-and-text-tools/give-components-your-own-data.html)
- [Components reference](https://arithmomaniac.github.io/sefaria-frontend-toolkit/reference/components.html)

<<<<<<< HEAD
For maintainers: [IMPLEMENTATION.md](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/IMPLEMENTATION.md).
=======
```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";

const reader = document.createElement("sefaria-reader");
reader.acquisition = {
  kind: "client",
  client: createSefariaClient(),
};
reader.setAttribute("sref", "Micah 6:8");
document.body.append(reader);
```

Reader owns source and links acquisition, cancellation, semantic history, Back, breadcrumbs, private preparation, and errors. Raw seeds initialize or transactionally replace state. Read-only `status`, `rootLoading`, `selectedRef`, `currentEntryId`, and `readerError` expose semantic diagnostics.

## Languages and editions

`translation-language="french"` requests French directly. Only Sefaria's missing-language warning permits one additional request for its default translation, which is not necessarily English. An existing but empty French edition stays empty. Exact edition titles never fall back.

```html
<sefaria-source-card
  sref="Micah 6:8"
  translation-language="french"
></sefaria-source-card>
<sefaria-bilingual-segment
  sref="Micah 6:8"
  translation-language="french"
  content-language="translation"
></sefaria-bilingual-segment>
<sefaria-text-segment
  sref="Micah 6:8"
  translation-language="french"
></sefaria-text-segment>
<sefaria-reader sref="Micah 6:8" translation-language="french"></sefaria-reader>
```

| Element | Presentation language | Acquisition language and editions |
| --- | --- | --- |
| Text Segment | One selected text | `translation-language` **or** strict `version-language`; optional `version-title` |
| Bilingual Segment | `content-language`: `both`, `primary`, `translation` | `translation-language`, `primary-version-title`, `translation-version-title` |
| Source Card | Same as Bilingual Segment | Same as Bilingual Segment |
| Reader | Same as Bilingual Segment | Same as Bilingual Segment; exact titles apply only to the root and its context |
| Connections Panel | Existing link previews | No independent preview language or edition requests |

`content-language` only changes visible sides; it does not change requests. `side-order` and `layout` still control arrangement. Source Card and Reader display actual edition/language attribution and accept `hide-attributions`; Text Segment and Bilingual Segment display no attribution and accept no such property.

For a strict French edition, add its exact title:

```html
<sefaria-source-card
  sref="Micah 6:8"
  translation-language="french"
  translation-version-title="Bible du Rabbinat 1899 [fr]"
></sefaria-source-card>
<sefaria-text-segment
  sref="Micah 6:8"
  version-language="french"
  version-title="Bible du Rabbinat 1899 [fr]"
></sefaria-text-segment>
```

Text Segment rejects simultaneous `version-language` and `translation-language`. Its title alone selects a primary edition. For DOM-free Text Segment requests, use `version: { translationLanguage: "french" }` instead of strict `version: { language: "french" }`.

Supplied data makes zero requests and must include the selected text or metadata proving the preferred language is absent. Reader carries the preferred language through navigation, but not a root's exact edition titles into unrelated works. Try French Micah and unavailable-French Berakhot in the [Source Card explorer](../../examples/explorer/source-card.html); see the [selection contract](../../docs/specs/components.md#language-and-edition-selection) for errors and request counts.

## Lifecycle and composition

- Disconnection aborts or invalidates eligible work; reconnect resumes only the still-eligible interrupted phase.
- Composite parents prepare children from captured data. Ten children use one parent request, or two for missing-language fallback, and zero child requests.
- Current failures become accessible state and component-specific error events. Stale completions publish nothing.
- The toolkit client remains the only response-cache owner.

## Public subpaths

| Goal | Entry point |
| --- | --- |
| Register all elements | `@arithmomaniac/sefaria-web-components` |
| Acquisition types/configuration | `@arithmomaniac/sefaria-web-components/acquisition` |
| Component raw request/selection types | Component-specific subpath |
| Shared raw Reader source qualification and raw seed types | `@arithmomaniac/sefaria-web-components/reader` |
| Advanced semantic/raw Reader facade: history, pins, budgets, entry info, records, and raw transitions | `@arithmomaniac/sefaria-web-components/reader-session` |

`./reader-session` remains supported for advanced spatial hosts, and `./reader` supplies the shared DOM-free source-qualification boundary. Neither exposes prepared rendering content. `./bindings` and `./reader-controller` are retired. See [Render text](../../docs/guides/render-text.md), [Reader navigation](../../docs/guides/reader-navigation.md), and the [component specification](../../docs/specs/components.md).
>>>>>>> origin/main
