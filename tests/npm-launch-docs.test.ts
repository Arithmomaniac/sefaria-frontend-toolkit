import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PACKAGE_DEFINITIONS } from "../scripts/package-publication.mjs";
import release from "../scripts/npm-documentation-release.json";
import { renderLlmsTxt } from "../scripts/reference/llms.js";
import {
  npmDocumentationFiles,
  renderNpmDocumentation,
} from "../scripts/reference/npm-documentation.js";

const read = (file: string) =>
  readFile(new URL(`../${file}`, import.meta.url), "utf8");
const version = release.version;
const elements = `https://cdn.jsdelivr.net/npm/@sefaria/web-components@${version}/dist/browser/sefaria-elements.js`;

describe("post-launch documentation", () => {
  it("updates stamped current-release references from one input without changing other versions", () => {
    const source = `<!-- npm-release-version: ${version} -->
npm install @sefaria/web-components@${version}
https://cdn.jsdelivr.net/npm/@sefaria/web-components@${version}/dist/browser/sefaria-elements.js
https://unpkg.com/@sefaria/web-components@${version}/dist/browser/sefaria-elements.js
https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v${version}
Historical Pages version 0.0.0-alpha.37286368389.1`;
    const rendered = renderNpmDocumentation(source, "0.2.0-alpha.1");
    expect(rendered).not.toContain(version);
    expect(rendered.match(/0\.2\.0-alpha\.1/gu)).toHaveLength(5);
    expect(rendered).toContain(
      "Historical Pages version 0.0.0-alpha.37286368389.1",
    );
    expect(() => renderNpmDocumentation("unstamped", version)).toThrow(
      "Missing npm-release-version stamp",
    );
  });

  it("keeps every consumer owner synchronized and excludes immutable launch history", async () => {
    const files = await npmDocumentationFiles();
    for (const file of files) {
      const source = await read(file);
      expect(renderNpmDocumentation(source, version), file).toBe(source);
    }
    expect(files).not.toContain("docs/evidence.md");
    expect(files).not.toContain("docs/specs/distribution.md");
    expect(files).not.toContain("docs/release-administration.md");
  });

  it("updates raw HTML through its real import without exposing maintenance metadata", async () => {
    const html = await read(
      "examples/site-snippets/source-card-script-tag.html",
    );
    expect(html).toMatch(/^<script/u);
    const updated = renderNpmDocumentation(html, "0.2.0-alpha.1");
    expect(updated).toContain(
      "@sefaria/web-components@0.2.0-alpha.1/dist/browser/sefaria-elements.js",
    );
    expect(updated).not.toContain(version);
    expect(updated).not.toContain("npm-release-version");
    expect(await renderLlmsTxt()).not.toContain("npm-release-version");
  });

  it("keeps hackathon history off the license page and supplies all three hero install routes", async () => {
    expect(await read("docs/help/install-and-status.md")).not.toContain(
      "Microsoft Global Hackathon",
    );
    expect(await read("README.md")).toContain("Microsoft Global Hackathon");
    const hero = await read("docs/.vitepress/theme/HeroExample.vue");
    for (const definition of PACKAGE_DEFINITIONS) {
      expect(hero).toContain(`npm install ${definition.name}@`);
    }
    expect(hero).toContain("npm-documentation-release.json");
    expect(hero).toContain('to="/use-components/start-here.md"');
    expect(hero).toContain('to="/data-and-text-tools/start-here.md"');
  });

  it("excludes provenance from the copyable consumer prompt without deleting its header", async () => {
    const prompt = await read("examples/site-snippets/ai-assistant-prompt.md");
    const page = await read(
      "docs/use-components/start-with-an-ai-assistant.md",
    );
    const consumer =
      /<!-- #region consumer-prompt -->\n([\s\S]*?)\n<!-- #endregion consumer-prompt -->/u.exec(
        prompt,
      )?.[1];
    expect(prompt).toMatch(
      /^> Created\/edited by GitHub Copilot; pending human review\./u,
    );
    expect(consumer?.trim()).toMatch(/^Read https:\/\/sefaria\.github\.io/u);
    expect(consumer).not.toContain("pending human review");
    expect(consumer).toContain("My page:");
    expect(page).toContain("ai-assistant-prompt.md#consumer-prompt{md}");
  });

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
      expect(html, file).not.toContain("npm-release-version");
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
      expect(manifest.name).toBe(definition.name);
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
          `https://cdn.jsdelivr.net/npm/${definition.name}@\${release.version}/dist/browser/${definition.browserFile}`,
        );
      }
    }
    expect(page).toContain(`npm install @sefaria/api-client@${version}`);
    expect(page).toContain("npm install @sefaria/web-components@alpha");
    expect(page).toContain(`/releases/tag/v${version}`);
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
