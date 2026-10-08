> Created/edited by GitHub Copilot; pending human review.

# `@sefaria/web-components` implementation notes

These notes are for maintainers. They were moved unchanged from the package README, which is now a short entry point. For usage, see the [documentation site](https://sefaria.github.io/sefaria-frontend-toolkit/).

The package provides six declarative Lit elements. Every element accepts standalone `sref`. The five ordinary elements also accept authoritative component-specific raw `data`; Reader accepts transactional raw source/connections seeds. Prepared rendering is private.

## Supplied data

```ts
import {
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@sefaria/api-client";
import "@sefaria/web-components";

import payload from "./micah-6-8.json";

const card = document.createElement("sefaria-source-card");
card.data = zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
document.body.append(card);
```

Defined ordinary-element `data` is authoritative, including valid empty and invalid data, and makes zero requests.

## Standalone `sref`

```ts
import "@sefaria/web-components";

const card = document.createElement("sefaria-source-card");
card.setAttribute("sref", "Micah 6:8");
document.body.append(card);
```

The undefined `source` value lazily uses one shared toolkit client per loaded module instance. Assign `{ kind: "client", client }`, `{ kind: "custom", loader }`, or `{ kind: "disabled" }` for an explicit source. Explicit failure or unsupported operations never fall through to browser HTTP.

## Prebuilt Reader

```ts
import { createSefariaClient } from "@sefaria/api-client";
import "@sefaria/web-components";

const reader = document.createElement("sefaria-reader");
reader.source = {
  kind: "client",
  client: createSefariaClient(),
};
reader.setAttribute("sref", "Micah 6:8");
document.body.append(reader);
```

Reader owns source and links acquisition, cancellation, semantic history, Back, breadcrumbs, private preparation, and errors. Raw seeds initialize or transactionally replace state. Read-only `status`, `rootLoading`, `selectedRef`, `currentEntryId`, and `readerError` expose semantic diagnostics.

## Languages and editions

`language="french"` on Text Segment, or `translation-language="french"` on a two-sided component, requests French directly. Only Sefaria's missing-language warning permits one additional request for its default translation when `translation-fallback="default"`, which is not necessarily English. An existing but empty French edition stays empty. Exact edition titles never fall back.

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
<sefaria-text-segment sref="Micah 6:8" language="french"></sefaria-text-segment>
<sefaria-reader sref="Micah 6:8" translation-language="french"></sefaria-reader>
```

| Element | Presentation language | Acquisition language and editions |
| --- | --- | --- |
| Text Segment | One selected text | Optional `language` for original or translated text; optional `version-title` |
| Bilingual Segment | `content-language`: `both`, `primary`, `translation` | `translation-language`, `primary-version-title`, `translation-version-title` |
| Source Card | Same as Bilingual Segment | Same as Bilingual Segment |
| Reader | Same as Bilingual Segment | Same as Bilingual Segment; exact titles apply only to the root and its context |
| Connections Panel | Existing link previews | No independent preview language or edition requests |

`content-language` only changes visible sides; it does not change requests. `side-order` and `layout` still control arrangement. The four text-owning elements display actual edition/language attribution and accept `hide-attributions`.

For a strict French edition, add its exact title:

```html
<sefaria-source-card
  sref="Micah 6:8"
  translation-language="french"
  translation-version-title="Bible du Rabbinat 1899 [fr]"
></sefaria-source-card>
<sefaria-text-segment
  sref="Micah 6:8"
  language="french"
  version-title="Bible du Rabbinat 1899 [fr]"
></sefaria-text-segment>
```

Text Segment uses one optional `language` input; omission selects primary. Its title alone selects a primary edition. For DOM-free Text Segment requests, use `version: { language: "french" }` or `version: {}` for primary, with an independent optional `versionTitle`. The former Text Segment `version-language` / `versionLanguage`, `translation-language` / `translationLanguage`, and `version.translationLanguage` are removed without aliases in the next alpha.

Supplied data makes zero requests and must include the selected text or metadata proving the preferred language is absent. Reader carries the preferred language through navigation, but not a root's exact edition titles into unrelated works. Try French Micah and unavailable-French Berakhot in the [Source Card explorer](../../examples/explorer/source-card.html); see the [selection contract](../../docs/specs/components.md#language-and-edition-selection) for errors and request counts.

## Lifecycle and composition

- Disconnection aborts or invalidates eligible work; reconnect resumes only the still-eligible interrupted phase.
- Composite parents prepare children from captured data. Ten children use one parent request, or two for missing-language fallback, and zero child requests.
- Current failures become accessible state and component-specific error events. Stale completions publish nothing.
- The toolkit client remains the only response-cache owner.

## Public subpaths

| Goal | Entry point |
| --- | --- |
| Register all elements | `@sefaria/web-components` |
| Data-source types/configuration | `@sefaria/web-components/data-source` |
| Component raw request/selection types | Component-specific subpath |
| Shared raw Reader source qualification and raw seed types | `@sefaria/web-components/reader` |
| Advanced semantic/raw Reader facade: history, pins, budgets, entry info, records, and raw transitions | `@sefaria/web-components/reader-session` |

`./reader-session` remains supported for advanced spatial hosts, and `./reader` supplies the shared DOM-free source-qualification boundary. Neither exposes prepared rendering content. `./bindings` and `./reader-controller` are retired. See [Render text](../../docs/data-and-text-tools/clean-up-stored-sefaria-text.md), [Reader navigation](../../docs/use-components/add-the-complete-reader.md), and the [component specification](../../docs/specs/components.md).
