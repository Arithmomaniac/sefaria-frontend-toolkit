> Created/edited by GitHub Copilot; pending human review.

# Guides

These guides answer task-level questions after you choose a surface. Start with the outcome you need; follow the architecture links only when you need to change data flow or ownership.

| Goal | Guide | What it adds |
| --- | --- | --- |
| Render a passage, range, or smaller text surface | [Render Sefaria text](render-text.md) | Component choice, complete source-card use, editions, presentation changes, and incomplete text |
| Understand client, factory, view-model, and element responsibilities | [How the pieces fit together](data-flow.md) | Request and validation boundaries, supplied-data flow, failures, and composition |
| Preserve useful text markup safely | [Text markup](text-markup.md) | Upstream markup concepts, local sanitization, footnotes, and examples |
| Use the controlled Reader or own a custom composition | [Reader navigation](reader-navigation.md) | Controller behavior, host lifecycle, navigation, and spatial composition |
| Check deliberate behavior differences | [Intentional differences from Sefaria](differences.md) | Explicit local choices without treating every implementation detail as a divergence |

For a guided sequence, use [Get started](../get-started.md). For exact element declarations and package exports, use [Reference](../reference/custom-elements.md).
