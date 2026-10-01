> Created/edited by GitHub Copilot; pending human review.

# Components

The toolkit provides five declarative UI components. All five accept `sref` for standalone loading. Only Text Segment, Bilingual Segment, and Source Card accept component-specific raw `data`; mutable Reader and Connections Panel flows use tagged acquisition capabilities.

> Choose the smallest component that completes the task. Use Reader when users need navigation.

## Choose by outcome

| You need | Start with |
| --- | --- |
| Read text and move through connections | [Reader](components/reader.md) |
| A passage or range with attribution | [Source card](components/source-card.md) |
| One text and translation pair | [Bilingual segment](components/bilingual-segment.md) |
| One selected edition | [Text segment](components/text-segment.md) |
| Groups of related texts and previews | [Connections panel](components/connections-panel.md) |
| A source preview opened from authored prose | [Source Card in a host dialog](linked-article.md) |

<PlaygroundEmbed project="source-card" title="Editable component catalog" :heading-level="2" />

<SiteLink to="/examples/vanilla/index.html">Open supplied-data preview</SiteLink>, or switch among the maintained supplied-data projects in the editor.

## Start with supplied data or standalone `sref`

Use `sref` as an attribute for ordinary standalone browser loading. Use the property-only raw `data` input for fixtures, server output, or MCP tool results that have already crossed the appropriate validation boundary. Default-true booleans remain properties when a host must set them false. Maintained pages assign live references only after their activation gate.

Elements expose public read-only status and component-specific diagnostics/events. Their prepared rendering state is private.

## Start with the complete Reader

`<sefaria-reader>` combines text, connections, responsive panes, semantic history, and navigation. Assign the `sref` attribute for the ordinary path. Advanced spatial or MCP hosts can use tagged local-data acquisition and `reader-session` semantic records without constructing public prepared models.

<SiteLink to="/examples/playground/index.html?project=reader">Edit the Reader supplied-data project</SiteLink>.

## Package subpaths

| Element | Public type subpath |
| --- | --- |
| `<sefaria-text-segment>` | `@arithmomaniac/sefaria-web-components/text-segment` |
| `<sefaria-bilingual-segment>` | `@arithmomaniac/sefaria-web-components/bilingual-segment` |
| `<sefaria-source-card>` | `@arithmomaniac/sefaria-web-components/source-card` |
| `<sefaria-connections-panel>` | `@arithmomaniac/sefaria-web-components/connections-panel` |
| `<sefaria-reader>` | `@arithmomaniac/sefaria-web-components/reader` |

Use the generated [custom-element reference](reference/custom-elements.md) for exact properties, events, slots, and parts. Do not hand-edit generated reference files.
