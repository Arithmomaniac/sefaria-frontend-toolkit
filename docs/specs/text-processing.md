> Created/edited by GitHub Copilot; pending human review.

# Text-processing specification

## Status

This specification defines the current `@arithmomaniac/sefaria-text-transform` contract.

The package remains in the architecture because sanitization, vocalization, and footnote handling are pure cross-component operations.

## Responsibility

`@arithmomaniac/sefaria-text-transform` owns deterministic text changes. It has no network, DOM rendering, API transport, component view-model, or host responsibility.

Component pure factories call one normalization operation before text enters a view model. Component view models retain the full safe text and separate footnote records. Elements can call the vocalization operations only to derive a reversible local presentation from that immutable safe data; they do not reparse an API payload or repeat normalization.

## Common contract

### Bounded connected-text preview [Current]

`createTextPreview` calls `normalizeText` with footnotes, annotations, named entities, and references disabled. It returns balanced safe HTML, decoded visible text, and a truncation flag. Its bound counts grapheme clusters of rendered text, not raw HTML bytes or UTF-16 units. Entities count as decoded text, line breaks count as separators, and combining sequences spanning inline nodes remain intact. It does not cut raw markup or introduce browser dependencies.

The connections consumer uses a 3,500-grapheme bound per legacy language channel. Recursive API leaves are consumed in source order with separators; output is bounded and traversal is linear, without repeated flattening or growing-prefix concatenation. The implementation uses the package's existing parser dependencies and rejects invalid limits. Truncation is explicit, never an empty-content fallback.

Every public operation must:

- be deterministic
- read no global state
- make no request
- preserve text that the selected operation does not target
- return an explicit result or throw a standard exception for programmer misuse
- include malformed, hostile, and adversarial Unicode cases

The package can use a standards parser internally. Its public operations remain independent of browser DOM globals.

## Markup source classes

Markup is classified before it is allowed or removed. A tag accepted by one Sefaria subsystem is not automatically safe or meaningful in this package.

| Source class | Meaning | Contract treatment |
| --- | --- | --- |
| Persisted text markup | Tags and attributes accepted by Sefaria's text-record contract | Candidate input that still requires a local semantic and security decision |
| API-generated markup | Markup added by a response adapter, such as wrapped entities | Recognized when a Core API return format can produce it |
| Web-generated rendering markup | Markup created after the API response for one Web interaction or layout | Not accepted from untrusted API HTML unless this specification lists it as a tolerated inert form |
| Legacy or out-of-contract markup | Markup that can survive old imports or direct writes despite not belonging to the persisted contract | Deterministically removed or unwrapped without becoming an approved contract |
| Hostile or active content | Executable content, event handlers, dangerous URLs, embedded documents, or equivalent attack forms | Removed under a rule that no option can widen |

## Markup contract

### Ordinary inline text

The normalizer preserves these attribute-free semantic tags:

`b`, `strong`, `i`, `em`, `u`, `small`, `sup`, and `sub`.

The obsolete `big` tag becomes `<span style="font-size: larger;">...</span>`. This generated fixed style is the only output style; incoming style attributes are never copied.

A content-bearing ordinary `i` is italic text. It is not an annotation merely because other Sefaria features also use `i`.

An ordinary `sup` remains inert text. The component must not make every superscript interactive.

### Line breaks

The normalizer preserves `br` and emits one canonical form.

The text API uses `br` for line structure, including poetry versions. Web-generated poetry layout classes are not API text markup and are not allowed merely because the Web reader creates them later.

### Direction wrappers

The normalizer preserves `span[dir]` only when `dir` is `ltr`, `rtl`, or `auto`.

An unclassified `span` loses its attributes but preserves its children. A `span` with no remaining semantic attribute or approved class is unwrapped.

### Masorah markup

The normalizer recognizes these exact source class tokens:

- `mam-spi-pe`
- `mam-spi-samekh`
- `mam-spi-invnun`
- `mam-kq`
- `mam-kq-k`
- `mam-kq-q`
- `mam-kq-trivial`

The `mam-spi-*` forms mark paragraph or section structure. The `mam-kq*` forms mark ketiv/qere or related textual distinctions.

Every recognized MAM span remains content-bearing and preserves its exact source text. The source class maps to a stable semantic `data-sefaria-mam` value:

