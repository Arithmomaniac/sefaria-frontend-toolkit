import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { ts } from "@custom-elements-manifest/analyzer";
import { format, resolveConfig } from "prettier";

import { verifyElementTemplateContract } from "./custom-element-template-contract.mjs";
import { runPackageTool } from "./node-tool.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const webComponentsDirectory = path.join(
  repository,
  "packages",
  "web-components",
);
const check = process.argv.includes("--check");
const generatedFiles = {
  customElements: path.join(webComponentsDirectory, "custom-elements.json"),
  exports: path.join(repository, "packages", "public-exports.json"),
};

const eventCatalog = {
  "sefaria-bilingual-segment": [
    event(
      "sefaria-bilingual-segment-error",
      "Reports a failure while loading or validating data from `sref`.",
    ),
  ],
  "sefaria-connections-panel": [
    event(
      "sefaria-connections-category-change",
      "Asks to show a different connection category.",
    ),
    event(
      "sefaria-connections-preview-request",
      "Requests connection previews. The element loads them unless a listener cancels the event.",
    ),
    event(
      "sefaria-connections-page-change",
      "Asks to show a different page of connections.",
    ),
    event(
      "sefaria-connection-select",
      "Reports that a reader selected one connected reference.",
    ),
    event(
      "sefaria-connections-panel-error",
      "Reports a failure while loading or validating data from `sref`.",
    ),
  ],
  "sefaria-reader": [
    event("sefaria-reader-back", "Requests navigation to the previous entry."),
    event(
      "sefaria-reader-history-activate",
      "Asks to return to one saved history entry.",
    ),
    event(
      "sefaria-reader-pane-change",
      "Asks to show a different pane in the compact layout.",
    ),
    event(
      "sefaria-reader-chat-export",
      "Asks your page to send a reference to chat.",
    ),
    event(
      "sefaria-reader-source-select",
      "Reports that a reader selected one item in the source card.",
    ),
    event(
      "sefaria-reader-connections-category-change",
      "Asks to show a different connection category.",
    ),
    event(
      "sefaria-reader-connections-page-change",
      "Asks to show a different connection page.",
    ),
    event(
      "sefaria-reader-connection-select",
      "Reports that a reader selected one connected reference.",
    ),
    event(
      "sefaria-reader-connections-preview-request",
      "Requests connection previews. The element loads them unless a listener cancels the event.",
    ),
    event(
      "sefaria-reader-error",
      "Reports a loading failure or a rejection of the starting data.",
    ),
  ],
  "sefaria-ref-label": [
    event(
      "sefaria-ref-label-error",
      "Reports a failure while loading or validating data from `sref`.",
    ),
  ],
  "sefaria-source-card": [
    event(
      "sefaria-source-select",
      "Reports that a reader selected one item in the source card.",
    ),
    event(
      "sefaria-source-card-error",
      "Reports a failure while loading or validating data from `sref`.",
    ),
  ],
  "sefaria-text-segment": [
    event(
      "sefaria-text-segment-error",
      "Reports a failure while loading or validating data from `sref`.",
    ),
  ],
};

