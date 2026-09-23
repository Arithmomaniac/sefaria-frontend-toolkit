> Created/edited by GitHub Copilot; pending human review.

# Render Sefaria text

Start with a Source Card for a passage, range, heading, aligned text, and attribution. Use smaller elements when the surrounding application already owns that context.

## Try the hosted examples

| Example | What to explore |
| --- | --- |
| <SiteLink to="/examples/playground/index.html?project=source-card">Source-card editor</SiteLink> | Supplied text and presentation with zero requests |
| <SiteLink to="/examples/explorer/source-card.html">Live source card</SiteLink> | Standalone loading after explicit activation |
| <SiteLink to="/examples/explorer/bilingual-segment.html">Live bilingual segment</SiteLink> | Primary/translation roles and layout |
| <SiteLink to="/examples/explorer/text-segment.html">Live text segment</SiteLink> | One selected edition, markup, and footnotes |
| <SiteLink to="/examples/explorer/ref-label.html">Live reference label</SiteLink> | Canonical labels and links |

## Put a Source Card in a browser app

```ts
import "@arithmomaniac/sefaria-web-components";

const card = document.createElement("sefaria-source-card");
card.sref = "Micah 6:8";
document.body.append(card);
```

Use supplied data first when the payload already exists:

```ts
card.data = validatedPayload;
```

Defined `data` is authoritative. To switch to standalone loading, clear it and assign `sref`:

```ts
card.data = undefined;
card.sref = "Micah 6:8";
```

The element validates and privately prepares both paths. Prepared HTML and child rendering state are not public inputs.

## Choose an acquisition source

The undefined `acquisition` value uses the lazy shared default. Assign `{ kind: "client", client }`, `{ kind: "capability", capability }`, or `{ kind: "disabled" }` when the host needs an explicit choice. Explicit failure or unsupported operations do not fall through.

## Change presentation without refetching

```ts
card.contentLanguage = "both";
card.layout = "side-by-side";
card.sideOrder = "translation-first";
card.vocalizationMode = "nikkud";
```

These assignments reuse private prepared content. Changing a reference or edition selector is a data operation.

## Composition and incomplete text

A Source Card owns one outer response and privately prepares every child pair. Ten items remain one outer request and zero child requests. One-sided positions remain partial; empty positions are not invented; incompatible shapes become projection failures.

For input precedence, errors, and reconnect behavior, read [How declarative components obtain and render data](data-flow.md). For annotations, continue with [Text markup](text-markup.md).
