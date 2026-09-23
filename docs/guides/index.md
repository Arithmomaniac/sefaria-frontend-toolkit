> Created/edited by GitHub Copilot; pending human review.

# Task guides and advanced explanations

Start with a task guide when you want to build or change a reading surface. The advanced explanations are optional depth for readers who need to reason about data flow, Reader ownership, or intentional differences.

## Task guides

| Goal | Guide | What it adds |
| --- | --- | --- |
| Render a passage, range, or smaller text surface | [Render Sefaria text](render-text.md) | Component choice, complete source-card use, editions, presentation changes, and incomplete text |
| Preserve useful text markup safely | [Text markup](text-markup.md) | Upstream markup concepts, local sanitization, footnotes, and examples |
| Recover from common setup and integration failures | [Troubleshooting](troubleshooting.md) | Symptom-led recovery without weakening request, CSP, or element boundaries |

## Advanced explanations

Use these pages when the task requires deeper ownership or compatibility detail. They are not prerequisites for the guided learning sequence.

| Question | Explanation | What it adds |
| --- | --- | --- |
| How do supplied data, standalone loading, and elements fit together? | [How the pieces fit together](data-flow.md) | Request and validation boundaries, supplied-data flow, failures, and composition |
| Check deliberate behavior differences | [Intentional differences from Sefaria](differences.md) | Explicit local choices without treating every implementation detail as a divergence |

For a guided sequence, use [Get started](../get-started.md). For exact element declarations and package exports, use the [API reference](../reference/custom-elements.md). Contributor setup, design, evidence, specifications, and review gates remain in the repository Markdown.
