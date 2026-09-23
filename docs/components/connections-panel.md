> Created/edited by GitHub Copilot; pending human review.

# Connections panel

Use `<sefaria-connections-panel>` for grouped related references, bounded pages, and optional captured previews. Assign raw links `data` for zero-request rendering or `sref` for standalone loading.

## Try it

<PlaygroundEmbed project="connections-panel" title="Edit the connections-panel example" />

Category, page, and preview-visibility changes reproject captured data with zero I/O. `showPreviews` controls only captured-preview visibility.

## Interaction and composition

The panel emits category, page, preview-request, and connection-selection events. Current failures emit `sefaria-connections-panel-error`.

One links response privately prepares all visible entries. A ten-preview page makes one outer request and zero child requests.

## Exact contract and source

- [Generated element properties and events](../reference/custom-elements.md#sefaria-connections-panel)
- [Maintained playground source](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/connections-panel/)
