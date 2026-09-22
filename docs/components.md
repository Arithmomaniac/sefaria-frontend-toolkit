> Created/edited by GitHub Copilot; pending human review.

# Components

The toolkit provides seven declarative UI components. All seven accept `sref` for standalone loading. The six ordinary elements also accept component-specific raw `data`; Reader accepts transactional raw seeds.

> Choose the smallest component that completes the task. Use Reader when users need navigation.

## Choose by outcome

| You need | Start with |
| --- | --- |
| Read text and move through connections | [Reader](components/reader.md) |
| A passage or range with attribution | [Source card](components/source-card.md) |
| One text and translation pair | [Bilingual segment](components/bilingual-segment.md) |
| One selected edition | [Text segment](components/text-segment.md) |
| A canonical reference heading or link | [Reference label](components/ref-label.md) |
| Groups of related texts and previews | [Connections panel](components/connections-panel.md) |
| A source preview attached to authored prose | [Popup](components/popup.md) |

<PlaygroundEmbed project="source-card" title="Editable component catalog" :heading-level="2" />

<SiteLink to="/examples/vanilla/index.html">Open supplied-data preview</SiteLink>, or switch among the maintained supplied-data projects in the editor.

## Start with supplied data or standalone `sref`

Use raw `data` for fixtures, server output, or MCP tool results that have already crossed the appropriate validation boundary. Use `sref` for ordinary standalone browser loading. Maintained pages assign live references only after their activation gate.

Elements expose public read-only status and component-specific diagnostics/events. Their prepared rendering state is private.

## Start with the complete Reader

`<sefaria-reader>` combines text, connections, responsive panes, semantic history, and navigation. Assign `sref` for the ordinary path. Advanced spatial or MCP hosts can use raw seeds, tagged acquisition, and `reader-session` semantic records without constructing public prepared models.

<SiteLink to="/examples/playground/index.html?project=reader">Edit the Reader supplied-data project</SiteLink>.

## Package subpaths

| Element | Public type subpath |
| --- | --- |
| `<sefaria-ref-label>` | `@arithmomaniac/sefaria-web-components/ref-label` |
| `<sefaria-text-segment>` | `@arithmomaniac/sefaria-web-components/text-segment` |
| `<sefaria-bilingual-segment>` | `@arithmomaniac/sefaria-web-components/bilingual-segment` |
| `<sefaria-source-card>` | `@arithmomaniac/sefaria-web-components/source-card` |
| `<sefaria-connections-panel>` | `@arithmomaniac/sefaria-web-components/connections-panel` |
| `<sefaria-popup>` | `@arithmomaniac/sefaria-web-components/popup` |
| `<sefaria-reader>` | `@arithmomaniac/sefaria-web-components/reader` |

Use the generated [custom-element reference](reference/custom-elements.md) for exact properties, events, slots, and parts. Do not hand-edit generated reference files.