| Source class     | Canonical value   |
| ---------------- | ----------------- |
| `mam-spi-pe`     | `petuchah`        |
| `mam-spi-samekh` | `setumah`         |
| `mam-spi-invnun` | `inverted-nun`    |
| `mam-kq`         | `ketiv-qere`      |
| `mam-kq-k`       | `ketiv`           |
| `mam-kq-q`       | `qere`            |
| `mam-kq-trivial` | `trivial-variant` |

The canonical value describes the textual phenomenon rather than retaining Sefaria's abbreviated CSS class vocabulary. Paragraph and section markers do not emit a duplicate `data-sefaria-label`; their exact visible notation remains in the span content.

The normalizer does not accept an arbitrary `mam-*` prefix. A new class requires source evidence and a specification change.

This package preserves the semantic markers but does not style or interpret them. Component work owns presentation.

### Footnote markup

A footnote pair is:

```html
<sup class="footnote-marker">marker</sup><i class="footnote">body</i>
```

The class can appear among other source class tokens, but only the reviewed token survives. Parsed whitespace can occur between the marker and body.

An `i.footnote` can contain ordinary nested markup, including another ordinary `i`.

`sup.endFootnote` becomes an empty `span[data-sefaria-end-footnote]` when footnotes and inline annotations are enabled.

### Inline commentary markup

Sefaria stores commentary placement metadata in an empty `i`:

```html
<i data-commentator="Magen Avraham" data-order="3" data-label="ג"></i>
```

`data-commentator` identifies the commentary. `data-label`, when present, is the displayed label used by Sefaria Web. Otherwise `data-order` supplies the order and possible label.

The normalizer emits an empty `span[data-sefaria-commentator]` with optional `data-sefaria-order` and `data-sefaria-label`. A validated, source-scoped candidate can add `data-sefaria-ref` when commentator, order, and label match exactly and identify one distinct target. Missing, ambiguous, or conflicting evidence emits no reference. The transform does not request links, choose a first match, or encode Hebrew numerals.

Malformed source attributes follow standards-parser recovery. The sanitizer does not guess a value that the parser could not recover.

### Structural overlay markup

Sefaria stores page and column transitions in an empty `i`:

```html
<i data-overlay="Vilna Pages" data-value="2a"></i>
```

The normalizer emits an empty span with `data-sefaria-overlay` and `data-sefaria-value`.

Overlay names are data and are not a closed enumeration. Source and deployed examples include `Vilna Pages`, `Venice Columns`, and `Venice Pages`; a safe unknown value remains inert rather than being discarded.

This package does not render transition labels or expose an overlay-extraction API without a concrete component consumer.

### Rendered annotation markers

`sup.itag` is produced by Sefaria Web after it selects and formats a commentary placement. It becomes an empty `span[data-sefaria-commentary-marker]`.

`sup.endFootnote` and `sup.itag` preserve their text only. No source metadata is inferred from them.

### Reference links

A reference link is an `a` with a nonblank `data-ref`. When enabled, it becomes an inert content-bearing `span[data-sefaria-ref]`. Optional `data-ven`, `data-vhe`, and approved `dir` become `data-sefaria-ven`, `data-sefaria-vhe`, and `dir`. The normalizer removes `href`, `data-range`, `data-scroll-link`, classes, and every other attribute. It never derives a reference from a URL.

### Named-entity links

A named-entity link is:

```html
<a
  class="namedEntityLink"
  data-slug="entity-slug"
  data-range="start-end"
  href="/topics/entity-slug"
  >text</a
>
```

`data-slug` is required. When enabled, the anchor becomes a content-bearing `span[data-sefaria-slug]`. URL and source-character range metadata are discarded.

### Category and generic links

Sefaria can generate `a.categoryLink[data-category-path][data-range]`, but no Core component owns category navigation. Category anchors are always unwrapped to their children.

Every other anchor, including an unrelated safe HTTPS anchor, is also unwrapped. Normalized text never supplies generic outbound navigation.

### Images

Sefaria's persisted text contract permits `img[src][alt]`, but the selected Core evidence has no representative live image fixture and no component owns image loading.

The normalizer removes every image and replaces it with escaped `alt` text. An image without `alt` produces no output.

Image rendering and source-origin policy require a later specification change supported by a concrete consumer and fixture.

### Unsupported wrappers

