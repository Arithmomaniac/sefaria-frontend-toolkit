import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const lessons = [
  "01-web-components.md",
  "02-supplied-data.md",
  "03-live-data.md",
  "04-reader.md",
  "05-customization.md",
  "06-host-integration.md",
  "react.md",
];

describe("documentation learning journey", () => {
  it.each(lessons)("%s remains complete on GitHub", async (lesson) => {
    const markdown = await readFile(
      path.join(root, "docs", "learn", lesson),
      "utf8",
    );

    for (const heading of [
      "## Objective",
      "## Prerequisites",
      "## Try it",
      "## Expected result",
      "## Who owns what",
      "## Exercise",
      "## Source and run links",
      "## Next step",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toMatch(/```(?:ts|tsx|powershell|html)/);
    expect(markdown).not.toMatch(/\]\(\/examples\//);
  });

  it("keeps the built site and source links on maintained destinations", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );

    expect(index).toContain("<LandingPreview />");
    expect(index).toContain("Build a useful Jewish text experience");
    expect(index).toContain("Try the editor");
    expect(index).toContain("/examples/playground/index.html");
    expect(index).not.toContain("Published documentation");
    expect(config).toContain(
      '"https://github.com/Arithmomaniac/sefaria-frontend-toolkit"',
    );
    expect(config).toContain('const branch = "main"');
    expect(config).toContain(
      "pattern: `${repository}/edit/${branch}/docs/:path`",
    );
    expect(config).toContain("base: siteBasePath");
    expect(config).toContain(
      '"https://arithmomaniac.github.io/sefaria-frontend-toolkit/"',
    );
    for (const label of [
      "Get started",
      "Components",
      "Examples",
      "Guides",
      "Reference",
    ]) {
      expect(config).toContain(`text: "${label}"`);
    }
    expect(config).toContain('search: { provider: "local" }');
  });

  it("catalogs all seven current rendering surfaces without inventing APIs", async () => {
    const catalog = await readFile(
      path.join(root, "docs", "components.md"),
      "utf8",
    );

    for (const [element, subpath] of [
      ["<sefaria-ref-label>", "ref-label"],
      ["<sefaria-text-segment>", "text-segment"],
      ["<sefaria-bilingual-segment>", "bilingual-segment"],
      ["<sefaria-source-card>", "source-card"],
      ["<sefaria-connections-panel>", "connections-panel"],
      ["<sefaria-popup>", "popup"],
      ["<sefaria-reader>", "reader"],
    ]) {
      expect(catalog).toContain(
        element.replace("<", "&lt;").replace(">", "&gt;"),
      );
      expect(catalog).toContain(
        `@arithmomaniac/sefaria-web-components/${subpath}`,
      );
    }
    expect(catalog).toContain("Open supplied-data preview");
    expect(catalog).toContain("supplied-data editor");
    expect(catalog).toContain("Edit the source-card project");
    expect(catalog).toContain("/examples/playground/index.html");
    expect(catalog).toContain("Start with the complete Reader");
  });

  it("makes the delivered supplied-data editor discoverable", async () => {
    const examples = await readFile(
      path.join(root, "docs", "examples.md"),
      "utf8",
    );
    const documentation = await readFile(
      path.join(root, "docs", "README.md"),
      "utf8",
    );
    const map = await readFile(
      path.join(root, "docs", "reference", "documentation-map.md"),
      "utf8",
    );

    for (const markdown of [examples, documentation, map]) {
      expect(markdown).toContain("examples/playground");
    }
    expect(examples).toContain("Supplied-data component editor");
    expect(documentation).toContain("Edit a supplied-data component");
    expect(map).toContain("supplied-data editor");
  });

  it("uses plain language on the main product paths", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const getStarted = await readFile(
      path.join(root, "docs", "get-started.md"),
      "utf8",
    );
    const components = await readFile(
      path.join(root, "docs", "components.md"),
      "utf8",
    );
    const examples = await readFile(
      path.join(root, "docs", "examples.md"),
      "utf8",
    );
    const documentation = await readFile(
      path.join(root, "docs", "README.md"),
      "utf8",
    );

    expect(index).toContain("TypeScript tools that work without UI components");
    expect(index).not.toContain("headless TypeScript building blocks");
    for (const definition of [
      "A host is the application that owns the component.",
      "A view model is data that a component renders.",
      "A factory prepares API data for a component.",
      "Headless means that no browser element is registered.",
    ]) {
      expect(getStarted).toContain(definition);
    }
    expect(components).toContain("The toolkit provides seven UI components.");
    expect(components).not.toContain("host-admitted Reader view model");
    expect(examples).toContain(
      "An opaque preview uses a separate browser origin.",
    );
    expect(documentation).not.toContain("host-mediated tools");
    expect(documentation).not.toContain("field-level transport definitions");
  });

  it("classifies maintained reader-facing Markdown in the documentation map", async () => {
    const map = await readFile(
      path.join(root, "docs", "reference", "documentation-map.md"),
      "utf8",
    );
    const maintainedPaths = [
      "README.md",
      "docs/README.md",
      "docs/index.md",
      "docs/get-started.md",
      "docs/components.md",
      "docs/examples.md",
      "docs/guides/index.md",
      ...lessons.map((lesson) => `docs/learn/${lesson}`),
      "docs/guides/data-flow.md",
      "docs/guides/differences.md",
      "docs/guides/reader-navigation.md",
      "docs/guides/render-text.md",
      "docs/guides/text-markup.md",
      "packages/client/README.md",
      "packages/text-transform/README.md",
      "packages/web-components/README.md",
      "examples/README.md",
      "examples/explorer/README.md",
      "examples/linked-article/README.md",
      "examples/react-vite/README.md",
      "examples/reader/README.md",
      "examples/vanilla-vite/README.md",
    ];

    for (const maintainedPath of maintainedPaths) {
      expect(map).toContain(`\`${maintainedPath}\``);
    }
    expect(map).toContain("Contributor");
    expect(map).toContain("Archive");
  });

  it("documents package builds before direct example development servers", async () => {
    for (const [filename, command] of [
      ["README.md", "pnpm dev:vanilla"],
      [
        "examples/vanilla-vite/README.md",
        "pnpm --filter @sefaria-example/vanilla-vite dev",
      ],
      [
        "examples/react-vite/README.md",
        "pnpm --filter @sefaria-example/react-vite dev",
      ],
      [
        "examples/reader/README.md",
        "pnpm --filter @sefaria-example/reader dev",
      ],
      ["docs/development.md", "pnpm dev:reader"],
    ] as const) {
      const markdown = await readFile(path.join(root, filename), "utf8");
      expect(markdown.indexOf("pnpm build")).toBeGreaterThanOrEqual(0);
      expect(markdown.indexOf("pnpm build")).toBeLessThan(
        markdown.indexOf(command),
      );
    }
  });

  it("keeps supplied-data and React teaching aligned with maintained source", async () => {
    const suppliedLesson = await readFile(
      path.join(root, "docs", "learn", "02-supplied-data.md"),
      "utf8",
    );
    const vanillaSource = await readFile(
      path.join(root, "examples", "vanilla-vite", "src", "main.ts"),
      "utf8",
    );
    expect(suppliedLesson).toContain("createSourceCardViewModel(validated, {");
    expect(vanillaSource).toContain(
      "createSourceCardViewModel(validatedPayload, {",
    );
    expect(vanillaSource).toContain(
      'updateStatus("Rendered supplied Micah 6:8 data with zero requests.")',
    );
    expect(suppliedLesson).toContain("pnpm-workspace.yaml");
    expect(suppliedLesson).not.toContain('"pnpm": {\n    "overrides"');

    const reactLesson = await readFile(
      path.join(root, "docs", "learn", "react.md"),
      "utf8",
    );
    const reactSource = await readFile(
      path.join(root, "examples", "react-vite", "src", "app.tsx"),
      "utf8",
    );
    const declarations = await readFile(
      path.join(root, "examples", "react-vite", "src", "custom-elements.d.ts"),
      "utf8",
    );
    for (const sourceFragment of [
      'useElementProperty(cardRef, "selectable", viewModel.state === "data")',
      'previous.removeEventListener("sefaria-source-select"',
      "controller.current?.abort()",
      "setSelected({",
    ]) {
      expect(reactSource).toContain(sourceFragment);
      expect(reactLesson).toContain(sourceFragment);
    }
    expect(declarations).toContain('"sefaria-source-card"');
    expect(reactLesson).toContain('"sefaria-source-card"');
  });

  it("builds distinct example files instead of fallback responses", async () => {
    const site = path.join(root, "dist", "site");
    for (const relativePath of [
      "index.html",
      "learn/02-supplied-data.html",
      "examples/explorer/authored.html",
      "examples/reader/controlled.html",
      "examples/react/index.html",
      "examples/playground/index.html",
      "examples/mcp-app/index.html",
    ]) {
      await expect(
        access(path.join(site, relativePath)),
      ).resolves.toBeUndefined();
    }

    const authored = await readFile(
      path.join(site, "examples", "explorer", "authored.html"),
      "utf8",
    );
    const source = await readFile(
      path.join(
        root,
        "examples",
        "explorer",
        "src",
        "authored",
        "development-status.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      "github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/",
    );
    expect(authored).not.toContain('href="/src/');
  });

  it("does not retain active presentation assembly", async () => {
    await expect(
      access(path.join(root, "demos", "showcase")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the committed lockfile independent of local registry mirrors", async () => {
    const lockfile = await readFile(path.join(root, "pnpm-lock.yaml"), "utf8");
    expect(lockfile).not.toMatch(/tarball:\s+https?:\/\//);
    expect(lockfile).not.toContain("pkgs.visualstudio.com");
    expect(lockfile).not.toContain("packagefeedproxy.microsoft.io");
  });
});
