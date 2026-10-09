> Created/edited by GitHub Copilot; pending human review.

<!-- npm-release-version: 0.1.0-alpha.0 -->

# Site theme conventions

Every page-writing session follows these rules.

## Legacy redirects

Deleted public pages stay reachable through static redirect stubs generated from `docs/.vitepress/redirects.mjs`; keep that mapping as the single source of truth, do not add those old routes to navigation or search, and choose the closest current successor page for each entry.

## Code blocks

- In a Vue component, show code with `<CodeBlock :code lang label?>`. It highlights `json`, `html`, `js`, and `ts` through `highlight.ts`, with no runtime Shiki and no new dependency. Plain highlighting preserves the source text exactly; pass `pretty-breaks` only for intentionally re-laid-out HTML such as Home's cleaned-text `normalizeText` output.
- In Markdown, use ordinary code fences. Shiki highlights them at build time.
- Global CSS in `style.css` ("Site code blocks") gives both the same 13px monospace font and wrapped lines with no horizontal scroll.
- Don't add per-page code CSS. Change the shared rules instead.

## JavaScript/TypeScript toggle

Data and text tool pages show every snippet with `<CodeLanguageToggle :snippet>`. It reuses `CodeBlock`, shows TypeScript by default, and remembers the reader's choice across pages in `localStorage`. Every toggle on a page switches together.

- Write each snippet once, as TypeScript, in `examples/site-snippets/<name>.ts`. Never type the JavaScript version by hand.
- `docs/data-and-text-tools/snippets.data.ts` loads the snippets at build time. It generates the JavaScript with `scripts/strip-types.mjs`, which removes the types with `ts-blank-space`, drops lines that held only types, and formats the result with Prettier.
- In a page, import the data and pass one snippet by file name:

  ```md
  <script setup>
  import { data as snippets } from "./snippets.data.ts";
  </script>

  <CodeLanguageToggle :snippet="snippets['client-first-success']" />
  ```

- Put type-only imports on their own `import type` line, so the JavaScript has no leftover gaps.
- A snippet that works in a browser can show a **Run** button. List its file name in the `runnable` set in `snippets.data.ts`; the toggle gets `snippet.runnable`. Runnable means it imports only `@sefaria/api-client` and `@sefaria/text-transform`, uses no Node APIs (`fs`, `process`), and fetches nothing from the reader's own site. Network snippets call Sefaria live.
- Run follows the `LiveEditor` security model. Nothing is created before the click. The JavaScript version then runs in an `allow-scripts` sandboxed iframe whose import map points each package name at its exact `0.1.0-alpha.0` jsDelivr file under that package's `dist/browser`. `scripts/npm-documentation-release.json` owns the recommended version for the runner, landing quick installs and reference generator. `LiveEditor` owner snippets pin the elements module from the same host. Offline browser tests intercept only those exact URLs with built bytes from `dist/site/cdn/local/`; this is not live CDN verification. The frame posts only console text to the page, which accepts messages from that frame alone and shows them in a console panel (errors in red, "Running…" until done). Running again resets the panel.
- `tests/site-data-tools.test.ts` checks that each generated JavaScript file has no type syntax and parses, and runs both versions of each snippet.

## Explanatory asides and "Learn more" links

- In a tutorial or how-to, keep an explanatory aside short. End it with at most one or two links, on a line that starts with `Learn more:`. Don't let it grow into a longer explanation.
- Put each "Learn more" line in its own paragraph with the shared markup, so it reads as a quiet footnote: `<span class="learn-more__label">Learn more:</span> [Page](/route.md) {.learn-more}`. The `.learn-more` rules in `style.css` set 0.85rem text in `var(--vp-c-text-2)` with a small top margin and a semibold small-caps label; links keep the normal link colour, and nothing is italic. Don't restyle these lines per page. `pnpm test:site` checks 4.5:1 contrast in light and dark.
- Prefer our own Concepts or Reference page. Link to its final route, even if the page is only a "Coming soon" stub.
- Link externally only for general web technology that we don't own, and then only to MDN or the relevant official documentation.

## Shared guidance

