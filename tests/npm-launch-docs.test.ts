import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PACKAGE_DEFINITIONS } from "../scripts/package-publication.mjs";

const read = (file: string) =>
  readFile(new URL(`../${file}`, import.meta.url), "utf8");
const version = "0.1.0-alpha.0";
const elements = `https://cdn.jsdelivr.net/npm/@sefaria/web-components@${version}/dist/browser/sefaria-elements.js`;

describe("post-launch documentation", () => {
  it("keeps administration repository-only and live checks on the selected CDN host", async () => {
    const config = await read("docs/.vitepress/config.ts");
    const exclusions = /srcExclude:\s*\[([\s\S]*?)\]/u.exec(config)?.[1];
    expect(exclusions).toContain('"release-administration.md"');
    const liveChecks = await read("scripts/test-site-session-1.mjs");
    expect(liveChecks).toContain(
      '["www.sefaria.org", new URL(scriptUrl).host].includes(host)',
    );
  });

  it("pins every runnable component snippet to the packaged npm module", async () => {
    const files = await readdir(
      new URL("../examples/site-snippets/", import.meta.url),
    );
    let modules = 0;
    for (const file of files.filter((file) => file.endsWith(".html"))) {
      const html = await read(`examples/site-snippets/${file}`);
      if (!html.includes("sefaria-elements.js")) continue;
      expect(html, file).toContain(`src="${elements}"`);
      expect(html, file).not.toContain("/cdn/alpha/");
      modules += 1;
    }
    expect(modules).toBe(20);
  });

  it("documents both exact-version CDN hosts and real package browser paths", async () => {
    const page = await read("docs/help/install-and-status.md");
    const runner = await read("docs/.vitepress/theme/CodeLanguageToggle.vue");
    for (const definition of PACKAGE_DEFINITIONS) {
      const manifest = JSON.parse(
        await read(`${definition.directory}/package.json`),
      );
      expect(manifest.version).toBe(version);
      for (const host of [
        "https://cdn.jsdelivr.net/npm/",
        "https://unpkg.com/",
      ]) {
        expect(page).toContain(
          `${host}${definition.name}@${version}/dist/browser/${definition.browserFile}`,
        );
      }
      if (definition.name !== "@sefaria/web-components") {
        expect(runner).toContain(
          `https://cdn.jsdelivr.net/npm/${definition.name}@${version}/dist/browser/${definition.browserFile}`,
        );
      }
    }
    expect(page).toContain("npm install @sefaria/api-client@0.1.0-alpha.0");
    expect(page).toContain("npm install @sefaria/web-components@alpha");
    expect(page).toContain("/releases/tag/v0.1.0-alpha.0");
    expect(page).not.toMatch(/planned installation|pending qualification/i);
  });

  it("keeps launch evidence conditional and Pages retirement separately authorized", async () => {
    const evidence = await read("docs/evidence.md");
    expect(evidence).toContain("37450586664");
    expect(evidence).toContain(
      "publication, verification and finalization were skipped",
    );
    expect(evidence).toContain(
      "Merge and deploy this documentation only after",
    );
    expect(evidence).toContain("separately authorized");
  });
});
