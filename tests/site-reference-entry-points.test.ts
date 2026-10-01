import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadOverlayInputs } from "../packages/client/scripts/generate-openapi.js";
import { renderApiCorrections } from "../scripts/reference/api-corrections.js";
import { renderClientReference } from "../scripts/reference/client.js";
import {
  RESERVED,
  renderComponentsReference,
} from "../scripts/reference/components.js";
import { LLMS_SECTIONS, renderLlmsTxt } from "../scripts/reference/llms.js";
import { renderPackagesReference } from "../scripts/reference/packages.js";
import {
  renderNormalizedOutput,
  renderTextTransformReference,
} from "../scripts/reference/text-transform.js";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const RELEASE_SENTENCE =
  /documents the code on the `main` branch, which `alpha` builds are published from/u;
// TypeDoc starts a TypeScript 6 program in a child process.
const TYPEDOC_TIMEOUT = 120_000;
const OLDER_PINS = /Older pinned script-tag versions keep their own behavior/u;
const SCRIPT_INDEX =
  "Compare the stamp above with the version in the [script-tag versions index](https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/index.html).";

const SITE_URL = "https://arithmomaniac.github.io/sefaria-frontend-toolkit";
const ROUTES = {
  home: `${SITE_URL}/`,
  b2: `${SITE_URL}/use-components/start-here.html`,
  b7: `${SITE_URL}/use-components/use-with-a-framework.html`,
  b11: `${SITE_URL}/data-and-text-tools/start-here.html`,
  b13: `${SITE_URL}/data-and-text-tools/give-components-your-own-data.html`,
  b14: `${SITE_URL}/help/install-and-status.html`,
  b25: `${SITE_URL}/data-and-text-tools/handle-errors-in-your-code.html`,
  b26: `${SITE_URL}/data-and-text-tools/clean-up-stored-sefaria-text.html`,
  c2: `${SITE_URL}/concepts/the-client-and-sefarias-api.html`,
  c3: `${SITE_URL}/concepts/clean-text-and-safety.html`,
  r1: `${SITE_URL}/reference/components.html`,
  r2: `${SITE_URL}/reference/client.html`,
  r3: `${SITE_URL}/reference/text-transform.html`,
} as const;

async function expectOwnerSnippet(readme: string, owner: string) {
  const marker = `<!-- Snippet owner: ${owner}. Keep this block identical. -->`;
  const start = readme.indexOf(marker);
  expect(start, marker).toBeGreaterThan(-1);
  const fence = /```(?:ts|html)\n([\s\S]*?)\n```/u.exec(readme.slice(start));
  expect(fence?.[1]).toBe((await read(owner)).trim());
}