- When a task page first teaches a rule that applies more widely, give the minimum the example needs, then one plain scope sentence per group, such as "These styling rules apply to every toolkit component:". Put local exceptions outside the group. Don't mark a whole concern as universal if only some rules are shared.
- Don't use a badge for scope by default. A badge is allowed only in a mixed list, where each item's scope differs, and the scope must also be stated in prose.
- End with one Learn-more link to the owner page's section. The owner page must stand alone, so a reader who lands there first can finish.
- Later pages may give a one-sentence reminder when an example needs it, then link to the owner. They don't copy tables or full rules.
- Keep request counts next to each operation.
- List only the events readers most likely need on a how-to page, each with a one-line description. Link to the components reference for the full list.
- Put rules for one component's attributes, which interrupt the narrative, in a `::: info` box with a short title, as bullets.
- On a how-to page, a "nothing to show" or zero-state table shows only what a reader acts on: loading, the main failures that fire the error event, a partial failure if the component has one, and nothing set. Show the `status` value and whether the error event fires. Merge rows that behave the same. Describe interface text, such as a loading message, instead of quoting it. End with a link to the element's empty-state detail at `/reference/components.md#<tag>`.
- Leave a blank line before a closing `:::`. Otherwise Prettier joins it to the line above and the box swallows the rest of the page. A site test checks this.

## Advanced material

- When a how-to page has material most readers don't need, group it at the end under an H2 and mark it with `<Badge type="info" text="Advanced" />` after the heading text. The badge is enough. Don't add a sentence saying most pages don't need the section. The `.vp-doc h2 .VPBadge` rule in `style.css` gives it the accent colour and aligns it with the heading text.
- Mark advanced options in summary tables with "(advanced)".
- This is the one sanctioned use of badges for marking content type. Scope still uses plain sentences.
- Basic material must not depend on the advanced section.

## Planned pages

- Link planned pages at their final routes. Give each unbuilt destination a stub with `stub: true`, a title, one or two sentences on what it will cover, a "Coming soon" note, and a link back to Home.
- Add each stub to the `coming-soon stubs` list in `tests/documentation-site.test.ts`.

## Diagrams

- Draw diagrams in Mermaid when possible, or SVG when Mermaid cannot express them; never use ASCII-art diagrams.
- API names in inline code link automatically; don't hand-link them.

## Live examples (`LiveEditor`)

Use `LiveEditor` for every runnable component example on a how-to page. The code shown is the code that runs.

- Keep each example in its own owner file under `examples/site-snippets/`, and import it with `?raw`. Don't paste example code into the page.

  ```vue
  <script setup>
  import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
  import textSegment from "../../../examples/site-snippets/text-segment.html?raw";
  </script>

  <LiveEditor :code="textSegment" title="Text Segment" />
  ```

  Adjust the relative paths to the page's depth. `lang` defaults to `html`.

- Describe what the example shows in the caption slot, not in the paragraph above: `<LiveEditor ...>The first segment asks for French.</LiveEditor>`. The caption appears in italics under the title. Use HTML (`<code>`, `<strong>`) inside it, not Markdown.
- Code inside `<style>` and `<script>` blocks is coloured as CSS and JavaScript.

- The code appears read-only through `CodeBlock`. **Edit** turns it into a text area. The change runs only when the reader chooses **Run** or presses Ctrl+Enter. **Reset** restores the owner file. Add `readonly` to run an example without Edit, Run, or Reset, for example when the page shows other versions of the same code that can't run here.
- Each example runs in its own `<iframe sandbox="allow-scripts" srcdoc>`. The frame has an opaque origin, so it can't read the page and the page's styles don't reach it. Its requests carry `Origin: null`. The toolkit script host and Sefaria both allow that.
- The frame loads when it comes within 200px of the viewport, so an example at the top of a page loads on arrival and later examples load as the reader scrolls. Nothing is requested before then.
- A one-line script appended after the example reports the frame's height to the page, so the frame fits its content.
- The highlighter adds a line break after a closing tag that has text after it on the same line. Until that changes, keep text after a closing tag on its own line so the code shown matches the code that runs. The browser check fails if they differ.
- Checks: `scripts/test-site-session-1.mjs` covers viewport loading, isolation, shown-equals-run, Edit, Run and Reset offline. Its live check proves that the script and Sefaria load from the sandboxed frame.

## Example app embeds

Example pages embed the complete first-party example apps, such as `/examples/linked-article/`, in an `<iframe>` with `sandbox="allow-scripts allow-same-origin allow-popups"`, plus an "Open in a new tab" link. They show code read-only from `// #region` markers in the example source with `<<<`.

