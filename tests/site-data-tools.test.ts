import process from "node:process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { toJavaScript } from "../scripts/strip-types.mjs";

const root = path.resolve(import.meta.dirname, "..");
const snippetDirectory = path.join(root, "examples", "site-snippets");
const generatedDirectory = path.join(snippetDirectory, ".generated-js");
const micah = JSON.parse(
  await readFile(
    path.join(root, "tests", "site-fixtures", "micah-6-8-2026-09-28.json"),
    "utf8",
  ),
) as { payload: { versions: { isPrimary: boolean }[] } };

// Each case imports the snippet twice; cold imports are slow under a full parallel run.
vi.setConfig({ testTimeout: 30_000 });

let output: string[] = [];
let requests: string[] = [];

function micahResponse(url: string): Response {
  const versions = new URL(url).searchParams.getAll("version");
  const payload =
    versions.length === 1 && versions[0] === "translation"
      ? {
          ...micah.payload,
          versions: micah.payload.versions.filter((v) => !v.isPrimary),
        }
      : micah.payload;
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  output = [];
  requests = [];
  vi.spyOn(console, "log").mockImplementation((...values: unknown[]) => {
    output.push(
      values
        .map((value) =>
          typeof value === "string" ? value : JSON.stringify(value),
        )
        .join(" "),
    );
  });
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const signal = input instanceof Request ? input.signal : init?.signal;
      if (signal?.aborted) throw signal.reason;
      const url = input instanceof Request ? input.url : String(input);
      requests.push(url);
      if (
        url.startsWith("https://www.sefaria.org/api/v3/texts/Micah%206%3A8")
      ) {
        return micahResponse(url);
      }
      throw new TypeError(`Unexpected request: ${url}`);
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await rm(generatedDirectory, { recursive: true, force: true });
});

async function runBoth(name: string) {
  vi.resetModules();
  await import(pathToFileURL(path.join(snippetDirectory, `${name}.ts`)).href);
  const typescript = { output, requests };
  output = [];
  requests = [];
  await mkdir(generatedDirectory, { recursive: true });
  const javascriptFile = path.join(generatedDirectory, `${name}.js`);
  await writeFile(
    javascriptFile,
    await toJavaScript(
      await readFile(path.join(snippetDirectory, `${name}.ts`), "utf8"),
    ),
  );
  vi.resetModules();
  await import(pathToFileURL(javascriptFile).href);
  const javascript = { output, requests };
  expect(javascript).toEqual(typescript);
  return typescript;
}

describe("JavaScript generated from TypeScript snippets", () => {
  it("removes type-only syntax and keeps runtime code", async () => {
    const javascript = await toJavaScript(
      [
        'import type { Thing } from "./thing";',
        'import { make } from "./make";',
        "",
        "interface Shape {",
        "  name: string;",
        "}",
        "",
        "const value: Thing = make<Shape>({ name: 'x' } as Shape);",
        "console.log(value);",
        "",
      ].join("\n"),
    );
    expect(javascript).toBe(
      [
        'import { make } from "./make";',
        "",
        'const value = make({ name: "x" });',
        "console.log(value);",
        "",
      ].join("\n"),
    );
  });

  it("produces parseable JavaScript for every site snippet", async () => {
    const files = (await readdir(snippetDirectory)).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    for (const file of files) {
      const source = await readFile(path.join(snippetDirectory, file), "utf8");
      const javascript = await toJavaScript(source);
      expect(javascript, file).not.toMatch(
        /\binterface\b|import type|: \w+\[\]/,
      );
      expect(syntaxErrors(javascript), file).toEqual([]);
    }
  });
});

function syntaxErrors(javascript: string): string[] {
  const result = spawnSync(
    process.execPath,
    ["--check", "--input-type=module"],
    { input: javascript, encoding: "utf8", windowsHide: true },
  );
  return result.status === 0 ? [] : [result.stderr];
}
describe("B11 first successes", () => {
  it("fetches one checked response and shows a validation path", async () => {
    const { output, requests } = await runBoth("client-first-success");
    expect(requests).toHaveLength(1);
    expect(output).toContain("Micah 6:8 · he · Miqra according to the Masorah");
    expect(
      output.some(
        (line) =>
          line ===
          "Invalid at /isSpanning: Invalid input: expected boolean, received string",
      ),
    ).toBe(true);
  });

  it("normalizes held text before vocalizing it, with no requests", async () => {
    const { output, requests } = await runBoth("text-transform-first-success");
    expect(requests).toEqual([]);
    const [bodyHtml, withVowels] = output;
    expect(bodyHtml).toContain('data-sefaria-mam="setumah"');
    expect(bodyHtml).not.toContain("onclick");
    expect(bodyHtml).toContain("\u05a5");
    expect(withVowels).not.toMatch(/[\u0591-\u05af]/u);
    expect(withVowels).toContain("\u05b4");
    const source = await readFile(
      path.join(snippetDirectory, "text-transform-first-success.ts"),
      "utf8",
    );
    expect(source.indexOf("normalizeText(")).toBeLessThan(
      source.indexOf("applyVocalizationToHtml("),
    );
  });

  it("fetches with the client and prints the normalized body", async () => {
    const { output, requests } = await runBoth("client-and-text-first-success");
    expect(requests).toHaveLength(1);
    expect(output[0]).toBe("THE JPS TANAKH: Gender-Sensitive Edition:");
    expect(output[1]).toContain("You have been told, O mortal");
    expect(output[1]).not.toContain('class="');
    expect(output[2]).toBe("1 footnote(s) kept separately.");
  });
});

