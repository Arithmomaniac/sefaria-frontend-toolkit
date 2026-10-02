import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createSefariaClient, text } from "../packages/client/src/index.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts: string[]) =>
  readFile(path.join(root, ...parts), "utf8");

function section(markdown: string, anchor: string): string {
  const start = markdown.search(new RegExp(`^##.*\\{#${anchor}\\}`, "m"));
  expect(start, `missing section #${anchor}`).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + 1);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
}

function expectWritten(markdown: string) {
  expect(markdown).not.toMatch(/^stub: true/m);
  expect(markdown).not.toContain("Coming soon");
  expect(markdown).not.toMatch(/Genesis 1:1/);
  expect(markdown).not.toMatch(/\b(?:B|C|E|R|EP|D|J|P|TI)\d{1,2}\b/);
}

describe("B14 Install and status", () => {
  const page = () => read("docs", "help", "install-and-status.md");

  it("is written, carries the status note, and states types are included", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).toContain("<StatusNote />");
    expect(markdown).toContain(
      "Types are included, so no `@types` package is needed.",
    );
  });

  it("says how each runtime is covered", async () => {
    const markdown = await page();
    expect(markdown).toContain("## Runtimes");
    expect(markdown).toContain("The components need a browser.");
    expect(markdown).toMatch(
      /Deno, Bun, and edge runtimes[^\n]*not tested in CI/,
    );
  });

  it("states GPL-3.0-only, matching every package manifest", async () => {
    const rights = section(await page(), "license-and-text-rights");
    expect(rights).toContain("GPL-3.0-only");
    const manifests = ["client", "text-transform", "web-components"].map(
      (name) => path.join("packages", name, "package.json"),
    );
    expect(await read("LICENSE")).toMatch(
      /GNU GENERAL PUBLIC LICENSE\s+Version 3/,
    );
    for (const manifest of manifests) {
      const json = JSON.parse(await read(manifest)) as { license?: string };
      expect(json.license, manifest).toBe("GPL-3.0-only");
    }
  });

  it("describes attribution without promising license display", async () => {
    const rights = section(await page(), "license-and-text-rights");
    expect(rights).toMatch(/Source Card/);
    expect(rights).toMatch(
      /doesn't show the (?:text's )?license|don't show the (?:text's )?license|none of the components shows? the license/i,
    );
    expect(rights).toMatch(/sefaria\.org/);
  });

  it("links to the pages that own exact paths and versions", async () => {
    const markdown = await page();
    for (const link of [
      "/reference/package-imports-and-exports.md",
      "/help/troubleshoot-a-page.md#get-support",
      "/across-components/choose-what-text-readers-see.md",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe("C1 How the toolkit works", () => {
  const page = () => read("docs", "concepts", "how-the-toolkit-works.md");

  it("is a written concept page with no status note or steps", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).not.toContain("<StatusNote");
    expect(markdown).not.toMatch(/^\d+\. /m);
  });

  it("keeps the promised anchors", async () => {
    const markdown = await page();
    expect(section(markdown, "status")).toMatch(
      /`empty`[\s\S]*`loading`[\s\S]*`ready`[\s\S]*`error`/,
    );
    expect(section(markdown, "without-components")).toContain("normalizeText");
  });

  it("explains composed elements without request-count framing", async () => {
    const markdown = await page();
    expect(markdown).toMatch(/composed/i);
    expect(markdown).toMatch(/Source Card[\s\S]{0,200}Reader/);
    expect(markdown).not.toMatch(
      /request count|no requests? of their own|never fetch/i,
    );
    expect(markdown).toContain("[Lit](https://lit.dev)");
    expect(markdown).toMatch(/```mermaid\s+flowchart TD/);
    expect(markdown).toMatch(
      /no requests?|zero requests?|doesn't make a request|makes no request/i,
    );
    expect(markdown).toMatch(/invalid[\s\S]{0,200}error/i);
    expect(markdown).toMatch(/Reader[\s\S]{0,300}custom loader/);
  });

  it("tells one story and leaves styling to its owner page", async () => {
    const markdown = await page();
    expect(markdown).not.toMatch(/shadow DOM|--sefaria-|light-dark|::part/i);
    expect(markdown.match(/match-your-sites-look\.md/g)).toHaveLength(1);
  });

  it("includes one diagram and links to its neighbours", async () => {
    const markdown = await page();
    expect(markdown.match(/```mermaid/g)).toHaveLength(1);
    for (const link of [
      "/reference/components.md",
      "/data-and-text-tools/give-components-your-own-data.md",
      "/help/troubleshoot-a-page.md",
      "/data-and-text-tools/handle-errors-in-your-code.md",
      "/data-and-text-tools/clean-up-stored-sefaria-text.md",
      "/concepts/the-client-and-sefarias-api.md",
      "/concepts/clean-text-and-safety.md",
      "/concepts/sefarias-own-texts-and-tools.md",
      "/reference/client.md",
      "/reference/text-transform.md",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe("C2 The client and Sefaria's API", () => {
  const page = () => read("docs", "concepts", "the-client-and-sefarias-api.md");

  it("is a written concept page with no status note or steps", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).not.toContain("<StatusNote");
    expect(markdown).not.toMatch(/^\d+\. /m);
  });

  it("matches the client's cache defaults and option names", async () => {
    const markdown = await page();
    const cache = await read("packages", "client", "src", "response-cache.ts");
    expect(cache).toMatch(/100/);
    expect(markdown).toMatch(/100 entries/);
    expect(markdown).toMatch(/10 MiB/);
    expect(markdown).toMatch(/five minutes|5 minutes/);
    expect(markdown).toContain("cache: false");
    expect(markdown).toMatch(/cache: \{ ttlMs, maxEntries, maxBytes \}/);
  });

  it("keeps each client's response cache separate", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const options = { baseUrl: "https://example.test", fetch: fetchMock };
    const first = createSefariaClient(options);
    const second = createSefariaClient(options);
    const request = { path: { tref: "Micah 6:8" } };

    await text.getTextVersions({ client: first, ...request });
    await text.getTextVersions({ client: first, ...request });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await text.getTextVersions({ client: second, ...request });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("tells a reader which path to report from a validation error", async () => {
    const markdown = await page();
    expect(markdown).toContain("SefariaContractError");
    expect(markdown).toContain("instancePath");
  });

  it("links to the error guide, client reference, corrections and Sefaria's API", async () => {
    const markdown = await page();
    for (const link of [
      "/data-and-text-tools/handle-errors-in-your-code.md",
      "/reference/client.md",
      "/reference/api-corrections.md",
      "https://developers.sefaria.org",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe("C3 Clean text and safety", () => {
  const page = () => read("docs", "concepts", "clean-text-and-safety.md");

  it("is a written concept page with no status note or steps", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).not.toContain("<StatusNote");
    expect(markdown).not.toMatch(/^\d+\. /m);
  });

  it("names the one sanitizer and the helpers that aren't", async () => {
    const markdown = await page();
    for (const name of [
      "normalizeText",
      "applyVocalization",
      "applyVocalizationToHtml",
      "createTextPreview",
    ]) {
      expect(markdown).toContain(`\`${name}\``);
    }
    expect(markdown).toMatch(
      /don't sanitize|doesn't sanitize|not sanitizers?|aren't sanitizers|isn't a sanitizer|is a sanitizer/i,
    );
  });

  it("gives a reader five cases to sort", async () => {
    const markdown = await page();
    const lines = markdown.split("\n");
    const header = lines.findIndex((line) => /^\|.*Safe/i.test(line));
    expect(header).toBeGreaterThanOrEqual(0);
    const end = lines.findIndex(
      (line, i) => i > header && !line.startsWith("|"),
    );
    const rows = lines.slice(header + 2, end < 0 ? undefined : end);
    expect(rows).toHaveLength(5);
  });

  it("links to its neighbours", async () => {
    const markdown = await page();
    for (const link of [
      "/data-and-text-tools/clean-up-stored-sefaria-text.md",
      "/concepts/how-the-toolkit-works.md",
      "/reference/text-transform.md#normalized-html-output",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe("C4 Sefaria's own texts and tools", () => {
  const page = () =>
    read("docs", "concepts", "sefarias-own-texts-and-tools.md");

  it("explains fallback and attribution once, linking B20 for per-component rules", async () => {
    const markdown = await page();
    expect(markdown).toContain("`translation-fallback`");
    expect(markdown).not.toContain("defaults to one");
    expect(markdown).not.toContain("Only Source Card and Reader");
    expect(markdown).toContain("/use-components/show-an-attributed-passage.md");
    expect(markdown).toContain(
      "/across-components/choose-what-text-readers-see.md",
    );
    // eslint-disable-next-line no-control-regex
    expect(markdown).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
  });
  it("is a written concept page with no status note or steps", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).not.toContain("<StatusNote");
    expect(markdown).not.toMatch(/^\d+\. /m);
  });

  it("explains translation choice with the fallback wording", async () => {
    const markdown = await page();
    expect(markdown).toContain("translation-language");
    expect(markdown).toMatch(
      /Sefaria's default translation, which isn't always English/,
    );
    expect(markdown).not.toMatch(/components? (?:show|display)s? the license/i);
  });

  it("links out to Sefaria's docs and our owner pages", async () => {
    const markdown = await page();
    for (const link of [
      "/across-components/choose-what-text-readers-see.md",
      "/help/install-and-status.md#license-and-text-rights",
      "/examples/linked-article.md",
      "/examples/reader-inside-ai-chat.md",
      "https://developers.sefaria.org/",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe("B22 Start with an AI assistant", () => {
  const page = () =>
    read("docs", "use-components", "start-with-an-ai-assistant.md");
  const prompt = () =>
    read("examples", "site-snippets", "ai-assistant-prompt.md");

  it("is written, carries the status note, and embeds the owned prompt", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).toContain("<StatusNote />");
    expect(markdown).toMatch(
      /^<<< .*examples\/site-snippets\/ai-assistant-prompt\.md/m,
    );
  });

  it("keeps the prompt pointed at the toolkit, not raw API code", async () => {
    const text = await prompt();
    expect(text).toContain(
      "https://arithmomaniac.github.io/sefaria-frontend-toolkit/llms.txt",
    );
    expect(text).toContain("Micah 6:8");
    expect(text).toContain("<sefaria-source-card");
    expect(text).toContain(
      "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js",
    );
    expect(text).toContain('import "@arithmomaniac/sefaria-web-components";');
    expect(text).toMatch(/attribution/i);
    expect(text).not.toMatch(/Genesis 1:1/);
  });

  it("gives a checklist and links to the pages it routes to", async () => {
    const markdown = await page();
    expect(markdown).toMatch(/^## Check the result/m);
    for (const link of [
      "/llms.txt",
      "/use-components/start-here.md",
      "/use-components/show-text/show-one-passage.md",
      "/use-components/show-text/hebrew-and-translation.md",
      "/use-components/show-an-attributed-passage.md",
      "/help/install-and-status.md",
      "/help/troubleshoot-a-page.md",
      "/concepts/sefarias-own-texts-and-tools.md",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });
});

describe.each([
  {
    name: "E1 Composed multi-pane Reader",
    file: "composed-multi-pane-reader.md",
    route: "/examples/reader/",
    regions: [
      "examples/reader/src/app.ts#seed-session",
      "examples/reader/src/app.ts#feed-source-card",
      "examples/reader/src/app.ts#wire-connections",
    ],
    links: [
      "/use-components/show-an-attributed-passage.md",
      "/use-components/show-commentary-and-connected-texts.md",
      "/use-components/add-the-complete-reader.md",
      "/concepts/how-the-toolkit-works.md",
      "/reference/components.md",
    ],
  },
  {
    name: "E4 This week's portion",
    file: "this-weeks-portion.md",
    route: "/examples/weekly-portion/",
    regions: ["examples/weekly-portion/index.html#source-card"],
    links: [
      "/use-components/show-an-attributed-passage.md",
      "/data-and-text-tools/start-here.md",
      "/reference/client.md",
      "/reference/package-imports-and-exports.md",
    ],
  },
  {
    name: "E2 Linked article",
    file: "linked-article.md",
    route: "/examples/linked-article/",
    regions: [
      "examples/linked-article/src/app.ts#open-preview",
      "examples/linked-article/index.html#authored-link",
    ],
    links: [
      "/use-components/show-an-attributed-passage.md",
      "/concepts/sefarias-own-texts-and-tools.md",
      "https://developers.sefaria.org/docs/linker-v3",
    ],
  },
  {
    name: "E3 Reader inside AI chat",
    file: "reader-inside-ai-chat.md",
    route: "/examples/mcp-app/live.html",
    regions: ["examples/mcp-app/src/app.ts#reader-acquisition"],
    links: [
      "/use-components/add-the-complete-reader.md",
      "/data-and-text-tools/give-components-your-own-data.md",
      "/concepts/sefarias-own-texts-and-tools.md",
      "/reference/components.md",
    ],
  },
])("$name", ({ file, route, regions, links }) => {
  const page = () => read("docs", "examples", file);

  it("is a written example with no status note", async () => {
    const markdown = await page();
    expectWritten(markdown);
    expect(markdown).not.toContain("<StatusNote");
  });

  it("embeds the built example and links to it in a new tab", async () => {
    const markdown = await page();
    expect(markdown).toMatch(/<iframe[\s\S]*?sandbox="[^"]*allow-scripts/);
    expect(markdown).toContain(`withBase('${route}')`);
    expect(markdown).toMatch(/Open in a new tab/);
    expect(markdown).toMatch(/complete app/i);
  });

  it("shows code read-only from regions in the owner source", async () => {
    const markdown = await page();
    for (const region of regions) {
      const [source, name] = region.split("#");
      expect(markdown).toContain(`<<< ../../${source}#${name}`);
      expect(await read(...source!.split("/"))).toMatch(
        new RegExp(`#region ${name}\\b`),
      );
    }
  });

  it("links to its neighbours", async () => {
    const markdown = await page();
    for (const link of links) expect(markdown).toContain(`(${link}`);
  });
});

describe("E4 calendar snippet", () => {
  it("shows the calendar call from the example source with the language toggle", async () => {
    const markdown = await read("docs", "examples", "this-weeks-portion.md");
    expect(markdown).toContain(
      `<CodeLanguageToggle :snippet="snippets['weekly-portion-calendar-call']" />`,
    );
    expect(
      await read("docs", "data-and-text-tools", "snippets.data.ts"),
    ).toContain('file: "examples/weekly-portion/src/app.ts"');
    expect(markdown).not.toMatch(/\bfetch\(/);
  });
});

describe("E3 VS Code steps", () => {
  it("names the three VS Code scripts that exist", async () => {
    const markdown = await read("docs", "examples", "reader-inside-ai-chat.md");
    const scripts = (
      JSON.parse(await read("package.json")) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    for (const script of [
      "setup:mcp:vscode",
      "launch:mcp:vscode",
      "walkthrough:mcp:vscode",
    ]) {
      expect(scripts[script]).toBeDefined();
      expect(markdown).toContain(`pnpm ${script}`);
    }
  });
});

describe("Example app embeds", () => {
  const examplePages = new Set([
    "docs/examples/composed-multi-pane-reader.md",
    "docs/examples/linked-article.md",
    "docs/examples/reader-inside-ai-chat.md",
    "docs/examples/this-weeks-portion.md",
  ]);

  async function* sources(dir: string): AsyncGenerator<string> {
    for (const entry of await readdir(path.join(root, dir), {
      withFileTypes: true,
    })) {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!["node_modules", "dist", "cache", ".temp"].includes(entry.name))
          yield* sources(relative);
      } else if (/\.(?:md|vue|ts|mjs)$/.test(entry.name)) yield relative;
    }
  }

  it("uses allow-same-origin only on the example pages, and never calls them isolated", async () => {
    for await (const file of sources("docs")) {
      if (file === "docs/.vitepress/theme/README.md") continue;
      const text = await read(...file.split("/"));
      if (!/<iframe[^>]*sandbox="[^"]*allow-same-origin/.test(text)) continue;
      expect(examplePages.has(file), file).toBe(true);
    }
    for (const file of examplePages) {
      const text = await read(...file.split("/")).catch(() => "");
      expect(text).not.toMatch(/\bisolat/i);
    }
    const editor = await read("docs", ".vitepress", "theme", "LiveEditor.vue");
    expect(editor).not.toContain("allow-same-origin");
  });
});

describe("B15 Troubleshoot a page", () => {
  const page = () => read("docs", "help", "troubleshoot-a-page.md");

  it("is written and names every public status", async () => {
    const markdown = await page();
    expectWritten(markdown);
    for (const status of ["empty", "loading", "ready", "error"]) {
      expect(markdown).toContain(`\`${status}\``);
    }
  });

  it("routes to the owning pages", async () => {
    const markdown = await page();
    for (const link of [
      "/help/install-and-status.md",
      "/data-and-text-tools/handle-errors-in-your-code.md",
      "/concepts/how-the-toolkit-works.md",
      "/concepts/the-client-and-sefarias-api.md",
      "/concepts/clean-text-and-safety.md",
    ]) {
      expect(markdown).toContain(`(${link}`);
    }
  });

  it("closes with a support section that asks for a useful report", async () => {
    const support = section(await page(), "get-support");
    expect(support).toContain(
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/issues/new",
    );
    for (const item of [
      /reference/i,
      /component or function/i,
      /browser or runtime/i,
      /`status`/,
      /event|error/i,
      /validation path/i,
    ]) {
      expect(support).toMatch(item);
    }
    expect(support).toMatch(/Sefaria/);
    expect(support).toMatch(/one maintainer|single maintainer/i);
  });
});