const cssPropertyCatalog = [
  cssProperty(
    "--sefaria-surface",
    "Primary surface color.",
    "light-dark(#fffdf8, #2b2e2a)",
  ),
  cssProperty(
    "--sefaria-surface-muted",
    "Muted surface color.",
    "light-dark(#f5f1e8, #222521)",
  ),
  cssProperty(
    "--sefaria-fg",
    "Primary foreground color.",
    "light-dark(#25231f, #f1eee7)",
  ),
  cssProperty(
    "--sefaria-fg-muted",
    "Muted foreground color.",
    "light-dark(#6d675d, #bdb7ac)",
  ),
  cssProperty(
    "--sefaria-border",
    "Standard border color.",
    "light-dark(#d7cfc1, #555b53)",
  ),
  cssProperty(
    "--sefaria-border-strong",
    "Strong border color.",
    "light-dark(#aaa094, #73796f)",
  ),
  cssProperty(
    "--sefaria-accent",
    "Accent and focus color.",
    "light-dark(#8e2449, #ff93b4)",
  ),
  cssProperty(
    "--sefaria-accent-soft",
    "Translucent accent surface.",
    "light-dark(rgb(142 36 73 / 10%), rgb(255 147 180 / 14%))",
  ),
  cssProperty(
    "--sefaria-danger",
    "Error foreground color.",
    "light-dark(#9c1c1c, #ffaaa4)",
  ),
  cssProperty(
    "--sefaria-link",
    "Link foreground color.",
    "light-dark(#8e2449, #ff93b4)",
  ),
  cssProperty(
    "--sefaria-shadow",
    "Elevated-surface shadow.",
    "0 1rem 3rem rgb(0 0 0 / 28%)",
  ),
  cssProperty("--sefaria-panel-radius", "Panel corner radius.", "0.75rem"),
  cssProperty("--sefaria-control-radius", "Control corner radius.", "0.3rem"),
  cssProperty("--sefaria-font-scale", "Component font-size multiplier.", "1"),
  cssProperty(
    "--sefaria-font-hebrew",
    "Hebrew body font stack.",
    '"Noto Serif Hebrew", "SBL Hebrew", "Times New Roman", serif',
  ),
  cssProperty(
    "--sefaria-font-english",
    "English body font stack.",
    'Georgia, "Times New Roman", serif',
  ),
  cssProperty(
    "--sefaria-font-label-hebrew",
    "Hebrew label font stack.",
    '"Noto Sans Hebrew", system-ui, sans-serif',
  ),
  cssProperty(
    "--sefaria-font-label-english",
    "English label font stack.",
    "system-ui, sans-serif",
  ),
];

await runAnalyzer();
const customElements = await buildCustomElementsManifest();
const publicExports = await buildPublicExportInventory();

await emit(
  generatedFiles.customElements,
  await formatGenerated(
    generatedFiles.customElements,
    `${JSON.stringify(customElements, null, 2)}\n`,
  ),
);
await emit(
  generatedFiles.exports,
  await formatGenerated(
    generatedFiles.exports,
    `${JSON.stringify(publicExports, null, 2)}\n`,
  ),
);

process.stdout.write(
  `Public metadata: ${Object.keys(eventCatalog).length} elements, ${publicExports.packages.reduce((count, packageEntry) => count + packageEntry.exports.length, 0)} package exports\n`,
);

async function runAnalyzer() {
  runPackageTool(
    "@custom-elements-manifest/analyzer",
    "cem",
    [
      "analyze",
      "--config",
      "packages/web-components/custom-elements-manifest.config.mjs",
    ],
    { cwd: repository },
  );
}

