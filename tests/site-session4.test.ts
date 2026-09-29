import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
      "Types are included; no `@types` package is needed.",
    );
  });

  it("has a runtimes table that says how each runtime is covered", async () => {
    const markdown = await page();
    const lines = markdown.split("\n");
    const header = lines.findIndex((line) => /^\|\s*Runtime\s*\|/.test(line));
    expect(header).toBeGreaterThanOrEqual(0);
    const end = lines.findIndex(
      (line, i) => i > header && !line.startsWith("|"),
    );
    const table = lines.slice(header, end < 0 ? undefined : end);
    expect(table.length).toBeGreaterThanOrEqual(4);
    expect(table[0]).toMatch(/Runtime/i);
    for (const row of table.slice(2)) {
      expect(row).toMatch(
        /^\|[^|]+\|\s*(?:Tested in CI|Not tested in CI)\s*\|/,
      );
    }
  });

  it("states GPL-3.0-only, matching every package manifest", async () => {
    const rights = section(await page(), "license-and-text-rights");
    expect(rights).toContain("GPL-3.0-only");
    const manifests = (
      await readdir(path.join(root, "packages"), { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join("packages", entry.name, "package.json"));
    expect(manifests).toHaveLength(3);
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
