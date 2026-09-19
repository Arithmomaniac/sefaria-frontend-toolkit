> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# 5. Customize presentation and use headless APIs

## Objective

Change theme, width, visible sides, side order, layout, Hebrew marks, and coarse Reader regions without refetching; add one host-owned Reader action; then identify the non-DOM client, factory, Reader, and text-transform entry points available to a custom host.

## Prerequisites

- Complete [Use the Reader](04-reader.md).
- Keep data changes separate from presentation changes.

## Try it

Presentation properties operate on the current view model:

```ts
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";

export function customizeCard(card: SefariaSourceCard): void {
  card.contentLanguage = "both";
  card.layout = "side-by-side";
  card.sideOrder = "translation-first";
  card.vocalizationMode = "nikkud";
  card.style.setProperty("--sefaria-surface", "#fffaf2");
  card.style.setProperty("--sefaria-accent", "#6f3f20");
  card.style.maxWidth = "48rem";
}
```

Changing these values must not call a factory or client. `vocalizationMode` accepts `taamim_and_nikkud`, `nikkud`, or `none`; the full-mark default renders the original safe view-model content directly, while the other presets derive display text from that same immutable content. The equivalent HTML attribute is `vocalization-mode`. Changing the reference or exact edition selector is a data operation and belongs in the host's async lifecycle.

The controlled Reader adds one optional host-action placement and four coarse styling regions:

```ts
const bookmark = document.createElement("button");
bookmark.slot = "toolbar-actions";
bookmark.textContent = "Bookmark selected text";
reader.append(bookmark);

bookmark.addEventListener("click", () => {
  const targetRef = controller.snapshot.reader.selectedTarget?.ref;
  if (targetRef === undefined) return;
  bookmark.textContent = `Bookmarked ${targetRef}`;
});
```

The equivalent authored markup is `<button slot="toolbar-actions">Bookmark selected text</button>`. The generic supplied-data Reader project demonstrates editable Reader HTML, CSS, and JavaScript, but the maintained controlled Reader linked below is the proof for this host-owned bookmark action.

```css
sefaria-reader::part(toolbar) {
  gap: 0.75rem;
}

sefaria-reader::part(source-pane) {
  background: var(--app-reading-surface);
}

sefaria-reader::part(connections-pane) {
  background: var(--app-context-surface);
}
```

The slot is available after a Reader view model commits; the full initial loading state intentionally has no toolbar. Read the action target from the current public controller snapshot when the action runs rather than capturing an earlier reference. `toolbar`, `history`, `source-pane`, and `connections-pane` are the complete Reader part set. There are no forwarded child parts. Prefer shared tokens for theme-wide changes; if a `::part` rule changes display, overflow, or layout, the host owns the resulting responsive and accessibility behavior.

For a headless path, import only the layers you need:

```ts
import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import {
  extractFootnotes,
  sanitize,
} from "@arithmomaniac/sefaria-text-transform";
import { loadSourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";

const client = createSefariaClient({ cache: false });
const viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);

const safeHtml = sanitize("<b>Justice</b>");
const footnotes = extractFootnotes(safeHtml);
console.log(viewModel.state, footnotes);
```

The non-DOM component subpaths are safe to use without registering custom elements. They return rendering data, not server-rendered HTML and not a generalized domain model.

## Expected result

Theme, container width, side visibility, side order, layout, vocalization mode, documented Reader parts, and the host-owned toolbar action update the current component while the host request counter is unchanged. The bookmark example records only page-local host state and reads the current exact selected target without inspecting `shadowRoot` or an event path. Switching back to `taamim_and_nikkud` restores the original displayed marks. Headless imports can validate, transform, or project data without accessing `window`, `document`, or custom-element registration.

<PlaygroundEmbed project="source-card" title="Edit source-card presentation" />

## Who owns what

The element owns supported visual properties, CSS custom properties, the Reader's required content, and the placement of its one optional toolbar slot. The host owns slotted action behavior, CSS-part overrides, the containing layout, and the decision that a changed input requires new data. `@arithmomaniac/sefaria-text-transform` owns pure markup handling; component factories own component-specific projection; the client owns transport and validation.

## Exercise

Edit the source-card project's CSS and JavaScript to change presentation, choose **Run**, and confirm that no request occurs. Then open the actual controlled Reader example, bookmark the current selected reference, navigate, and confirm the next activation uses the new selected reference. Remove the slotted action in DevTools and confirm the Reader's required controls and content remain. Next, inspect the generated export inventory and choose the smallest non-DOM subpath for a host that never renders an element.

## Source and run links

- Hosted source-card editor: <SiteLink to="/examples/playground/index.html?project=source-card">open editor</SiteLink>
- Hosted controlled Reader: <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">open example</SiteLink>
- Full editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>
- Authored controls: [`examples/explorer/src/authored/development-status.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/explorer/src/authored/development-status.ts)
- Controlled Reader customization: [`examples/reader/src/controlled-app.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/reader/src/controlled-app.ts)
- Client README: [`packages/client/README.md`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md)
- Text-transform README: [`packages/text-transform/README.md`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md)
- Web-components README: [`packages/web-components/README.md`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md)
- Generated exports: [Public package exports](../reference/public-exports.md)

## Next step

Continue to [Integrate an authored article or MCP host](06-host-integration.md).