An unknown non-active inline element is unwrapped and its children are preserved.

Block elements are not approved text-body markup. `p`, `div`, lists, headings, tables, blockquotes, and other non-active block wrappers are unwrapped. One deterministic separator is inserted at block boundaries so adjacent text does not concatenate.

Attributes on unsupported wrappers are discarded.

### Active content

The normalizer removes an active element and all of its descendants. This includes:

- `script`
- `style`
- `template`
- `iframe`
- `object`
- `embed`
- SVG or MathML content
- equivalent embedded or executable surfaces

The normalizer never unwraps an active subtree because its text can itself contain executable source or misleading fallback content.

### Attribute policy

The normalizer removes:

- every `on*` event attribute, regardless of case or encoding
- every incoming inline `style`
- unknown class tokens
- unknown `data-*` attributes
- `data-target-module`
- Linker debugging classes
- attributes not assigned to the recognized semantic family

Input `data-sefaria-*` fields are untrusted and removed before canonical output metadata is generated. A generic `data-sefaria-kind` discriminator is not part of the output grammar. An option can remove an approved feature; no option can preserve an otherwise unapproved attribute, class, or tag.

## Vocalization

### Public contract

```ts
type VocalizationMode = "taamim_and_nikkud" | "nikkud" | "none";

applyVocalization(
  text: string,
  mode: VocalizationMode,
  options?: { paseq?: "always" | "after-space" },
): string;

applyVocalizationToHtml(
  html: string,
  mode: VocalizationMode,
  options?: { paseq?: "always" | "after-space" },
): string;
```

Each mode is a preset over separate cantillation and vowel controls. Internal code keeps those controls separate.

The function accepts plain text or parsed text-node content. It must not run over raw markup because Unicode changes can corrupt attributes.

`applyVocalizationToHtml` parses an already-sanitized HTML fragment, applies the same vocalization operation only to text nodes, and deterministically serializes the result. It does not sanitize input or widen the accepted markup contract. Component factories use this operation rather than implementing another HTML parser.

### Modes

| Mode | Cantillation | Vowel marks | PASEQ |
| --- | --- | --- | --- |
| `taamim_and_nikkud` | Preserve | Preserve | Preserve |
| `nikkud` | Remove | Preserve | Apply the selected removal policy |
| `none` | Remove | Remove | Apply the selected removal policy |

`none` also removes U+05C3 SOF PASUQ, matching Sefaria's full vocalization-removal expressions. `nikkud` preserves it.

Reordered combining marks are handled by code-point class. The function does not normalize caller text before or after transformation.

Unsupported runtime mode or PASEQ values throw `TypeError`. Valid options have no conflicting combination.

### PASEQ

Sefaria Web and the deployed Linker remove U+05C0 PASEQ wherever their cantillation-removal path sees it. Sefaria Mobile removes PASEQ only after whitespace and removes that preceding whitespace.

`paseq: "always"` removes every U+05C0 while preserving surrounding whitespace.

`paseq: "after-space"` removes a PASEQ only when immediately preceded by whitespace and removes that preceding whitespace. A PASEQ without preceding whitespace remains.

The default is `after-space`.

Compatibility results must identify the selected behavior and show differing Unicode code points.

### Required cases

- empty text
- text without Hebrew
- each vocalization mode
- both PASEQ policies with and without preceding whitespace
- PASEQ separated from whitespace by a removable source code point
- SOF PASUQ preserved by `nikkud` and removed by `none`
- combining marks in an unexpected order
- text that is already unpointed
- Hebrew mixed with English, punctuation, and numbers
- invalid runtime option values

## Normalization

### Public contract

```ts
interface NormalizedFootnote {
  readonly key: number;
  readonly markerHtml: string;
  readonly contentHtml: string | null;
}

interface NormalizedText {
  readonly bodyHtml: string;
  readonly notes: readonly NormalizedFootnote[];
}

normalizeText(html: string, options?: NormalizeTextOptions): NormalizedText;
```

`normalizeText` is the only public safety and structure operation. Every option defaults to `true` and can only remove approved features. `allowFootnotes: false` removes recognized marker/body pairs. `allowInlineAnnotations: false` removes commentary, overlay, `sup.itag`, and `sup.endFootnote` metadata. `allowRefLinks: false` and `allowNamedEntities: false` unwrap those anchors to visible children.

