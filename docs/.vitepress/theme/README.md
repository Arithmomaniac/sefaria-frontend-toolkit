> Created/edited by GitHub Copilot; pending human review.

# Site theme conventions

Every page-writing session follows these rules.

## Code blocks

- In a Vue component, show code with `<CodeBlock :code lang label?>`. It highlights `json`, `html`, `js`, and `ts` through `highlight.ts`, with no runtime Shiki and no new dependency. Plain highlighting preserves the source text exactly; pass `pretty-breaks` only for intentionally re-laid-out HTML such as Home's cleaned-text `normalizeText` output.
- In Markdown, use ordinary code fences. Shiki highlights them at build time.
- Global CSS in `style.css` ("Site code blocks") gives both the same 13px monospace font and wrapped lines with no horizontal scroll.
- Don't add per-page code CSS. Change the shared rules instead.

## Explanatory asides and "Learn more" links

- In a tutorial or how-to, keep an explanatory aside short. End it with at most one or two links, on a line that starts with `Learn more:`. Don't let it grow into a longer explanation.
- Put each "Learn more" line in its own paragraph with the shared markup, so it reads as a quiet footnote: `<span class="learn-more__label">Learn more:</span> [Page](/route.md) {.learn-more}`. The `.learn-more` rules in `style.css` set 0.85rem text in `var(--vp-c-text-2)` with a small top margin and a semibold small-caps label; links keep the normal link colour, and nothing is italic. Don't restyle these lines per page. `pnpm test:site` checks 4.5:1 contrast in light and dark.
- Prefer our own Concepts or Reference page. Link to its final route, even if the page is only a "Coming soon" stub.
- Link externally only for general web technology that we don't own, and then only to MDN or the relevant official documentation.

## Planned pages

- Link planned pages at their final routes. Give each unbuilt destination a stub with `stub: true`, a title, one or two sentences on what it will cover, a "Coming soon" note, and a link back to Home.
- Add each stub to the `coming-soon stubs` list in `tests/documentation-site.test.ts`.

## Live examples (`LiveEditor`)

Use `LiveEditor` for every runnable component example on a how-to page. The code shown is the code that runs.

- Keep each example in its own owner file under `examples/site-snippets/`, and import it with `?raw`. Don't paste example code into the page.

  ```vue
  <script setup>
  import LiveEditor from "../../.vitepress/theme/LiveEditor.vue";
  import refLabel from "../../../examples/site-snippets/ref-label.html?raw";
  </script>

  <LiveEditor :code="refLabel" title="Reference Label" />
  ```

  Adjust the relative paths to the page's depth. `lang` defaults to `html`.

- The code appears read-only through `CodeBlock`. **Edit** turns it into a text area. The change runs only when the reader chooses **Run** or presses Ctrl+Enter. **Reset** restores the owner file.
- Each example runs in its own `<iframe sandbox="allow-scripts" srcdoc>`. The frame has an opaque origin, so it can't read the page and the page's styles don't reach it. Its requests carry `Origin: null`. The toolkit script host and Sefaria both allow that.
- The frame loads when it comes within 200px of the viewport, so an example at the top of a page loads on arrival and later examples load as the reader scrolls. Nothing is requested before then.
- A one-line script appended after the example reports the frame's height to the page, so the frame fits its content.
- The highlighter adds a line break after a closing tag that has text after it on the same line. Until that changes, keep text after a closing tag on its own line so the code shown matches the code that runs. The browser check fails if they differ.
- Checks: `scripts/test-site-session-1.mjs` covers viewport loading, isolation, shown-equals-run, Edit, Run and Reset offline. Its live check proves that the script and Sefaria load from the sandboxed frame.
