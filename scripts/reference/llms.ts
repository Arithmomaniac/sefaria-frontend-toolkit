import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { reservedTokens } from "./components.js";

const SITE = "https://sefaria.github.io/sefaria-frontend-toolkit";
const REPOSITORY = "https://github.com/Sefaria/sefaria-frontend-toolkit";
const docs = (route: string) => new URL(`../../docs/${route}`, import.meta.url);
const snippet = (file: string) =>
  readFile(
    new URL(`../../examples/site-snippets/${file}`, import.meta.url),
    "utf8",
  );

interface Section {
  readonly heading: string;
  readonly routes: readonly string[];
}

/** The site's pages, in the order an assistant should consider them. */
export const LLMS_SECTIONS: readonly Section[] = [
  {
    heading: "Start here",
    routes: [
      "index.md",
      "use-components/start-here.md",
      "data-and-text-tools/start-here.md",
      "use-components/start-with-an-ai-assistant.md",
      "help/install-and-status.md",
    ],
  },
  {
    heading: "Use components",
    routes: [
      "use-components/show-text/show-one-passage.md",
      "use-components/show-text/hebrew-and-translation.md",
      "use-components/show-an-attributed-passage.md",
      "use-components/use-with-a-framework.md",
      "use-components/show-commentary-and-connected-texts.md",
      "use-components/add-the-complete-reader.md",
      "across-components/match-your-sites-look.md",
      "across-components/choose-what-text-readers-see.md",
      "across-components/make-components-respond-to-each-other.md",
    ],
  },
  {
    heading: "Use the data and text tools",
    routes: [
      "data-and-text-tools/give-components-your-own-data.md",
      "data-and-text-tools/handle-errors-in-your-code.md",
      "data-and-text-tools/clean-up-stored-sefaria-text.md",
    ],
  },
  {
    heading: "Reference: exact names",
    routes: [
      "reference/components.md",
      "reference/client.md",
      "reference/text-transform.md",
      "reference/package-imports-and-exports.md",
      "reference/api-corrections.md",
    ],
  },
  {
    heading: "Concepts",
    routes: [
      "concepts/how-the-toolkit-works.md",
      "concepts/the-client-and-sefarias-api.md",
      "concepts/clean-text-and-safety.md",
      "concepts/sefarias-own-texts-and-tools.md",
    ],
  },
  {
    heading: "Examples",
    routes: [
      "examples/composed-multi-pane-reader.md",
      "examples/linked-article.md",
      "examples/reader-inside-ai-chat.md",
      "examples/this-weeks-portion.md",
    ],
  },
  {
    heading: "Optional",
    routes: ["help/troubleshoot-a-page.md"],
  },
];

async function describe(route: string): Promise<string> {
  const source = await readFile(docs(route), "utf8");
  const front = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source)?.[1] ?? "";
  const field = (name: string) => {
    const raw = new RegExp(`^${name}:\\s*(.+)$`, "mu").exec(front)?.[1];
    if (!raw) return undefined;
    return raw.startsWith('"') ? (JSON.parse(raw) as string) : raw.trim();
  };
  const title = route === "index.md" ? "Home" : (field("title") ?? route);
  const description = field("description") ?? field("  tagline") ?? "";
  const stub = /^stub: true$/mu.test(front);
  // Some example routes share a name with a hosted app directory, so link the page file.
  const url =
    route === "index.md"
      ? `${SITE}/`
      : `${SITE}/${route.replace(/\.md$/u, ".html")}`;
  return `- [${title}](${url})${stub ? " (coming soon)" : ""}: ${description}`;
}

/** Style settings that at least one component reads. */
interface CustomElementsManifest {
  readonly modules: readonly {
    readonly declarations: readonly {
      readonly tagName?: string;
      readonly cssProperties?: readonly { readonly name: string }[];
      readonly cssParts?: readonly { readonly name: string }[];
      readonly attributes?: readonly {
        readonly name: string;
        readonly default?: string;
      }[];
    }[];
  }[];
}

