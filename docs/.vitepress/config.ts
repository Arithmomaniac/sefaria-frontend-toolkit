import { readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

import { normalizeSiteBasePath } from "../../scripts/build-site-plan.mjs";
import { removeLeadingProvenanceBlock } from "./provenance";

const repository = "https://github.com/Arithmomaniac/sefaria-frontend-toolkit";
const branch = "main";
const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const siteBasePath = normalizeSiteBasePath(process.env.SITE_BASE_PATH);
const apiLinkCatalog = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, "scripts", "reference", "api-link-catalog.json"),
    "utf8",
  ),
) as {
  readonly name: string;
  readonly href: string;
  readonly page: string;
}[];
export default withMermaid(
  defineConfig({
    base: siteBasePath,
    title: "Sefaria Frontend Toolkit",
    description: "Documentation and examples for the Sefaria Frontend Toolkit.",
    head: [
      [
        "meta",
        { name: "sefaria-docs-site", content: "local-docs-site-wave-3" },
      ],
    ],
    cleanUrls: false,
    srcExclude: [
      "README.md",
      "archive/**",
      "design.md",
      "development.md",
      "evidence.md",
      "handoff.md",
      "review.md",
      "specs/**",
    ],
    ignoreDeadLinks: [
      /^\/examples\//,
      /^\.\.\/images\/reader-navigation(?:\.html)?$/,
    ],
    lastUpdated: true,
    outDir: path.join(repositoryRoot, "dist", "site"),
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("sefaria-"),
        },
      },
    },
    vite: {
      publicDir: path.join(repositoryRoot, "dist", "site-public"),
    },
    markdown: {
      config(markdown) {
        markdown.core.ruler.after(
          "block",
          "remove-leading-provenance-block",
          removeLeadingProvenanceBlock,
        );
        markdown.core.ruler.after("inline", "auto-link-api-code", (state) => {
          const currentPage = `/${state.env.relativePath}`;
          if (currentPage.startsWith("/reference/")) return;
          const used = new Set<string>();
          let inHeading = false;
          let inTable = false;
          for (const token of state.tokens) {
            if (token.type === "heading_open") inHeading = true;
            if (token.type === "heading_close") inHeading = false;
            if (token.type === "table_open") inTable = true;
            if (token.type === "table_close") inTable = false;
            if (
              inHeading ||
              inTable ||
              token.type !== "inline" ||
              !token.children
            ) {
              continue;
            }
            let inLink = false;
            const children = [];
            for (const child of token.children) {
              if (child.type === "link_open") inLink = true;
              if (child.type === "link_close") inLink = false;
              const entry =
                !inLink && child.type === "code_inline"
                  ? apiLinkCatalog.find(
                      (candidate) =>
                        candidate.name === child.content &&
                        candidate.page !== currentPage &&
                        !used.has(candidate.name),
                    )
                  : undefined;
              if (!entry) {
                children.push(child);
                continue;
              }
              used.add(entry.name);
              const open = new state.Token("link_open", "a", 1);
              open.attrSet("href", entry.href);
              children.push(
                open,
                child,
                new state.Token("link_close", "a", -1),
              );
            }
            token.children = children;
          }
        });
      },
    },
    themeConfig: {
      nav: [
        { text: "Use components", link: "/use-components/start-here.md" },
        {
          text: "Use data and text tools",
          link: "/data-and-text-tools/start-here.md",
        },
        {
          text: "Examples",
          link: "/examples/composed-multi-pane-reader",
        },
        { text: "Reference", link: "/reference/components" },
      ],
      sidebar: {
        "/use-components/": [
          {
            text: "Use components",
            items: [
              { text: "Start here", link: "/use-components/start-here" },
              {
                text: "Start with an AI assistant",
                link: "/use-components/start-with-an-ai-assistant",
              },
              {
                text: "Show text",
                items: [
                  {
                    text: "Label a citation",
                    link: "/use-components/show-text/label-a-citation",
                  },
                  {
                    text: "Show one passage",
                    link: "/use-components/show-text/show-one-passage",
                  },
                  {
                    text: "Show Hebrew and translation together",
                    link: "/use-components/show-text/hebrew-and-translation",
                  },
                ],
              },
              {
                text: "Show an attributed passage",
                link: "/use-components/show-an-attributed-passage",
              },
              {
                text: "Use with a framework",
                link: "/use-components/use-with-a-framework",
              },
              {
                text: "Show commentary and connected texts",
                link: "/use-components/show-commentary-and-connected-texts",
              },
              {
                text: "Add the complete Reader",
                link: "/use-components/add-the-complete-reader",
              },
            ],
          },
        ],
        "/data-and-text-tools/": [
          {
            text: "Use the data and text tools",
            items: [
              { text: "Start here", link: "/data-and-text-tools/start-here" },
              {
                text: "Give components your own data",
                link: "/data-and-text-tools/give-components-your-own-data",
              },
              {
                text: "Handle errors in your code",
                link: "/data-and-text-tools/handle-errors-in-your-code",
              },
              {
                text: "Clean up stored Sefaria text",
                link: "/data-and-text-tools/clean-up-stored-sefaria-text",
              },
            ],
          },
        ],
        "/across-components/": [
          {
            text: "Across components",
            items: [
              {
                text: "Match your site's look",
                link: "/across-components/match-your-sites-look",
              },
              {
                text: "Choose what text readers see",
                link: "/across-components/choose-what-text-readers-see",
              },
              {
                text: "Make components respond to each other",
                link: "/across-components/make-components-respond-to-each-other",
              },
            ],
          },
        ],
        "/concepts/": [
          {
            text: "Concepts",
            items: [
              {
                text: "How the toolkit works",
                link: "/concepts/how-the-toolkit-works",
              },
              {
                text: "The client and Sefaria's API",
                link: "/concepts/the-client-and-sefarias-api",
              },
              {
                text: "Clean text and safety",
                link: "/concepts/clean-text-and-safety",
              },
              {
                text: "Sefaria's own texts and tools",
                link: "/concepts/sefarias-own-texts-and-tools",
              },
            ],
          },
        ],
        "/reference/": [
          {
            text: "Reference",
            items: [
              { text: "Components", link: "/reference/components" },
              { text: "Client", link: "/reference/client" },
              { text: "Text tools", link: "/reference/text-transform" },
              {
                text: "Package imports and exports",
                link: "/reference/package-imports-and-exports",
              },
              {
                text: "Corrections to Sefaria's API",
                link: "/reference/api-corrections",
              },
            ],
          },
        ],
        "/examples/": [
          {
            text: "Examples",
            items: [
              {
                text: "Composed multi-pane Reader",
                link: "/examples/composed-multi-pane-reader",
              },
              { text: "Linked article", link: "/examples/linked-article" },
              {
                text: "Reader inside AI chat",
                link: "/examples/reader-inside-ai-chat",
              },
              {
                text: "This week's portion",
                link: "/examples/this-weeks-portion",
              },
            ],
          },
        ],
        "/help/": [
          {
            text: "Help",
            items: [
              { text: "Install and status", link: "/help/install-and-status" },
              {
                text: "Troubleshoot a page",
                link: "/help/troubleshoot-a-page",
              },
            ],
          },
        ],
      },
      search: { provider: "local" },
      editLink: {
        pattern: `${repository}/edit/${branch}/docs/:path`,
        text: "Edit this page on GitHub",
      },
      socialLinks: [{ icon: "github", link: repository }],
    },
  }),
);