- These frames are same-origin and first-party. They are **not** script-isolated: code in the frame can reach the parent page. Don't describe them as isolated.
- The relaxed sandbox is only for built example apps that the repository owns. Never use it for code that readers can edit; `LiveEditor` keeps its `allow-scripts`-only sandbox.
- `tests/site-session4.test.ts` checks that only the example pages use `allow-same-origin`.

## Data-source terms

- Call what the `source` property sets a **data source**. The three choices are a **toolkit client**, a **custom loader**, and **loading disabled**.
- A custom loader is the object that supplies `getText`, `getLinks`, or both. In code it is `{ kind: "custom", loader }`.
- Map a term to its identifier once per page, at first use. Then use the term alone. Don't use "acquisition" or "capability" in prose.
- When the library renames these identifiers, update the code spans and the mapping sentences. The prose terms stay the same.

- Keep Mermaid edge labels to one or two words, such as Yes or No. Longer edge labels wrap and get clipped. Put detail in the node text or in the prose.

- Install order: component pages put the script tag first, then the package. Data and text tools pages put the packages first, then the CDN import. Help › Install and status lists hosted files first, then packages, and its route paragraph uses the same order.

## API entries

`<ApiEntry>` is one property, event, or style setting in the generated components reference (`docs/reference/components.md`, written by `scripts/reference/components.ts`). Don't write it by hand; change the generator.

- Props: `id` (the anchor), `name` (shown in code), `fields` (an array of `{ label, value, code? }`), and `level` (heading level, default 4). The default slot holds the description, so Markdown there works. Leave a blank line between the tag and the description.
- It renders an anchored heading and a `<dl>` of `<dt>`/`<dd>` fields. The structure is the same at every width. A container query on the entry sets the layout: fields sit side by side, then stack below 560px of entry width. `code` values wrap with `overflow-wrap: anywhere`.
- The generator escapes attribute values for Vue (`&`, `<`, `>`, `"`). `fields` is JSON in a `:fields` binding.
- Anchors: elements keep `#<tag>`, `#events` and `#style-settings`. Properties use `<tag>-<attribute or property>` (for example `sefaria-source-card-translation-fallback`), events use `event-<event name>`, and style settings use `style-sefaria-<name>`.
- `scripts/test-site.mjs` checks the page for horizontal overflow at 390px and for fields sharing a row at 1200px.

## Human-review warning

A page with `humanReviewed: false` in its front matter shows the sentence "This page has not been reviewed by a human." in a warning box after its H1. The Markdown rule in `docs/.vitepress/config.ts` inserts `HumanReviewWarning.vue`, including in the built HTML. Remove the flag once the maintainer signs off the page. Don't add review notes to the page text.

## AI-documentation notice

`DocumentationNotice.vue` renders the compact yellow bar directly below the main navigation. Dismissal uses the `sefaria-docs:ai-notice-dismissed` localStorage key and persists across later browser visits. If storage is blocked, dismissal still applies for the current visit and a console warning explains that persistence failed. The footer disclosure and page-specific review warnings remain visible.

The bar uses opt-in styling: its base CSS hides it and its height offset starts at zero. Only after reading the saved preference does the mounted component apply `documentation-notice--visible` for an undismissed notice. A dismissed reload therefore shows neither the bar nor a temporary blank gap, even while JavaScript is delayed.

The banner and footer use `DocumentationDetails.vue` for their Learn-more control and accessible native dialog. That file owns the maintainer's explanation text; edit it once to update both entry points. The dialog closes with Escape or either Close control and restores focus to its opener.

The `layout-top` slot supplies the notice; shared CSS puts mobile navigation ahead of it and reserves the fixed desktop header's space. A ResizeObserver publishes the current bar height for sticky local navigation and sidebar offsets, including wrapped mobile copy and dismissal. Keep the bar's vertical spacing compact and do not move it inside the navigation row.

The zero-size `documentation-notice-scroll-target` supplies the anchor-scroll offset without reserving layout space. At 960–1279px it also accounts for VitePress's 48px local-navigation bar when that bar is present and has an outline. Wider screens retain the banner-only offset; mobile falls back to the visible local navigation after the notice scrolls away.
