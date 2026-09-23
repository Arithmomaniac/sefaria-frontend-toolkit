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
const playgroundProjects = [
  "ref-label",
  "text-segment",
  "bilingual-segment",
  "source-card",
  "popup",
  "connections-panel",
  "reader",
] as const;

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
    const theme = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "index.ts"),
      "utf8",
    );
    const disclosure = await readFile(
      path.join(
        root,
        "docs",
        ".vitepress",
        "theme",
        "DocumentationDisclosure.vue",
      ),
      "utf8",
    );

    expect(index).toContain("<LandingPreview />");
    expect(index).toContain("Bring Sefaria texts into your product");
    expect(index).toContain("Try the editor");
    expect(index).toContain("Experimental and unofficial");
    expect(index).toContain("installation-status");
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
    expect(disclosure).toContain(
      '"https://arithmomaniac.github.io/sefaria-frontend-toolkit/"',
    );
    expect(theme).toContain('"layout-bottom"');
    expect(theme).toContain("DocumentationDisclosure");
    expect(disclosure.replace(/\s+/g, " ")).toContain(
      "Documentation text was written and edited by GitHub Copilot; pending human review.",
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
    expect(config).toContain('text: "Task guides"');
    expect(config).toContain('text: "Advanced explanations"');
    expect(config).toContain('text: "API reference"');
    expect(config).not.toContain('text: "Contributing and internals"');
    for (const repositoryOnlyPath of [
      '"README.md"',
      '"archive/**"',
      '"design.md"',
      '"development.md"',
      '"evidence.md"',
      '"handoff.md"',
      '"guides/reader-navigation.md"',
      '"reference/documentation-map.md"',
      '"review.md"',
      '"specs/**"',
    ]) {
      expect(config).toContain(repositoryOnlyPath);
    }
  });

  it("provides a component-directory signpost without duplicating the catalog", async () => {
    const signpost = await readFile(
      path.join(root, "docs", "components", "index.md"),
      "utf8",
    );

    expect(signpost).toContain("[component catalog](../components.md)");
    expect(signpost).toContain("generated [custom-element");
    expect(signpost).not.toContain("<PlaygroundEmbed");
  });

  it("keeps troubleshooting symptom-led and linked from adopter paths", async () => {
    const troubleshooting = await readFile(
      path.join(root, "docs", "guides", "troubleshooting.md"),
      "utf8",
    );
    const guides = await readFile(
      path.join(root, "docs", "guides", "index.md"),
      "utf8",
    );
    const getStarted = await readFile(
      path.join(root, "docs", "get-started.md"),
      "utf8",
    );

    for (const symptom of [
      "The package cannot be installed",
      "The custom element is unknown",
      "A property change has no effect",
      "The supplied Reader says a target is unavailable",
      "The editor does not run after an edit",
      "The browser reports a CSP or blocked-resource error",
      "A documented HTTP result is confused with a network or schema failure",
      "A failed or superseded request erased the previous result",
      "The component remains active after the host removes it",
    ]) {
      expect(troubleshooting).toContain(`## ${symptom}`);
    }
    expect(troubleshooting).toContain("Do not disable CSP");
    expect(troubleshooting).toContain("structured issue paths");
    expect(guides).toContain("[Troubleshooting](troubleshooting.md)");
    expect(getStarted).toContain("[troubleshooting guide]");
  });

  it("keeps the numbered lessons contiguous and React optional", async () => {
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );
    const lessonTwo = await readFile(
      path.join(root, "docs", "learn", "02-supplied-data.md"),
      "utf8",
    );

    expect(config).toContain('text: "Frameworks"');
    expect(config).toContain('"learn/03-live-data.md":');
    expect(config).toContain('next: lessonLink("4. Use the Reader"');
    expect(config).toContain('"learn/04-reader.md":');
    expect(config).toContain('prev: lessonLink("3. Load and interact"');
    expect(config).toContain('"learn/react.md":');
    expect(config).toContain('prev: lessonLink("3. Load and interact"');
    expect(config).toContain('next: lessonLink("4. Use the Reader"');
    expect(lessonTwo).not.toContain("parallel [React path]");
  });

  it("catalogs all seven current rendering surfaces without inventing APIs", async () => {
    const catalog = await readFile(
      path.join(root, "docs", "components.md"),
      "utf8",
    );
    const usageDirectory = await readFile(
      path.join(root, "docs", "components", "index.md"),
      "utf8",
    );
    const usagePages = Object.fromEntries(
      await Promise.all(
        playgroundProjects.map(async (project) => [
          project,
          await readFile(
            path.join(root, "docs", "components", `${project}.md`),
            "utf8",
          ),
        ]),
      ),
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
      expect(catalog).toContain(element);
      expect(catalog).toContain(
        `@arithmomaniac/sefaria-web-components/${subpath}`,
      );
      expect(usageDirectory).toContain(`${subpath}.md`);
      expect(usagePages[subpath]).toContain(
        `/reference/custom-elements.md#sefaria-${subpath}`,
      );
      expect(usagePages[subpath]).toContain(
        `<PlaygroundEmbed project="${subpath}"`,
      );
    }
    expect(catalog).toContain(
      '<PlaygroundEmbed project="source-card" title="Editable component catalog" :heading-level="2"',
    );
    expect(catalog).toContain("Open supplied-data preview");
    expect(catalog).toContain("maintained supplied-data projects");
    expect(catalog).toContain("/examples/playground/index.html?project=reader");
    expect(catalog).toContain("Start with the complete Reader");
  });

  it("places maintained editable projects in the learning path", async () => {
    const expectedEmbeds = new Map([
      ["01-web-components.md", "ref-label"],
      ["02-supplied-data.md", "source-card"],
      ["03-live-data.md", "source-card"],
      ["04-reader.md", "reader"],
      ["05-customization.md", "source-card"],
    ]);

    for (const [lesson, project] of expectedEmbeds) {
      const markdown = await readFile(
        path.join(root, "docs", "learn", lesson),
        "utf8",
      );
      expect(markdown).toContain(`<PlaygroundEmbed project="${project}"`);
      expect(markdown).toContain(
        `/examples/playground/index.html?project=${project}`,
      );
    }
  });

  it("uses one base-aware trusted editor wrapper without copying project data", async () => {
    const theme = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "index.ts"),
      "utf8",
    );
    const embed = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "PlaygroundEmbed.vue"),
      "utf8",
    );

    expect(theme).toContain(
      'app.component("PlaygroundEmbed", PlaygroundEmbed)',
    );
    expect(embed).toContain("withBase(");
    expect(embed).toContain(
      "`/examples/playground/index.html?project=${props.project}`",
    );
    expect(embed).toContain('class="playground-embed__frame"');
    expect(embed).toContain("Component editor:");
    expect(embed).toContain("props.headingLevel ?? 3");
    expect(embed).toContain("maintained project on load");
    expect(embed).toContain("Open full editor");
    expect(embed).not.toContain("project-catalog");
    expect(embed).not.toContain("sandbox=");
  });

  it("keeps embedded editor resource links outside the documentation frame", async () => {
    const editor = await readFile(
      path.join(root, "examples", "playground", "index.html"),
      "utf8",
    );

    expect(editor.match(/target="_blank"/g)).toHaveLength(3);
    expect(editor.match(/rel="noreferrer"/g)).toHaveLength(3);
  });

  it("describes all seven implemented components as current", async () => {
    const dataFlow = await readFile(
      path.join(root, "docs", "guides", "data-flow.md"),
      "utf8",
    );

    expect(dataFlow).toContain(
      "all seven public elements support standalone `sref`",
    );
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

    expect(index).toContain("Bring Sefaria texts into your product");
    expect(index).toContain("Fetch and validate data");
    expect(index).toContain("Prepare text you already have");
    expect(index).toContain("Add a focused reading surface");
    expect(index).toContain("Build a complete Reader");
    expect(index).toContain("You can stop at any layer");
    expect(index).not.toContain("headless TypeScript building blocks");
    for (const definition of [
      "A host is the application that owns the component.",
      "The element path accepts corrected component-specific raw data",
      "Advanced spatial hosts use the supported `reader-session` semantic/raw facade",
    ]) {
      expect(getStarted).toContain(definition);
    }
    expect(components).toContain(
      "The toolkit provides seven declarative UI components.",
    );
    expect(components).not.toContain("host-admitted Reader view model");
    expect(examples).toContain("The component editor runs edited code");
    expect(examples).toContain("isolated preview");
    expect(documentation).not.toContain("host-mediated tools");
    expect(documentation).not.toContain("field-level transport definitions");
  });

  it("presents the client and text transforms as independently useful products", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const getStarted = await readFile(
      path.join(root, "docs", "get-started.md"),
      "utf8",
    );
    const documentation = await readFile(
      path.join(root, "docs", "README.md"),
      "utf8",
    );

    for (const markdown of [index, getStarted, documentation]) {
      expect(markdown).toContain("@arithmomaniac/sefaria-client");
      expect(markdown).toContain("@arithmomaniac/sefaria-text-transform");
    }

    expect(getStarted).toContain("Use the client without components");
    expect(getStarted).toContain("getV3Texts");
    expect(getStarted).toContain("loadValidatedText");
    expect(getStarted).toContain("Use text transforms without the client");
    expect(getStarted).toContain("createTextPreview");
    expect(getStarted).toContain(
      "Use raw component data with your own renderer",
    );
    expect(getStarted).toContain(
      "use the corrected client contracts and text-transform package directly",
    );
    expect(documentation).toContain("Package references");
  });

  it("shows the integration layers visually and preserves the project origin in the repository", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const getStarted = await readFile(
      path.join(root, "docs", "get-started.md"),
      "utf8",
    );
    const documentation = await readFile(
      path.join(root, "docs", "README.md"),
      "utf8",
    );
    const repositoryReadme = await readFile(
      path.join(root, "README.md"),
      "utf8",
    );
    const diagramPath = path.join(
      root,
      "docs",
      "images",
      "integration-depths.svg",
    );
    const mobileDiagramPath = path.join(
      root,
      "docs",
      "images",
      "integration-depths-mobile.svg",
    );
    await access(diagramPath);
    await access(mobileDiagramPath);
    const diagrams = await Promise.all([
      readFile(diagramPath, "utf8"),
      readFile(mobileDiagramPath, "utf8"),
    ]);

    expect(getStarted).toContain("<picture>");
    expect(getStarted).toContain(
      'srcset="./images/integration-depths-mobile.svg"',
    );
    expect(getStarted).toContain('src="./images/integration-depths.svg"');
    expect(getStarted).toContain(
      'alt="Choose the toolkit layer that matches your product"',
    );
    for (const diagram of diagrams) {
      for (const label of [
        "Validated transport",
        "Pure text preparation",
        "Custom rendering",
        "Focused components",
        "Controlled Reader",
      ]) {
        expect(diagram).toContain(label);
      }
    }
    expect(diagrams[0]).toContain("Sefaria API or data you already have");
    expect(diagrams[0]).toContain("Stop at any layer");
    expect(diagrams[1]).toContain("Sefaria API or data you have");
    expect(diagrams[1]).toContain("Start with any layer below");

    expect(repositoryReadme).toContain("Microsoft Global Hackathon 2026");
    expect(repositoryReadme).toContain("Thank you to Microsoft");
    expect(repositoryReadme).toContain("independently maintained");
    expect(index).not.toContain("Microsoft Global Hackathon 2026");
    expect(documentation).not.toContain("Microsoft Global Hackathon 2026");
  });

  it("separates evaluating and consuming the toolkit from developing its source", async () => {
    const index = await readFile(path.join(root, "docs", "index.md"), "utf8");
    const getStarted = await readFile(
      path.join(root, "docs", "get-started.md"),
      "utf8",
    );
    const documentation = await readFile(
      path.join(root, "docs", "README.md"),
      "utf8",
    );

    expect(index).toContain("Evaluate without cloning");
    expect(index).toContain("Develop the toolkit itself");
    expect(getStarted).toContain("Public GitHub Packages");
    expect(getStarted).toContain("read:packages");
    expect(getStarted).toContain("not published on npmjs.com");
    expect(getStarted).toContain("Package names are subject to change");
    expect(getStarted).toContain(
      "Public GitHub Packages prereleases are available",
    );
    expect(getStarted).not.toContain("planned for activation");
    expect(getStarted).toContain("Clone the source only to change the toolkit");
    expect(documentation).toContain("Repository-only documentation");
    expect(documentation).toContain(
      "excluded from the public VitePress routes",
    );
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
      "examples/alpine-vite/README.md",
      "examples/reader/README.md",
      "examples/vanilla-vite/README.md",
    ];

    for (const maintainedPath of maintainedPaths) {
      expect(map).toContain(`\`${maintainedPath}\``);
    }
    expect(map).toContain("Contributor");
    expect(map).toContain("Archive");
  });

  it("keeps framework paths optional without breaking core lesson paging", async () => {
    const config = await readFile(
      path.join(root, "docs", ".vitepress", "config.ts"),
      "utf8",
    );
    const sidebar = config.indexOf("sidebar: {");
    const stepThree = config.indexOf('link: "/learn/03-live-data.md"', sidebar);
    const stepFour = config.indexOf('link: "/learn/04-reader.md"', stepThree);
    const frameworks = config.indexOf('text: "Frameworks"', stepFour);

    expect(sidebar).toBeGreaterThan(-1);
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
    const development = await readFile(
      path.join(root, "docs", "development.md"),
      "utf8",
    );
    expect(suppliedLesson).toContain(
      "card.data = zCoreV3TextsResponse.parse(payload)",
    );
    expect(suppliedLesson).toContain(
      "No public view model, controller, or binding",
    );
    expect(vanillaSource).toContain("card.data = validatedPayload");
    expect(vanillaSource).toContain('card.setAttribute("sref", sref)');
    expect(vanillaSource).toContain('status.dataset.requestCount = "0"');
    expect(suppliedLesson).not.toContain("pnpm-workspace.yaml");
    expect(development).toContain("pnpm-workspace.yaml");
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
      "data={data}",
      "sref={sref}",
      "acquisition={acquisition}",
      "onsefaria-source-select={onSourceSelection}",
    ]) {
      expect(reactSource).toContain(sourceFragment);
      expect(reactLesson).toContain(sourceFragment);
    }
    expect(reactSource).toContain("setSelected({");
    expect(declarations).toContain('"sefaria-source-card"');
    expect(reactLesson).toContain("<sefaria-source-card");

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
    expect(alpineSource).toContain("element.acquisition = acquisition");
    expect(alpineSource).toContain("card.data = undefined");
    expect(alpineSource).toContain("this.sref = normalized");
    expect(alpineLesson).toContain(
      'element.acquisition = { kind: "client", client }',
    );
    expect(alpineLesson).toContain("element.data = undefined");
    expect(alpineLesson).toContain("this.sref = next");
  });

  it("teaches current declarative, Reader, and customization behavior", async () => {
    const lessonsByName = Object.fromEntries(
      await Promise.all(
        lessons.map(async (lesson) => [
          lesson,
          await readFile(path.join(root, "docs", "learn", lesson), "utf8"),
        ]),
      ),
    );
    const dataFlow = await readFile(
      path.join(root, "docs", "guides", "data-flow.md"),
      "utf8",
    );
    const readerNavigation = await readFile(
      path.join(root, "docs", "guides", "reader-navigation.md"),
      "utf8",
    );

    expect(lessonsByName["01-web-components.md"]).toContain(
      "Properties carry rich objects and arrays",
    );
    expect(lessonsByName["02-supplied-data.md"]).toContain(
      "Defined `data` is authoritative",
    );
    expect(lessonsByName["02-supplied-data.md"]).toContain(
      "accessible validation failure",
    );
    expect(lessonsByName["03-live-data.md"]).toContain(
      "A newer input prevents an older completion from publishing",
    );
    expect(lessonsByName["03-live-data.md"]).toContain("vanilla host");
    expect(lessonsByName["03-live-data.md"]).toContain(
      'to="/examples/vanilla/index.html"',
    );
    expect(lessonsByName["04-reader.md"]).toContain("rootLoading");
    expect(lessonsByName["04-reader.md"]).toContain("semantic history");
    expect(lessonsByName["04-reader.md"]).toContain(
      "Raw seeds initialize or transactionally replace Reader state",
    );
    expect(lessonsByName["04-reader.md"]).toContain("reader-session");
    expect(lessonsByName["06-host-integration.md"]).toContain(
      "An MCP App is an interactive web interface",
    );
    expect(lessonsByName["06-host-integration.md"]).toContain(
      "**Browser demonstration:**",
    );
    expect(lessonsByName["05-customization.md"]).toContain(
      'slot="toolbar-actions"',
    );
    for (const part of [
      "toolbar",
      "history",
      "source-pane",
      "connections-pane",
    ]) {
      expect(lessonsByName["05-customization.md"]).toContain(part);
    }
    expect(dataFlow).toContain(
      "all seven public elements support standalone `sref`",
    );
    expect(readerNavigation).toContain(
      "supported advanced semantic/raw facade",
    );
    expect(readerNavigation).toContain("## Current limitations");
    expect(readerNavigation).not.toContain("**Accepted direction:**");
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
