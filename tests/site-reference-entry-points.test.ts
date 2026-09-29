import { readFile } from "node:fs/promises";
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
    expect(text).toMatch(/Keep attribution/u);
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
    expect(declarations).toHaveLength(6);
    expect(page).toContain('<a id="events"></a>');
    for (const declaration of declarations) {
      const start = page.indexOf(`<a id="${declaration.tagName}"></a>`);
      expect(start).toBeGreaterThan(-1);
      const section = page.slice(start, page.indexOf("<a id=", start + 1));
      expect(section).toContain("### Attributes and properties");
      expect(section).toContain("### Data");
      expect(section).toContain("### Empty state");
      expect(section).toContain("| `sref` | `sref` |");
      for (const event of declaration.events) {
        expect(page).toContain(`\`${event.name}\``);
      }
    }
    for (const property of declarations[0]!.cssProperties) {
      expect(page).toContain(`\`${property.name}\``);
    }
    expect(page).toContain('import "@arithmomaniac/sefaria-web-components";');
    expect(page).toContain(
      "| Reader | `sefaria-reader-back` | Requests navigation to the previous entry. | `originEntryId`, the entry the Reader was showing | Yes |",
    );
    expect(page).toMatch(/\| Reader \| `sefaria-reader-error` \|.*\| No \|/u);
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
    const rows = [...page.matchAll(/^\| `(--sefaria-[a-z-]+)` \|.*$/gmu)];
    expect(rows.length).toBeGreaterThan(0);
    const reserved: string[] = [];
    for (const [row, name] of rows) {
      const alias = name!.replace("--sefaria-", "--_sefaria-");
      const used = sources.some((source) => source.includes(`var(${alias}`));
      expect(row.includes(RESERVED), name).toBe(!used);
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
