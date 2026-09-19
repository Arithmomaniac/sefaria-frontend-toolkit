> Created/edited by GitHub Copilot; pending human review.

# Components

The toolkit provides seven UI components. A view model is data that a component renders. You supply one to each component. Your application owns references, clients, raw responses, and requests.

> Choose the smallest component that completes the task. Use the Reader when users need navigation.

Text components can switch among `taamim_and_nikkud`, `nikkud`, and `none`. The change does not replace the supplied view model or make another request.

## Choose by outcome

| You need | Start with |
| --- | --- |
| Read text and move through connections | [Reader usage](components/reader.md) |
| A passage or range with attribution | [Source-card usage](components/source-card.md) |
| Add one text and translation pair to a layout | [Bilingual-segment usage](components/bilingual-segment.md) |
| One selected edition | [Text-segment usage](components/text-segment.md) |
| A canonical reference heading or link | [Reference-label usage](components/ref-label.md) |
| Show groups of related texts and previews | [Connections-panel usage](components/connections-panel.md) |
| A source preview attached to authored prose | [Popup usage](components/popup.md) |

Use the editor below to switch among all seven maintained supplied-data projects. It keeps one active editor and one active preview, so the catalog does not load seven workbenches at once. You can also <SiteLink to="/examples/vanilla/index.html">Open supplied-data preview</SiteLink> in the smaller vanilla host.

<PlaygroundEmbed project="source-card" title="Editable component catalog" :heading-level="2" />

## Start with the complete Reader

A controller manages Reader state and requests.

`<sefaria-reader>` combines text, connections, responsive panels, and navigation history. The controller manages selection, connection navigation, cancellation, Back, and breadcrumbs.

Use `@arithmomaniac/sefaria-web-components/reader` for rendering and `@arithmomaniac/sefaria-web-components/reader-controller` for the supplied state machine. [Read Reader usage](components/reader.md), <SiteLink to="/examples/playground/index.html?project=reader">edit the supplied-data project</SiteLink>, or <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">open the controlled Reader</SiteLink>.

## Package subpaths

| Element | Rendering subpath | Usage |
| --- | --- | --- |
| `<sefaria-ref-label>` | `@arithmomaniac/sefaria-web-components/ref-label` | [Reference label](components/ref-label.md) |
| `<sefaria-text-segment>` | `@arithmomaniac/sefaria-web-components/text-segment` | [Text segment](components/text-segment.md) |
| `<sefaria-bilingual-segment>` | `@arithmomaniac/sefaria-web-components/bilingual-segment` | [Bilingual segment](components/bilingual-segment.md) |
| `<sefaria-source-card>` | `@arithmomaniac/sefaria-web-components/source-card` | [Source card](components/source-card.md) |
| `<sefaria-connections-panel>` | `@arithmomaniac/sefaria-web-components/connections-panel` | [Connections panel](components/connections-panel.md) |
| `<sefaria-popup>` | `@arithmomaniac/sefaria-web-components/popup` | [Popup](components/popup.md) |
| `<sefaria-reader>` | `@arithmomaniac/sefaria-web-components/reader` | [Reader](components/reader.md) |

Use the generated [custom-element reference](reference/custom-elements.md) for properties, events, and slots. Use the [public export inventory](reference/public-exports.md) and package README for factory APIs.
