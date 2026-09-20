> Created/edited by GitHub Copilot; pending human review.

# `@arithmomaniac/sefaria-text-transform`

`@arithmomaniac/sefaria-text-transform` provides deterministic, DOM-free operations for Sefaria text HTML and Hebrew vocalization.

The committed source manifest remains private to prevent accidental publication. Public GitHub Packages prereleases are available for authenticated installation; the package name is subject to change, and it is not published on npmjs.com. Follow the repository [installation instructions](../../docs/get-started.md#installation-status).

For an illustrated tour of the input, read [Text markup](../../docs/guides/text-markup.md). For the surrounding client and component pipeline, read [How the pieces fit together](../../docs/guides/data-flow.md).

## Processing order

Component pure factories process text in this order:

1. Call `normalizeText` once on API HTML.
2. Store its safe `bodyHtml` and source-ordered note records in the component view model.
3. Call `applyVocalizationToHtml` on each safe HTML field when deriving a non-full display mode.
4. Let the request-free element decorate local `data-sefaria-note` placeholders from the matching note records.

API validation and HTML sanitation are separate controls. `@arithmomaniac/sefaria-client` validates the JSON response shape; this package restricts markup inside valid string fields.

## Implementation notes

### Parsing and serialization

The package parses fragments in HTML mode. This decodes entities and applies browser-style recovery to malformed markup. The package never returns the parser's original source string. Its serializers escape text and attribute values, sort retained attributes, and emit canonical markup. `applyVocalizationToHtml` uses the same serializer but does not apply the sanitizer's allowlist.

The parser, serializers, and traversal helpers are iterative. They can handle realistic deep nesting without exhausting the JavaScript call stack.

### Normalization traversal

The normalizer assigns one of five actions to each parsed element: retain a reviewed element, unwrap its children, remove its entire subtree, replace it with text, or unwrap it as a block with a deferred separator. Only the retain action can emit a tag or attribute. Parser recovery cannot make unsupported source markup trusted.

Block separators are deferred until visible content appears. This prevents adjacent legacy block wrappers from concatenating words without introducing leading, trailing, or duplicate spaces.

### Footnote normalization

The same traversal recognizes a marker followed by optional whitespace and a footnote body. It replaces the pair with an empty key-only placeholder and emits independently balanced marker and content HTML. Missing content is `null`; present-empty content is `""`.

Body and note serialization share one output limit. Exceeding eight times the input length or 64 KiB, whichever is larger, throws `RangeError` instead of producing unbounded synchronous output.

### Bounded connected-text previews

```ts
import { createTextPreview } from "@arithmomaniac/sefaria-text-transform";

const preview = createTextPreview(apiHtml, 3500);
```

The operation runs the normalizer with footnotes and metadata disabled, then returns balanced safe `html`, decoded visible `text`, and `truncated`. The limit counts rendered grapheme clusters rather than raw HTML or UTF-16 units, so entities and combining sequences are not cut incorrectly. It remains deterministic and DOM-free.

## Vocalization

```ts
import { applyVocalization } from "@arithmomaniac/sefaria-text-transform";

const unpointed = applyVocalization("בְּרֵאשִׁ֖ית", "none");
```

`taamim_and_nikkud` preserves all marks, `nikkud` removes cantillation, and `none` removes cantillation, vowel marks, and U+05C3 SOF PASUQ. PASEQ removal defaults to the mobile-style `after-space` behavior; pass `{ paseq: "always" }` for the Web/Linker-style behavior.

Do not pass raw HTML to `applyVocalization`. It operates on plain text or parsed text-node content.

Use `applyVocalizationToHtml` for an already-sanitized HTML fragment. It changes only text nodes and preserves markup and attribute values; it does not sanitize its input.

## Text normalization

```ts
import { normalizeText } from "@arithmomaniac/sefaria-text-transform";

const result = normalizeText(apiText, {
  allowFootnotes: true,
  allowInlineAnnotations: true,
  allowNamedEntities: false,
  allowRefLinks: true,
});
```

All options default to `true` and can only remove approved features. They cannot expand the fixed tag, attribute, or semantic allowlist.

`result.bodyHtml` is directly renderable safe HTML. Footnote pairs become empty `<span data-sefaria-note="N"></span>` placeholders, while `result.notes` holds `{ key, markerHtml, contentHtml }` records. Every returned HTML field is independently balanced and safe for HTML-body insertion.

The normalizer preserves visual formatting but turns source metadata into inert meaning-specific spans. Reference anchors become `span[data-sefaria-ref]`; named entities become `span[data-sefaria-slug]`; commentary, overlay, Masorah, and note metadata use their corresponding `data-sefaria-*` fields. It removes every unsupported attribute, every URL, active content, and unknown semantic class.

Optional `commentaryReferences` can add `data-sefaria-ref` to an exact commentary marker match. The candidates must come from validated, source-scoped Sefaria link evidence. Missing, ambiguous, or conflicting evidence emits no reference; the transform never guesses one.

```ts
const { bodyHtml, notes } = normalizeText(apiText);
```

Footnote keys are zero-based and local to one result. They are not DOM IDs or durable identities. The consuming component owns visual marker decoration, accessibility relationships, and interaction.

## Evidence and compatibility

The [text-processing specification](../../docs/specs/text-processing.md) defines every accepted and removed markup family. [Evidence](../../docs/evidence.md) records the pinned Sefaria source and dated deployed examples. The current qualification is representative, not exhaustive; [Development](../../docs/development.md) distinguishes delivered qualification from broader corpus work.
