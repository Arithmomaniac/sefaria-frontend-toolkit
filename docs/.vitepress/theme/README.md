> Created/edited by GitHub Copilot; pending human review.

# Site theme conventions

Every page-writing session follows these rules.

## Code blocks

- In a Vue component, show code with `<CodeBlock :code lang label?>`. It highlights `json`, `html`, `js`, and `ts` through `highlight.ts`, with no runtime Shiki and no new dependency.
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
- `tests/site-data-tools.test.ts` checks that each generated JavaScript file has no type syntax and parses, and runs both versions of each snippet.

## Explanatory asides and "Learn more" links

- In a tutorial or how-to, keep an explanatory aside short. End it with at most one or two links, on a line that starts with `Learn more:`. Don't let it grow into a longer explanation.
- Put each "Learn more" line in its own paragraph with the shared markup, so it reads as a quiet footnote: `<span class="learn-more__label">Learn more:</span> [Page](/route.md) {.learn-more}`. The `.learn-more` rules in `style.css` set 0.85rem text in `var(--vp-c-text-2)` with a small top margin and a semibold small-caps label; links keep the normal link colour, and nothing is italic. Don't restyle these lines per page. `pnpm test:site` checks 4.5:1 contrast in light and dark.
- Prefer our own Concepts or Reference page. Link to its final route, even if the page is only a "Coming soon" stub.
- Link externally only for general web technology that we don't own, and then only to MDN or the relevant official documentation.

## Planned pages

- Link planned pages at their final routes. Give each unbuilt destination a stub with `stub: true`, a title, one or two sentences on what it will cover, a "Coming soon" note, and a link back to Home.
- Add each stub to the `coming-soon stubs` list in `tests/documentation-site.test.ts`.
