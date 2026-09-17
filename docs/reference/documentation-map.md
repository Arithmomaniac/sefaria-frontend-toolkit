> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Documentation map

Every maintained Markdown entry point has a primary audience and a navigation owner. Contributor records and historical material stay available without competing with the product learning path.

## Product entry and learning pages

| Source | Audience and purpose | Navigation owner |
| --- | --- | --- |
| `README.md` | Repository visitor choosing a first run or product path | Repository root |
| `docs/index.md` | Product-site visitor choosing Reader, components, or headless APIs | Home |
| `docs/README.md` | GitHub reader needing the complete documentation index | Reference |
| `docs/get-started.md` | New adopter choosing a supported implementation path | Get started |
| `docs/components.md` | Product developer comparing the seven current rendering surfaces | Components |
| `docs/examples.md` | Developer choosing an isolated runnable example | Examples |
| `docs/learn/01-web-components.md` | New component consumer learning registration, properties, events, and ownership | Get started |
| `docs/learn/02-supplied-data.md` | Developer rendering validated supplied data with zero requests | Get started |
| `docs/learn/03-live-data.md` | Developer adding explicit loading, cancellation, interaction, and failure handling | Get started |
| `docs/learn/04-reader.md` | Developer adopting the controlled Reader or evaluating custom composition | Get started |
| `docs/learn/05-customization.md` | Developer changing presentation or choosing non-DOM entry points | Get started |
| `docs/learn/06-host-integration.md` | Integration developer using authored links or MCP | Get started |
| `docs/learn/react.md` | React developer assigning properties and handling events safely | Get started |
| `docs/learn/alpine.md` | Alpine developer connecting controller state and custom-element properties without a toolkit wrapper | Get started |

## Guides and reference

| Source | Audience and purpose | Navigation owner |
| --- | --- | --- |
| `docs/guides/index.md` | Developer choosing a task-focused guide | Guides |
| `docs/guides/render-text.md` | UI developer choosing and rendering a text surface | Guides |
| `docs/guides/data-flow.md` | Developer reasoning about validation, factories, view models, and requests | Guides |
| `docs/guides/text-markup.md` | Developer handling Sefaria text HTML and footnotes | Guides |
| `docs/guides/reader-navigation.md` | Developer integrating Reader navigation and lifecycle | Guides |
| `docs/guides/differences.md` | Developer checking intentional local behavior | Guides |
| `docs/reference/custom-elements.md` | API consumer looking up generated element declarations | Reference |
| `docs/reference/public-exports.md` | API consumer looking up declaration-derived package exports | Reference |
| `docs/reference/documentation-map.md` | Maintainer checking audience, purpose, and placement | Reference |

## Package and example entry points

| Source | Audience and purpose | Navigation owner |
| --- | --- | --- |
| `packages/client/README.md` | Consumer of validated Sefaria transport operations | Reference / package |
| `packages/text-transform/README.md` | Consumer of DOM-free sanitization, vocalization, and footnotes | Reference / package |
| `packages/web-components/README.md` | Consumer choosing component, Reader, or factory subpaths | Components / package |
| `examples/README.md` | Developer browsing every maintained runnable example | Examples |
| `examples/playground/index.html` | Developer editing a supplied-data component in the browser | Examples / supplied-data editor |
| `examples/explorer/README.md` | Developer working with authored states or live component diagnostics | Examples |
| `examples/vanilla-vite/README.md` | Vanilla Vite consumer following the smallest supplied-data path | Examples |
| `examples/react-vite/README.md` | React consumer integrating custom elements without wrappers | Examples |
| `examples/alpine-vite/README.md` | Alpine consumer integrating the same controller and custom-element contract without wrappers | Examples |
| `examples/reader/README.md` | Host developer comparing controlled and spatial Reader examples | Examples |
| `examples/linked-article/README.md` | Site author progressively enhancing native citation links | Examples |

## Contributor and archive material

| Classification | Pages | Purpose |
| --- | --- | --- |
| Contributor | `docs/development.md`, `docs/design.md`, `docs/evidence.md`, `docs/review.md`, `docs/handoff.md`, `docs/specs/*.md` | Setup, ownership, evidence, review gates, handoff context, and normative contracts |
| Integration reference | `docs/linked-article.md`, `docs/mcp-app-demo.md` | Detailed host-specific implementation and qualification |
| Archive | `docs/archive/README.md` and its linked immutable material | Historical presentation and superseded context, excluded from the main learning path |

Generated field-level declarations remain the API authority. This map records discoverability and audience; it does not duplicate those contracts.