describe("EP1–EP5 README entry points", () => {
  it.each([
    ["README.md", ["home", "b2", "b11", "b14"]],
    ["packages/client/README.md", ["b11", "b14", "b25", "c2", "r2"]],
    ["packages/text-transform/README.md", ["b11", "b14", "b26", "c3", "r3"]],
    ["packages/web-components/README.md", ["b2", "b7", "b13", "b14", "r1"]],
  ] as const)(
    "%s is short, states status and links its routes",
    async (file, routes) => {
      const readme = await read(file);
      expect(readme.split("\n").length).toBeLessThan(90);
      expect(readme).toMatch(/[Ee]xperimental and unofficial/u);
      for (const route of routes)
        expect(readme, route).toContain(`(${ROUTES[route]}`);
      expect(readme).not.toMatch(/Genesis 1:1/u);
      for (const [, target] of readme.matchAll(/\]\((?!https?:|#)([^)#]+)/gu)) {
        await expect(
          read(path.posix.join(path.posix.dirname(file), target!)),
        ).resolves.toBeTypeOf("string");
      }
    },
  );

  it.each([
    ["packages/client/README.md", "@arithmomaniac/sefaria-client"],
    [
      "packages/text-transform/README.md",
      "@arithmomaniac/sefaria-text-transform",
    ],
    [
      "packages/web-components/README.md",
      "@arithmomaniac/sefaria-web-components",
    ],
  ])(
    "%s gives the GitHub Packages install caveat and a maintainer link",
    async (file, name) => {
      const readme = await read(file);
      expect(readme).not.toContain("_authToken");
      expect(readme).toContain("help/install-and-status.html#packages");
      expect(readme).toContain(name);
      expect(readme).toMatch(/read:packages/u);
      expect(readme).toContain(
        `https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/${path.posix.dirname(file)}/IMPLEMENTATION.md`,
      );
    },
  );

  it("package READMEs pull their owner snippets", async () => {
    await expectOwnerSnippet(
      await read("packages/web-components/README.md"),
      "examples/site-snippets/source-card-package.ts",
    );
    await expectOwnerSnippet(
      await read("packages/client/README.md"),
      "examples/site-snippets/client-first-success.ts",
    );
    await expectOwnerSnippet(
      await read("packages/text-transform/README.md"),
      "examples/site-snippets/text-transform-first-success.ts",
    );
  });

  it("the web components README lists the five elements and the root import", async () => {
    const readme = await read("packages/web-components/README.md");
    for (const tag of [
      "sefaria-text-segment",
      "sefaria-bilingual-segment",
      "sefaria-source-card",
      "sefaria-connections-panel",
      "sefaria-reader",
    ]) {
      expect(readme).toContain(`<${tag}>`);
    }
    expect(readme).toContain('import "@arithmomaniac/sefaria-web-components";');
  });

  it("the root README keeps license and links contributors to Development", async () => {
    const readme = await read("README.md");
    expect(readme).toContain("(LICENSE)");
    expect(readme).toContain("(docs/development.md)");
    expect(readme).toContain("GPL-3.0");
  });
});

describe("EP7 llms.txt", () => {
  it("states status, the script-tag route, both flows and the required links", async () => {
    const text = await renderLlmsTxt();
    const site = "https://arithmomaniac.github.io/sefaria-frontend-toolkit";
    expect(text).toMatch(/^# Sefaria Frontend Toolkit\n\n> /u);
    expect(text).toMatch(/experimental and unofficial/u);
    expect(text).toMatch(
      /`alpha` script address serves the newest published script release/u,
    );
    expect(text).toMatch(/may be retired without notice/u);
    expect(text).toContain(
      (await read("examples/site-snippets/source-card-script-tag.html")).trim(),
    );
    expect(text).toContain("use the components");
    expect(text).toContain("`@arithmomaniac/sefaria-client`");
    for (const route of [
      "",
      "use-components/start-here",
      "data-and-text-tools/start-here",
      "help/install-and-status",
      "use-components/start-with-an-ai-assistant",
      "reference/components",
      "reference/client",
      "reference/text-transform",
      "reference/package-imports-and-exports",
    ]) {
      expect(text).toContain(
        `](${site}/${route === "" ? "" : `${route}.html`})`,
      );
    }
    expect(text).toContain('import "@arithmomaniac/sefaria-web-components";');
    expect(text).toContain(
      "For an attributed passage, including a bilingual one, use Source Card.",
    );
    expect(text).toContain(
      "Text Segment and Bilingual Segment show no attribution.",
    );
    expect(text).not.toMatch(/components don.t show licenses/u);
    expect(text).toContain("Licenses reported");
    expect(text).toMatch(/`content-language` defaults to `both`/u);
    expect(text).toContain("`--sefaria-fg`");
    expect(text).not.toContain("`--sefaria-shadow`");
    expect(text).not.toContain("--sefaria-font-size");
    expect(text).toContain(
      "/blob/main/examples/site-snippets/ai-assistant-prompt.md",
    );
    expect(text).not.toMatch(/Genesis 1:1/u);
  });

  it("lists only routes that exist in the site", async () => {
    for (const section of LLMS_SECTIONS) {
      for (const route of section.routes) {
        await expect(read(`docs/${route}`)).resolves.toMatch(/^---/u);
      }
    }
  });

  it("is built into the site root", async () => {
    const plan = await import("../scripts/build-site-plan.mjs");
    expect(plan.SITE_REQUIRED_FILES).toContain("llms.txt");
  });
});

describe("R1 components reference", () => {
  it("is generated from custom-elements.json and states its release", async () => {
    const page = await read("docs/reference/components.md");
    expect(page).toBe(await renderComponentsReference());
    expect(page).toMatch(RELEASE_SENTENCE);
    expect(page).toMatch(OLDER_PINS);
  });

  it("covers each element's attributes, data, empty state and events", async () => {
    const page = await read("docs/reference/components.md");
    const manifest = JSON.parse(
      await read("packages/web-components/custom-elements.json"),
    ) as {
      modules: {
        declarations: {
          tagName: string;
          events: { name: string }[];
          cssProperties: { name: string }[];
        }[];
      }[];
    };
    const declarations = manifest.modules.flatMap((m) => m.declarations);
    expect(declarations).toHaveLength(5);
    expect(page).toContain('<a id="events"></a>');
    expect(page).not.toContain("| Property | Attribute |");
    for (const declaration of declarations) {
      const start = page.indexOf(`<a id="${declaration.tagName}"></a>`);
      expect(start).toBeGreaterThan(-1);
      const section = page.slice(start, page.indexOf("<a id=", start + 1));
      expect(section).toContain("### Attributes and properties");
      expect(section).toContain("### Data");
      expect(section).toContain("### Empty state");
      expect(section).toContain(
        `<ApiEntry id="${declaration.tagName}-sref" name="sref"`,
      );
      for (const event of declaration.events) {
        expect(page).toContain(`id="event-${event.name}" name="${event.name}"`);
      }
    }
    for (const property of declarations[0]!.cssProperties) {
      expect(page).toContain(`name="${property.name}"`);
    }
    expect(page).toContain('import "@arithmomaniac/sefaria-web-components";');
    expect(page).toContain(
      '<ApiEntry id="event-sefaria-reader-back" name="sefaria-reader-back"',
    );
    expect(page).toContain(
      "Requests navigation to the previous entry. Call `preventDefault()` to stop the Reader from going back.",
    );
    expect(page).toMatch(
      /id="event-sefaria-reader-error"[^\n]*Cancelable[^\n]*No/u,
    );
    expect(page).toMatch(/name="status"[^\n]*Read-only/u);
    expect(page).not.toContain("Read-only. Read-only");
    expect(page).not.toMatch(/`sefaria-sefaria`|bilingual-pair/u);
    expect(page).toMatch(
      /id="style-sefaria-font-scale"[^\n]*Used by[^\n]*sefaria-reader[^\n]*sefaria-text-segment/u,
    );
    expect(page).toContain("### CSS parts\n\nCSS parts: none.");
    expect(page).toContain('name="--sefaria-shadow"');
  });

  it("marks exactly the style tokens no component reads as reserved", async () => {
    const page = await read("docs/reference/components.md");
    const directory = "packages/web-components/src";
    const { readdir } = await import("node:fs/promises");
    const sources = await Promise.all(
      (await readdir(new URL(`../${directory}`, import.meta.url)))
        .filter(
          (file) =>
            file.endsWith(".ts") &&
            !file.includes(".test.") &&
            file !== "tokens.ts",
        )
        .map((file) => read(`${directory}/${file}`)),
    );
    const rows = [
      ...page.matchAll(
        /<ApiEntry id="style-[^"]*" name="(--sefaria-[a-z-]+)" :fields="([^"]*)">\n\n([^\n]*)/gu,
      ),
    ];
    expect(rows.length).toBeGreaterThan(0);
    const reserved: string[] = [];
    for (const [, name, fieldsJson, description] of rows) {
      const alias = name!.replace("--sefaria-", "--_sefaria-");
      const used = sources.some((source) => source.includes(`var(${alias}`));
      const fields = JSON.parse(fieldsJson!.replaceAll("&quot;", '"')) as {
        label: string;
        value: string;
      }[];
      const usedByCell = fields.find(
        (field) => field.label === "Used by",
      )?.value;
      expect(description!.includes(RESERVED), name).toBe(!used);
      if (used) {
        expect(usedByCell, name).not.toBe("—");
      } else {
        expect(usedByCell, name).toBe("—");
      }
      if (!used) reserved.push(name!);
    }
    expect(reserved.sort()).toEqual([
      "--sefaria-accent-soft",
      "--sefaria-border-strong",
      "--sefaria-danger",
      "--sefaria-font-label-hebrew",
      "--sefaria-shadow",
    ]);
  });
});

describe("R4 package imports and exports", () => {
  it("is generated from public-exports.json and states its release", async () => {
    const page = await read("docs/reference/package-imports-and-exports.md");
    expect(page).toBe(await renderPackagesReference());
    expect(page).toMatch(RELEASE_SENTENCE);
    expect(page).toMatch(OLDER_PINS);
    expect(page).toContain(SCRIPT_INDEX);
    expect(page).not.toContain(
      "The site doesn't compare it with the commit used to build this page, so the two can differ",
    );
  });

  it("lists every import path, links the versions index and doesn't repeat it", async () => {
    const page = await read("docs/reference/package-imports-and-exports.md");
    const inventory = JSON.parse(
      await read("packages/public-exports.json"),
    ) as {
      packages: { name: string; exports: { subpath: string }[] }[];
    };
    for (const entry of inventory.packages) {
      for (const { subpath } of entry.exports) {
        const path =
          subpath === "." ? entry.name : `${entry.name}/${subpath.slice(2)}`;
        expect(page).toContain(`| \`${path}\``);
      }
    }
    expect(page).toContain("/sefaria-frontend-toolkit/cdn/");
    expect(page).not.toMatch(/0\.0\.0-alpha\.\d/u);
    expect(page).toContain('import "@arithmomaniac/sefaria-web-components";');
  });
});

describe("R2 client reference", () => {
  it(
    "is generated and states its release",
    async () => {
      const page = await read("docs/reference/client.md");
      expect(page).toBe(await renderClientReference());
      expect(page).toMatch(RELEASE_SENTENCE);
      expect(page).toMatch(OLDER_PINS);
    },
    TYPEDOC_TIMEOUT,
  );

  it("lists every generated function under its namespace", async () => {
    const page = await read("docs/reference/client.md");
    const client = await import("../packages/client/src/index.js");
    let count = 0;
    for (const namespace of [
      "text",
      "index",
      "related",
      "calendars",
      "lexicon",
      "topic",
      "term",
      "sheets",
      "collections",
      "misc",
      "ref",
    ] as const) {
      expect(page).toContain(`### \`${namespace}\``);
      for (const name of Object.keys(client[namespace])) {
        expect(page).toContain(`\`${namespace}.${name}\``);
        count += 1;
      }
    }
    expect(count).toBe(60);
    for (const name of [
      "createSefariaClient",
      "SefariaClientOptions",
      "SefariaCacheOptions",
      "SefariaContractError",
      "validateExternalResponse",
      "getResponseContract",
    ]) {
      expect(page).toMatch(new RegExp(`^#{3,5} ${name}(?:\\(\\))?$`, "mu"));
    }
    expect(page).toContain("`maxEntries?`");
  });
});

describe("R3 text tools reference", () => {
  it(
    "is generated and states its release",
    async () => {
      const page = await read("docs/reference/text-transform.md");
      expect(page).toBe(await renderTextTransformReference());
      expect(page).toMatch(RELEASE_SENTENCE);
      expect(page).toMatch(OLDER_PINS);
    },
    TYPEDOC_TIMEOUT,
  );

  it("documents the four functions and the normalized output section", async () => {
    const page = await read("docs/reference/text-transform.md");
    for (const name of [
      "normalizeText",
      "applyVocalization",
      "applyVocalizationToHtml",
      "createTextPreview",
    ]) {
      expect(page).toMatch(new RegExp(`^#{3,5} ${name}\\(\\)$`, "mu"));
    }
    expect(page).toContain('<a id="normalized-html-output"></a>');
    const section = await renderNormalizedOutput();
    expect(page).toContain(section.split("\n").slice(0, 4).join("\n"));
    const source = await read("packages/text-transform/src/normalize.ts");
    for (const [attribute] of source.matchAll(/data-sefaria-[a-z-]+/gu)) {
      expect(page).toContain(`\`${attribute}\``);
    }
  });
});

it("uses package.json descriptions as package summaries", async () => {
  const page = await renderPackagesReference();
  for (const manifestPath of [
    "packages/client/package.json",
    "packages/text-transform/package.json",
    "packages/web-components/package.json",
  ]) {
    const manifest = JSON.parse(await read(manifestPath)) as {
      name: string;
      description: string;
      version: string;
    };
    expect(page).toContain(
      `${manifest.description} Package manifest version: \`${manifest.version}\`. [Reference](`,
    );
  }
});

describe("R5 corrections to Sefaria's API", () => {
  it("is generated from the overlay and pinned source", async () => {
    expect(await read("docs/reference/api-corrections.md")).toBe(
      await renderApiCorrections(),
    );
  });

  it("states the release it documents and links the versions index", async () => {
    const page = await read("docs/reference/api-corrections.md");
    expect(page).not.toMatch(/^stub: true$/mu);
    expect(page).toMatch(RELEASE_SENTENCE);
    expect(page).toMatch(OLDER_PINS);
    expect(page).toContain("<ReleaseStamp />");
  });

  it("groups corrections by endpoint and covers every correction and guard", async () => {
    const page = await read("docs/reference/api-corrections.md");
    const { overlay } = await loadOverlayInputs();
    expect(page).toMatch(/^## Corrections by endpoint$/mu);
    expect(page).toMatch(/^### `GET \/api\/v3\/texts\/\{tref\}`$/mu);
    for (const guard of overlay["x-sefaria-guards"]) {
      expect(page).toContain(`<a id="${guard.id}"></a>`);
    }
    for (const action of overlay.actions) {
      expect(page).toContain(`\`${action["x-action-id"]}\``);
    }
    const source = JSON.parse(
      await read("packages/client/openapi/source.json"),
    ) as { commit: string };
    expect(page).toContain(source.commit);
  });

  it("uses overlay guard titles and descriptions without the old summaries file", async () => {
    await expect(
      access(
        new URL(
          "../scripts/reference/api-corrections-summaries.json",
          import.meta.url,
        ),
      ),
    ).rejects.toThrow();
    const page = await read("docs/reference/api-corrections.md");
    const { overlay } = await loadOverlayInputs();
    const compactPage = page.replaceAll(/\s+/gu, " ");
    for (const guard of overlay["x-sefaria-guards"]) {
      expect(page).toContain(`### ${guard.title}`);
      expect(compactPage).toContain(guard.description.replaceAll(/\s+/gu, " "));
    }
  });

  it("follows a correction through later copies of the value it changed", async () => {
    const page = await read("docs/reference/api-corrections.md");
    const section = page.slice(
      page.indexOf('<a id="versions-contract"></a>'),
      page.indexOf('<a id="v3-text-contract"></a>'),
    );
    expect(section).toMatch(/^Endpoints: .*`GET \/api\/texts\/\{tref\}`/mu);
    const linker = page.slice(
      page.indexOf('<a id="linker-detection-contract"></a>'),
    );
    expect(linker).not.toMatch(/^Endpoints: .*\/api\/texts\//mu);
  });
});

describe("prose lint", () => {
  it("flags semicolons and long sentences but skips code, tables and frontmatter", async () => {
    const { lintProse } = await import("../scripts/check-prose.mjs");
    const long = Array.from({ length: 31 }, () => "word").join(" ") + ".";
    const issues = lintProse(
      [
        "---",
        'title: "A; b"',
        "---",
        "",
        "One; two.",
        "",
        long,
        "",
        "| a; b | c |",
        "",
        "```js",
        "const a = 1;",
        "```",
        "",
        "Uses `a; b` inline.",
      ].join("\n"),
    );
    expect(issues.map((issue: { kind: string }) => issue.kind)).toEqual([
      "semicolon",
      "31 words",
    ]);
  });

  it("skips script tags inside code fences and script blocks outside them", async () => {
    const { lintProse } = await import("../scripts/check-prose.mjs");
    const issues = lintProse(
      [
        "```html",
        "<script>",
        "  const card = 1;",
        "</script>",
        "```",
        "",
        "```ts",
        'import "x";',
        "```",
        "",
        "<script setup>",
        "const a = 1;",
        "</script>",
        "",
        "Plain prose.",
      ].join("\n"),
    );
    expect(issues).toEqual([]);
  });
});