async function pageOutputAfter(page: string, snippet: string) {
  const markdown = await readFile(path.join(root, "docs", page), "utf8");
  const start = markdown.indexOf(`snippets['${snippet}']`);
  const block = /```text\n([\s\S]*?)\n```/.exec(markdown.slice(start));
  return block?.[1]?.split("\n");
}

describe("B11 page shows real output", () => {
  it.each(["text-transform-first-success", "client-and-text-first-success"])(
    "%s output block matches the program",
    async (name) => {
      const { output } = await runBoth(name);
      expect(
        await pageOutputAfter("data-and-text-tools/start-here.md", name),
      ).toEqual(output.map((line) => line.trimEnd()));
    },
  );
});

describe("B26 clean up stored Sefaria text", () => {
  const page = "data-and-text-tools/clean-up-stored-sefaria-text.md";

  it("generates every before-and-after row from current code", async () => {
    const markdown = await readFile(path.join(root, "docs", page), "utf8");
    const rows = [...markdown.matchAll(/^\| `(.+)` \| `(.*)` \|$/gmu)];
    expect(rows.length).toBeGreaterThanOrEqual(10);
    const { output } = await runBoth("text-markup-before-after");
    const pairs = new Map<string, string>();
    for (let index = 0; index + 1 < output.length; index += 1) {
      const before = output[index];
      if (before && !before.startsWith("  ") && output[index - 1] !== before) {
        if (index === 0 || output[index - 1] === "") {
          pairs.set(before, output[index + 1] ?? "");
        }
      }
    }
    for (const [, before, after] of rows) {
      expect(pairs.get(before ?? ""), before).toBe(after);
    }
    expect(pairs.size).toBe(rows.length);
  });

  it("removes unsupported attributes and emits only stable attributes", async () => {
    const { normalizeText } =
      await import("../packages/text-transform/src/index.js");
    const { bodyHtml } = normalizeText(
      '<b onclick="x()" style="color:red" class="a" id="b">t</b><span dir="rtl" lang="he">ש</span><a href="javascript:x()" data-ref="Micah 6:8">M</a>',
    );
    expect(bodyHtml).toBe(
      '<b>t</b><span dir="rtl">ש</span><span data-sefaria-ref="Micah 6:8">M</span>',
    );
    const attributes = [...bodyHtml.matchAll(/\s([a-z-]+)=/gu)].map(
      (m) => m[1],
    );
    for (const attribute of attributes) {
      expect(attribute).toMatch(/^(dir|style|data-sefaria-[a-z-]+)$/u);
    }
  });

  it("covers every vocalization mode and both PASEQ modes", async () => {
    const { output } = await runBoth("prepare-stored-text");
    expect(output.map((line) => line.split(":")[0])).toEqual([
      "taamim_and_nikkud",
      "nikkud",
      "none",
      "after-space",
      "always",
    ]);
    expect(output[0]).toMatch(/[\u0591-\u05af]/u);
    expect(output[1]).not.toMatch(/[\u0591-\u05af]/u);
    expect(output[1]).toMatch(/[\u05b0-\u05bc]/u);
    expect(output[2]).not.toMatch(/[\u0591-\u05bd\u05bf-\u05c7]/u);
    expect(output[3]).toContain("\u05c0");
    expect(output[3]).not.toContain(" \u05c0");
    expect(output[4]).not.toContain("\u05c0");
    expect(await pageOutputAfter(page, "prepare-stored-text")).toEqual(
      output.map((line) => line.trimEnd()),
    );
  });

  it("shows that vocalization is not sanitization", async () => {
    const { applyVocalizationToHtml, normalizeText } =
      await import("../packages/text-transform/src/index.js");
    const unsafe = '<img src="x" onerror="steal()">הִגִּ֥יד';
    expect(applyVocalizationToHtml(unsafe, "nikkud")).toContain("onerror");
    expect(
      applyVocalizationToHtml(normalizeText(unsafe).bodyHtml, "nikkud"),
    ).toBe("הִגִּיד");
    const markdown = await readFile(path.join(root, "docs", page), "utf8");
    const snippet = await readFile(
      path.join(snippetDirectory, "prepare-stored-text.ts"),
      "utf8",
    );
    expect(snippet.indexOf("normalizeText(storedHtml)")).toBeLessThan(
      snippet.indexOf("applyVocalizationToHtml(html"),
    );
    expect(markdown).toMatch(/not a sanitizer/u);
  });
});

describe("B25 handle errors in your code", () => {
  it("produces all three failure kinds deterministically", async () => {
    const { output, requests } = await runBoth("client-errors");
    expect(requests).toEqual([]);
    expect(output[0]).toBe(
      "Sefaria error 404: Could not find title in reference",
    );
    const report = JSON.parse(
      output[1]?.replace("Unexpected response shape: ", "") ?? "",
    );
    expect(report).toEqual({
      operationId: "get-v3-texts",
      method: "GET",
      path: "/api/v3/texts/{tref}",
      status: 200,
      issues: [
        {
          instancePath: "",
          keyword: "content-type",
          message: "Expected application/json, received text/html.",
        },
      ],
    });
    expect(output[2]).toBe("Request failed: TypeError: fetch failed");
    expect(output[3]).toBe("Request failed: AbortError: Reader left the page");
  });
});

describe("B25 page", () => {
  it("shows the real output and routes visible failures to troubleshooting", async () => {
    const page = "data-and-text-tools/handle-errors-in-your-code.md";
    const { output } = await runBoth("client-errors");
    expect(await pageOutputAfter(page, "client-errors")).toEqual(output);
    const markdown = await readFile(path.join(root, "docs", page), "utf8");
    expect(markdown).toContain("(/help/troubleshoot-a-page.md)");
    expect(markdown).toContain("(/help/troubleshoot-a-page.md#get-support)");
    expect(markdown).toContain("doesn't retry");
  });
});
