import path from "node:path";

import { defineConfig } from "vitepress";

import { normalizeSiteBasePath } from "../../scripts/build-site-plan.mjs";
import { removeLeadingProvenanceBlock } from "./provenance";

const repository = "https://github.com/Arithmomaniac/sefaria-frontend-toolkit";
const branch = "main";
const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const siteBasePath = normalizeSiteBasePath(process.env.SITE_BASE_PATH);
const lessonLink = (text: string, link: string) => ({ text, link });
const learningPagers = {
  "learn/01-web-components.md": {
    prev: lessonLink("Get started", "/get-started.md"),
    next: lessonLink("2. Render supplied data", "/learn/02-supplied-data.md"),
  },
  "learn/02-supplied-data.md": {
    prev: lessonLink("1. Choose a surface", "/learn/01-web-components.md"),
    next: lessonLink("3. Load and interact", "/learn/03-live-data.md"),
  },
  "learn/03-live-data.md": {
    prev: lessonLink("2. Render supplied data", "/learn/02-supplied-data.md"),
    next: lessonLink("4. Use the Reader", "/learn/04-reader.md"),
  },
  "learn/04-reader.md": {
    prev: lessonLink("3. Load and interact", "/learn/03-live-data.md"),
    next: lessonLink(
      "5. Customize or go headless",
      "/learn/05-customization.md",
    ),
  },
  "learn/05-customization.md": {
    prev: lessonLink("4. Use the Reader", "/learn/04-reader.md"),
    next: lessonLink(
      "6. Integrate with a host",
      "/learn/06-host-integration.md",
    ),
  },
  "learn/06-host-integration.md": {
    prev: lessonLink(
      "5. Customize or go headless",
      "/learn/05-customization.md",
    ),
    next: lessonLink("Browse the guides", "/guides/"),
  },
  "learn/react.md": {
    prev: lessonLink("3. Load and interact", "/learn/03-live-data.md"),
    next: lessonLink("4. Use the Reader", "/learn/04-reader.md"),
  },
  "learn/alpine.md": {
    prev: lessonLink("3. Load and interact", "/learn/03-live-data.md"),
    next: lessonLink("4. Use the Reader", "/learn/04-reader.md"),
  },
} as const;

export default defineConfig({
  base: siteBasePath,
  title: "Sefaria Frontend Toolkit",
  description: "Documentation and examples for the Sefaria Frontend Toolkit.",
  head: [
    ["meta", { name: "sefaria-docs-site", content: "local-docs-site-wave-3" }],
  ],
  cleanUrls: false,
  srcExclude: [
    "README.md",
    "archive/**",
    "design.md",
    "development.md",
    "evidence.md",
    "handoff.md",
    "guides/reader-navigation.md",
    "reference/documentation-map.md",
    "review.md",
    "specs/**",
  ],
  ignoreDeadLinks: [
    /^\/examples\//,
    /^\.\.\/images\/reader-navigation(?:\.html)?$/,
  ],
  lastUpdated: true,
  outDir: path.join(repositoryRoot, "dist", "site"),
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
    },
  },
  transformPageData(pageData) {
    const pager =
      learningPagers[pageData.relativePath as keyof typeof learningPagers];
    if (pager) {
      pageData.frontmatter.prev = pager.prev;
      pageData.frontmatter.next = pager.next;
    }
  },
  themeConfig: {
    nav: [
      { text: "Get started", link: "/get-started.md" },
      { text: "Components", link: "/components.md" },
      { text: "Examples", link: "/examples.md" },
      { text: "Guides", link: "/guides/" },
      { text: "Reference", link: "/reference/custom-elements.md" },
    ],
    sidebar: {
      "/learn/": [
        {
          text: "Get started",
          link: "/get-started.md",
          items: [
            {
              text: "1. Choose a surface",
              link: "/learn/01-web-components.md",
            },
            {
              text: "2. Render supplied data",
              link: "/learn/02-supplied-data.md",
            },
            {
              text: "3. Load and interact",
              link: "/learn/03-live-data.md",
            },
            { text: "4. Use the Reader", link: "/learn/04-reader.md" },
            {
              text: "5. Customize or go headless",
              link: "/learn/05-customization.md",
            },
            {
              text: "6. Integrate with a host",
              link: "/learn/06-host-integration.md",
            },
          ],
        },
        {
          text: "Frameworks",
          items: [
            { text: "React path", link: "/learn/react.md" },
            { text: "Alpine path", link: "/learn/alpine.md" },
          ],
        },
      ],
      "/guides/": [
        {
          text: "Task guides",
          link: "/guides/",
          items: [
            { text: "Render text", link: "/guides/render-text.md" },
            { text: "Text markup", link: "/guides/text-markup.md" },
            { text: "Troubleshooting", link: "/guides/troubleshooting.md" },
          ],
        },
        {
          text: "Advanced explanations",
          items: [
            { text: "How data flows", link: "/guides/data-flow.md" },
            {
              text: "Intentional differences",
              link: "/guides/differences.md",
            },
          ],
        },
      ],
      "/components": [
        {
          text: "Component usage",
          link: "/components.html",
          items: [
            { text: "Reference label", link: "/components/ref-label.md" },
            { text: "Text segment", link: "/components/text-segment.md" },
            {
              text: "Bilingual segment",
              link: "/components/bilingual-segment.md",
            },
            { text: "Source card", link: "/components/source-card.md" },
            { text: "Popup", link: "/components/popup.md" },
            {
              text: "Connections panel",
              link: "/components/connections-panel.md",
            },
            { text: "Reader", link: "/components/reader.md" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "API reference",
          items: [
            {
              text: "Custom elements",
              link: "/reference/custom-elements.md",
            },
            { text: "Public exports", link: "/reference/public-exports.md" },
          ],
        },
      ],
      "/": [
        {
          text: "Start building",
          items: [
            { text: "Get started", link: "/get-started.md" },
            { text: "Components", link: "/components.md" },
            { text: "Examples", link: "/examples.md" },
            { text: "Guides", link: "/guides/" },
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
});