Every `*Html` field is independently balanced and safe for HTML-body insertion. The result contains no URL, event handler, copied style, unknown attribute, unknown class, or caller-supplied `data-sefaria-*` field.

### Footnote result

A paired marker and body produces one empty body placeholder and one source-ordered note:

```html
Text<span data-sefaria-note="0"></span>
```

```ts
[{ key: 0, markerHtml: "*", contentHtml: "<b>Explanation</b>" }];
```

A marker without a following body has `contentHtml: null`. A present empty body has `contentHtml: ""`. An orphan `i.footnote` remains ordinary italic content. Duplicate labels are valid because the local key, not the label, identifies a note. Nested notes share the same source-ordered key space.

Keys are zero-based and local to one result. They are not DOM IDs or durable identities. The element decorates placeholders and owns accessibility and interaction.

### Commentary references

`NormalizeTextOptions.commentaryReferences` accepts narrow `{ commentator, order?, label?, ref }` candidates. Numeric orders must be finite safe integers and are matched as exact strings after conversion; `1.1` is rejected rather than collapsed to `1`.

The marker's commentator, order, and label must exactly identify one distinct target. Repeated identical targets deduplicate. Missing, ambiguous, or conflicting targets leave the marker without `data-sefaria-ref`. The transform never selects the first result, parses a reference, or requests link data.

### Output bound

Body, marker, and content serialization share one output budget: eight times the input length or 64 KiB, whichever is larger. Exceeding the budget throws `RangeError`.

### Information loss

`return_format=text_only` removes footnote content, not only tags. The mobile `stripItags` path and the v3 `strip_only_footnotes` return format also remove annotation families before rendering. Normalization cannot reconstruct content removed before it receives the string, so an empty `notes` array does not prove that the source had no notes.

### Required cases

- every documented tag and semantic subtype
- obsolete-tag normalization
- every canonical output attribute
- unsupported attributes and preexisting `data-sefaria-*` fields
- unbalanced and malformed markup
- nested, missing, empty, orphan, duplicate-label, and direction-inheriting notes
- exact, missing, duplicate, ambiguous, and invalid commentary candidates
- entity-encoded text
- line breaks and Masorah markers
- event handlers, copied styles, active subtrees, images, unknown classes, and unknown data attributes
- disabled feature options
- deeply nested hostile markup
- deterministic attribute order and serialization
- aggregate output-budget rejection

## Processing boundary

API schema validation and HTML normalization are different controls. `@arithmomaniac/sefaria-client` validates unknown JSON structure. `@arithmomaniac/sefaria-text-transform` makes approved HTML safe for rendering.

A component pure factory calls `normalizeText` once and stores `bodyHtml` plus note records in its component-specific view model. If validated link evidence is supplied, a non-DOM component helper validates unknown `inline_reference` fields, scopes links to the exact base reference and selected edition, and passes only narrow commentary candidates to the transform.

Raw payload HTML must not be stored in a component view model for later interpretation. The element does not repeat normalization or API parsing. Full `taamim_and_nikkud` mode renders the original safe fields directly and performs zero vocalization calls. A non-full mode derives every HTML field through `applyVocalizationToHtml`, always from the immutable original view model. The element then replaces canonical note placeholders with presentation markup from matching local note records.

## Compatibility evidence

Compatibility tests compare retained pure behavior with pinned Sefaria implementations or fixed deployed fixtures.

A text difference report includes:

- the input reference or fixture name
- expected and actual text
- the first different index
- nearby Unicode code points
- the selected operation and options

Known intentional differences remain separate from passes and failures.

Broad corpus comparison and compatibility publication belong to #14. This package uses only small source-backed characterization fixtures and labeled synthetic hostile inputs.

## Completion criteria

`@arithmomaniac/sefaria-text-transform` is complete for Core when:

- the specification classifies every approved, unwrapped, removed, and deferred markup family
- evidence identifies whether each family is persisted, API-generated, Web-generated, legacy, live-confirmed, source-only, or synthetic
- the package implements vocalization and one structured normalization operation
- every named case has a deterministic test traceable to the markup contract
- normalization uses an explicit allowlist and emits no URLs
- unsafe markup does not reach component view models
- rendering IDs remain outside transform output
- no operation imports a client, component element, host API, or browser DOM global
- a clean checkout passes `pnpm check`