async function customElementsManifest(): Promise<CustomElementsManifest> {
  return JSON.parse(
    await readFile(
      new URL(
        "../../packages/web-components/custom-elements.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as CustomElementsManifest;
}

async function usableTokens(
  manifest: CustomElementsManifest,
): Promise<readonly string[]> {
  const names = (
    manifest.modules.flatMap((module) => module.declarations)[0]
      ?.cssProperties ?? []
  ).map((property) => property.name);
  const reserved = await reservedTokens(names);
  return names.filter((name) => !reserved.has(name));
}

function cssParts(manifest: CustomElementsManifest): readonly string[] {
  return [
    ...new Set(
      manifest.modules
        .flatMap((module) => module.declarations)
        .flatMap((declaration) => declaration.cssParts ?? [])
        .map((part) => part.name),
    ),
  ];
}

function contentLanguageDefault(manifest: CustomElementsManifest): string {
  const attribute = manifest.modules
    .flatMap((module) => module.declarations)
    .flatMap((declaration) => declaration.attributes ?? [])
    .find((candidate) => candidate.name === "content-language");
  if (!attribute?.default) {
    throw new Error(
      "custom-elements.json does not document content-language default.",
    );
  }
  return attribute.default.replace(/^"|"$/gu, "");
}

export async function renderLlmsTxt(): Promise<string> {
  const scriptTag = (await snippet("source-card-script-tag.html")).trim();
  const manifest = await customElementsManifest();
  const tokens = await usableTokens(manifest);
  const parts = cssParts(manifest);
  const contentLanguage = contentLanguageDefault(manifest);
  const lines = [
    "# Sefaria Frontend Toolkit",
    "",
    "> Web components and TypeScript tools for showing texts from Sefaria's library on your own web pages. The components load and display sources by reference. The client fetches and checks Sefaria API responses, and the text tools make Sefaria's text HTML safe to display (`normalizeText`) and prepare it.",
    "",
    "Status: experimental and community-driven with Sefaria backing and support. Sefaria owns the MIT-licensed toolkit, which began at Microsoft Global Hackathon 2026. Names and APIs may change.",
    "Install public npm packages at exact version 0.1.0-alpha.0. The npm `alpha` tag moves between reviewed prereleases, not main-build snapshots. Browser examples pin the packaged standalone modules through jsDelivr; UNPKG is an explicit alternative, not an automatic fallback. Ordinary main CI publishes no packages or script snapshots.",
    "",
    "Choose a path:",
    "",
    `- To show Sefaria texts on a page, use the components from \`@sefaria/web-components\`. They're HTML elements, so prefer them to calling the API and handling Sefaria's text HTML yourself. For a page with no build step, add this script tag and element, then read ${SITE}/use-components/start-here:`,
    "",
    "```html",
    scriptTag,
    "```",
    "",
    `- To work with Sefaria's data in your own code, use \`@sefaria/api-client\` to fetch checked API responses and \`@sefaria/text-transform\` and its \`normalizeText\` function to make text HTML safe before you show it. Start at ${SITE}/data-and-text-tools/start-here.`,
    `- To install the npm packages, or to choose between them and the script tag, read ${SITE}/help/install-and-status. With a bundler, register every element once with \`import "@sefaria/web-components";\`. The element subpaths don't register their element.`,
    `- Keep attribution. For an attributed passage, including a bilingual one, use Source Card. Text Segment and Bilingual Segment show no attribution. Source Card shows each edition's title with its language name, linked to its source when the source is a valid http(s) address; don't hide it with \`hide-attributions\`, and don't copy text out of a component without its attribution. Reader also shows edition attribution. Only Source Card links it, and none of them shows a license. Connections Panel previews, also inside the Reader, can show "Licenses reported" when Sefaria provides them. See ${SITE}/help/install-and-status.html#license-and-text-rights.`,
    `- Source Card shows both the primary text and the translation by default (\`content-language\` defaults to \`${contentLanguage}\`).`,
    `- Style the elements with the \`--sefaria-*\` settings listed at ${SITE}/reference/components.html#style-settings: ${tokens.map((name) => `\`${name}\``).join(", ")}. Don't invent other names. You can also style an element's own box (\`display\`, \`margin\`, width), and the Reader exposes ${parts.map((name) => `\`::part(${name})\``).join(", ")}. See ${SITE}/across-components/match-your-sites-look.html.`,
    `- If you're an assistant building a page for someone, also read ${SITE}/use-components/start-with-an-ai-assistant. Its prompt is at ${REPOSITORY}/blob/main/examples/site-snippets/ai-assistant-prompt.md.`,
    `- For exact element, function, type and import names, use the reference pages below instead of guessing.`,
    "",
  ];
  for (const section of LLMS_SECTIONS) {
    lines.push(`## ${section.heading}`, "");
    for (const route of section.routes) lines.push(await describe(route));
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error("Usage: tsx scripts/reference/llms.ts <output>");
  await writeFile(out, await renderLlmsTxt());
}
