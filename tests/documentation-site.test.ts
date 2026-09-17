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
  "alpine.md",
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

    expect(index).toContain("Published documentation");
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
  });

  it("keeps framework paths optional without breaking core lesson paging", async () => {
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );
    const stepThree = config.indexOf(
      '{ text: "3. Load and interact", link: "/learn/03-live-data.md" }',
    );
    const stepFour = config.indexOf(
      '{ text: "4. Use the Reader", link: "/learn/04-reader.md" }',
    );
    const frameworks = config.indexOf('text: "Frameworks"');

    expect(stepThree).toBeGreaterThan(-1);
    expect(stepFour).toBeGreaterThan(stepThree);
    expect(frameworks).toBeGreaterThan(stepFour);
    expect(config.slice(stepThree, stepFour)).not.toContain("React path");
    expect(config.slice(stepThree, stepFour)).not.toContain("Alpine path");
    expect(config).toContain('"learn/03-live-data.md": {');
    expect(config).toContain(
      'next: lessonLink("4. Use the Reader", "/learn/04-reader.md")',
    );
    for (const framework of ["react", "alpine"]) {
      expect(config).toContain(`"learn/${framework}.md": {`);
      expect(config).toContain(
        'prev: lessonLink("3. Load and interact", "/learn/03-live-data.md")',
      );
      expect(config).toContain(
        'next: lessonLink("4. Use the Reader", "/learn/04-reader.md")',
      );
    }
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
        "examples/alpine-vite/README.md",
        "pnpm --filter @sefaria-example/alpine-vite dev",
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
    expect(vanillaSource).toContain("controller.setSuppliedData(");
    expect(vanillaSource).toContain(
      "bindSourceCardController(card, controller)",
    );
    expect(vanillaSource).toContain(
      "`Supplied ${canonicalRef} data rendered with zero live loads.`",
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
      "useSyncExternalStore(",
      "bindSourceCardController(card, controller)",
      "onsefaria-source-select={onSourceSelection}",
      "setSelected({",
    ]) {
      expect(reactSource).toContain(sourceFragment);
      expect(reactLesson).toContain(sourceFragment);
    }
    expect(reactSource).toContain("next.dispose()");
    expect(reactLesson).toContain("controller.dispose()");
    expect(declarations).toContain('"sefaria-source-card"');
    expect(reactLesson).toContain('"sefaria-source-card"');

    const alpineLesson = await readFile(
      path.join(root, "docs", "learn", "alpine.md"),
      "utf8",
    );
    const alpineSource = await readFile(
      path.join(
        root,
        "examples",
        "alpine-vite",
        "src",
        "source-card-example.ts",
      ),
      "utf8",
    );
    for (const sourceFragment of [
      "createSourceCardController(client)",
      "bindSourceCardController(element, controller)",
      "controller.dispose()",
    ]) {
      expect(alpineSource).toContain(sourceFragment);
      expect(alpineLesson).toContain(sourceFragment);
    }
  });

  it("builds distinct example files instead of fallback responses", async () => {
    const site = path.join(root, "dist", "site");
    for (const relativePath of [
      "index.html",
      "learn/02-supplied-data.html",
      "examples/explorer/authored.html",
      "examples/reader/controlled.html",
      "examples/react/index.html",
      "examples/alpine/index.html",
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
