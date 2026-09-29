import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { highlightHtml } from "../docs/.vitepress/theme/highlight";

const root = path.resolve(import.meta.dirname, "..");
const deletedPaths = [
  "docs/guides",
  "docs/learn",
  "docs/components",
  "docs/components.md",
  "docs/examples.md",
  "docs/get-started.md",
  "docs/linked-article.md",
  "docs/mcp-app-demo.md",
  "docs/reference/custom-elements.md",
  "docs/reference/public-exports.md",
  "docs/reference/documentation-map.md",
];

const codeTextContent = (html: string) =>
  html
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("documentation site", () => {
  it("keeps Home focused without hero actions", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const theme = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "index.ts"),
      "utf8",
    );
    const statusNote = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "StatusNote.vue"),
      "utf8",
    );

    expect(index).toContain("heroExample: true");
    expect(index).toContain("statusNote: true");
    expect(index).not.toContain("actions:");
    expect(index).not.toContain("Use components � Start here");
    expect(index).not.toContain("Try without installing");
    expect(index).toContain("linkText: Use components");
    expect(index.match(/linkText: Use the data and text tools/g)).toHaveLength(
      2,
    );
    expect(theme).toContain('"home-hero-info-after"');
    expect(theme).toContain("StatusNote");
    expect(statusNote).toContain(
      "Experimental and unofficial. Names and addresses may change.",
    );
  });

  it("removes superseded public documentation pages", async () => {
    for (const relativePath of deletedPaths) {
      await expect(access(path.join(root, relativePath))).rejects.toMatchObject(
        { code: "ENOENT" },
      );
    }
  });

  it("keeps current public routes and contributor-only docs", async () => {
    for (const relativePath of [
      "docs/use-components/start-here.md",
      "docs/data-and-text-tools/start-here.md",
      "docs/reference/components.md",
      "docs/reference/package-imports-and-exports.md",
      "docs/examples/linked-article.md",
      "docs/specs/components.md",
      "docs/design.md",
      "docs/evidence.md",
      "docs/development.md",
      "docs/review.md",
      "docs/README.md",
      "docs/archive/README.md",
      "docs/handoff.md",
    ]) {
      await expect(
        access(path.join(root, relativePath)),
      ).resolves.toBeUndefined();
    }
  });

  it("keeps navigation on current pages", async () => {
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );
    expect(config).toContain(
      '{ text: "Use components", link: "/use-components/start-here.md" }',
    );
    expect(config).toContain('link: "/data-and-text-tools/start-here.md"');
    expect(config).toContain('link: "/examples/composed-multi-pane-reader"');
    expect(config).toContain(
      '{ text: "Reference", link: "/reference/components" }',
    );
    expect(config).not.toContain("learningPagers");
    expect(config).not.toContain("learn/");
    expect(config).not.toContain("guides/");
    expect(config).not.toContain("reference/documentation-map");
  });

  it("preserves highlighted HTML source text by default", () => {
    const source =
      '<sefaria-ref-label sref="Micah 6:8"></sefaria-ref-label>: what does this mean?';
    expect(codeTextContent(highlightHtml(source))).toBe(source);
  });

  it("keeps Learn more lines marked with the shared class", async () => {
    for (const file of [
      path.join(root, "docs", "index.md"),
      path.join(root, "docs", "use-components", "start-here.md"),
    ]) {
      const lines = (await readFile(file, "utf8"))
        .split(/\r?\n/)
        .filter((line) => line.includes("Learn more"));
      expect(lines.length, file).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toMatch(
          /^<span class="learn-more__label">Learn more:<\/span> .+ \{\.learn-more\}$/,
        );
      }
    }
  });
});