async function buildCustomElementsManifest() {
  const analyzerOutput = JSON.parse(
    await readFile(
      path.join(
        repository,
        ".toolchain",
        "custom-elements",
        "custom-elements.json",
      ),
      "utf8",
    ),
  );
  const sourceEvents = new Set();
  for (const module of analyzerOutput.modules) {
    const source = await readFile(path.join(repository, module.path), "utf8");
    for (const match of source.matchAll(
      /(?:#emit\(|new CustomEvent\()\s*"([^"]+)"/gu,
    )) {
      sourceEvents.add(match[1]);
    }
  }
  const documentedEvents = new Set(
    Object.values(eventCatalog)
      .flat()
      .map((entry) => entry.name),
  );
  assertSameSet("custom-element events", sourceEvents, documentedEvents);

  const tokenSource = await readFile(
    path.join(webComponentsDirectory, "src", "tokens.ts"),
    "utf8",
  );
  const sourceCssProperties = new Set(
    [...tokenSource.matchAll(/var\(\s*(--sefaria-[a-z-]+)/gu)].map(
      (match) => match[1],
    ),
  );
  assertSameSet(
    "custom CSS properties",
    sourceCssProperties,
    new Set(cssPropertyCatalog.map((entry) => entry.name)),
  );

  const modules = [];
  for (const module of analyzerOutput.modules) {
    const declarations = (module.declarations ?? []).filter(
      (declaration) => declaration.tagName !== undefined,
    );
    if (declarations.length === 0) continue;
    const source = await readFile(path.join(repository, module.path), "utf8");
    for (const declaration of declarations) {
      verifyElementTemplateContract({
        declaration,
        sourcePath: module.path,
        source,
      });
      declaration.members = (declaration.members ?? []).filter(
        (member) =>
          member.privacy !== "private" && !member.name?.startsWith("#"),
      );
      declaration.events = eventCatalog[declaration.tagName];
      declaration.slots ??= [];
      declaration.cssParts ??= [];
      declaration.cssProperties = cssPropertyCatalog;
    }
    modules.push(
      normalizeModulePaths({
        ...module,
        declarations,
      }),
    );
  }
  const tags = modules
    .flatMap((module) => module.declarations)
    .map((declaration) => declaration.tagName);
  assertSameSet(
    "registered element tags",
    new Set(tags),
    new Set(Object.keys(eventCatalog)),
  );
  return { schemaVersion: "1.0.0", readme: "", modules };
}

async function buildPublicExportInventory() {
  const packageDirectories = ["client", "text-transform", "web-components"];
  const packages = [];
  for (const directory of packageDirectories) {
    const packageDirectory = path.join(repository, "packages", directory);
    const manifest = JSON.parse(
      await readFile(path.join(packageDirectory, "package.json"), "utf8"),
    );
    const exports =
      typeof manifest.exports === "string"
        ? { ".": { types: manifest.exports, import: manifest.exports } }
        : manifest.exports;
    const packageExports = [];
    for (const [subpath, target] of Object.entries(exports)) {
      const declarationPath = path.resolve(packageDirectory, target.types);
      const program = ts.createProgram([declarationPath], {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
      });
      const sourceFile = program.getSourceFile(declarationPath);
      const moduleSymbol =
        sourceFile && program.getTypeChecker().getSymbolAtLocation(sourceFile);
      if (!sourceFile || !moduleSymbol) {
        throw new Error(
          `Could not inspect declarations for ${manifest.name}${subpath}.`,
        );
      }
      const declarations = program
        .getTypeChecker()
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => symbol.getName())
        .filter((name) => name !== "default")
        .sort();
      if (declarations.length === 0) {
        throw new Error(`${manifest.name}${subpath} exports no declarations.`);
      }
      packageExports.push({
        subpath,
        types: target.types,
        import: target.import,
        declarations,
      });
    }
    packages.push({ name: manifest.name, exports: packageExports });
  }
  return { schemaVersion: 1, packages };
}

function normalizeModulePaths(value) {
  if (Array.isArray(value)) return value.map(normalizeModulePaths);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeModulePaths(entry),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/^\/?packages\/web-components\/src\//u, "dist/")
    .replace(/^\/src\//u, "dist/")
    .replace(/\.ts$/u, ".js");
}

function event(name, description) {
  return { name, description, type: { text: "CustomEvent" } };
}

function cssProperty(name, description, defaultValue) {
  return { name, description, default: defaultValue };
}

function assertSameSet(label, actual, expected) {
  const missing = [...expected].filter((entry) => !actual.has(entry));
  const unexpected = [...actual].filter((entry) => !expected.has(entry));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label} mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}

async function emit(filename, contents) {
  if (check) {
    const current = await readFile(filename, "utf8").catch(() => undefined);
    if (current !== contents) {
      throw new Error(
        `${path.relative(repository, filename)} is stale. Run pnpm metadata:generate.`,
      );
    }
    return;
  }
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, contents);
}

async function formatGenerated(filename, contents) {
  const config = await resolveConfig(filename);
  return format(contents, { ...config, filepath: filename });
}
