> Created/edited by GitHub Copilot; pending human review.

# Examples

These private examples exercise the toolkit's public package entry points from the workspace. They are not published packages or evidence of official Sefaria ownership.

## Supplied-data component states

The [authored component workbench](explorer/authored.html) renders supplied raw component data and makes zero requests. Use its component, scenario, theme, width, and diagnostics controls, or open a stable deep link directly:

| Component | Public subpath | Retained scenarios | Example deep link |
| --- | --- | --- | --- |
| Reference label | `@arithmomaniac/sefaria-web-components/ref-label` | resolved, loading, unresolvable, HTTP error | [HTTP error](explorer/authored.html?component=ref-label&scenario=error) |
| Text segment | `@arithmomaniac/sefaria-web-components/text-segment` | populated, loading, empty, error, markup and footnotes | [Populated text](explorer/authored.html?component=text-segment&scenario=data) |
| Bilingual segment | `@arithmomaniac/sefaria-web-components/bilingual-segment` | populated, loading, partial, empty, error | [One-sided partial data](explorer/authored.html?component=bilingual-segment&scenario=partial) |
| Source card | `@arithmomaniac/sefaria-web-components/source-card` | one item, range, hidden addresses, one-sided, loading, empty, error, selection | [Range with diagnostics](explorer/authored.html?component=source-card&scenario=many-items&diagnostics=1) |
| Connections panel | `@arithmomaniac/sefaria-web-components/connections-panel` | summary, detail, metadata-only, loading, empty, error | [Detailed connections](explorer/authored.html?component=connections-panel&scenario=details) |
| Reader | `@arithmomaniac/sefaria-web-components/reader` | paired, source-only, connections-only, loading, unavailable, truncated history | [Truncated history](explorer/authored.html?component=reader&scenario=truncated-history&width=720) |

Runnable scenario definitions live in [`explorer/src/authored`](explorer/src/authored/). Selecting an authored scenario never starts a live operation.

## Editable supplied-data projects

The [component playground](playground/index.html?project=source-card) uses one reusable HTML/CSS/plain-JavaScript editor for seven maintained projects. Each project renders useful output beside the editable files, validates bounded local payloads through public client schemas, assigns public raw data and declarative element properties, and makes zero Sefaria requests.

| Project ID | Demonstrated local behavior |
| --- | --- |
| `ref-label` | Switch between a validated resolved reference and an unresolved state. |
| `text-segment` | Select the exact Hebrew or English edition from the supplied response. |
| `bilingual-segment` | Change side order while retaining payload-owned language roles and directions. |
| `source-card` | Select a source row and change vocalization without requesting replacement data. |
| `popup` | Open an anchored popup, close it with Escape, and restore trigger focus. |
| `connections-panel` | Change captured category, page, and preview visibility with zero I/O. |
| `reader` | Change local presentation over exact Micah 6:8 source and links coverage and show an explicit limitation for uncovered navigation. |

Stable built routes use `playground/index.html?project=<id>`. Source and optional request-bearing live-demo links remain trusted controls outside the edited preview.

## Live data and interaction

The [component explorer](explorer/README.md) keeps live actions separate from supplied-data selection. Each page opens without a Sefaria request; **Start live demo** or an example preset begins the operation. The page assigns `sref` only after activation, optionally supplies a tagged acquisition source, and lets the element own loading, cancellation, private preparation, and error presentation.

| Destination | What to try | Public package/subpath |
| --- | --- | --- |
| [Text segment](explorer/text-segment.html) | Hebrew, English with footnotes, retained markup, absent language, and wrong granularity | `@arithmomaniac/sefaria-web-components/text-segment` |
| [Bilingual segment](explorer/bilingual-segment.html) | Exact editions, missing translation, ranges, layout, side order, and displayed languages | `@arithmomaniac/sefaria-web-components/bilingual-segment` |
| [Reference label](explorer/ref-label.html) | Segment, range, spanning range, commentary, unresolvable references, link and language controls | `@arithmomaniac/sefaria-web-components/ref-label` |
| [Source card](explorer/source-card.html) | Bounded live source loading, ranges, side selection, layout, and order | `@arithmomaniac/sefaria-web-components/source-card` |
| [Connections reader](explorer/connections.html) | Source and connection selection, category/page projection, previews, cancellation, visible errors, and exact request counts | `@arithmomaniac/sefaria-web-components/source-card` and `@arithmomaniac/sefaria-web-components/connections-panel` |

## Standalone Reader

Open the [standalone Reader](reader/controlled.html?tref=Micah%206%3A8). The deep link only prefills the reference; **Start live demo** assigns the explicit client acquisition source and `sref` to one persistent `<sefaria-reader>`.

## Custom composition

Open the [spatial Reader workspace](reader/index.html?tref=Micah%206%3A8) to see a website host assume additional responsibility for pane placement, activation, pruning, request cancellation, and session pins while reusing shared raw source qualification and the supported semantic/raw Reader session facade. The route waits for **Start live demo** before loading its prefilled reference. It is intentionally distinct from the standalone Reader rather than a competing supported API.

The [React Vite example](react-vite/README.md) demonstrates React 19 custom-element properties, declarative `data`/`sref`, canonical committed and selected references, reversible vocalization, StrictMode cleanup, and a real `sefaria-source-select` event. The [Alpine Vite example](alpine-vite/README.md) demonstrates the same SourceCard journey with declarative `data`/`sref` outside Alpine's proxy concerns, element-local property effects, declarative event handling, and destroy cleanup.

## Article and MCP host integration

The [authored linked article](linked-article/) progressively enhances ordinary Micah 6:8 Sefaria anchors by assigning Popup `sref` after eligible activation while preserving JavaScript-disabled and modifier-key navigation. The page owns its cache-disabled client choice, activation policy, visible failures, and cleanup; Popup owns cancellation and stale suppression; its [README](linked-article/README.md) identifies the public subpaths and runnable source.

The [MCP App guide](../docs/mcp-app-demo.md) packages the Reader as a self-contained MCP App. The documentation site includes a click-to-start in-browser MCP client/server and opaque sandbox without an external backend. Run `pnpm dev:mcp` for the compiled Streamable HTTP reference host. The maintained [App](mcp-app/src/app.ts), [host](mcp-app/src/host/), and [server](mcp-app/src/server/) sources keep tool requests host-mediated and transport logic separate from Reader state.
