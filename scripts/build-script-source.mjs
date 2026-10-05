import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

import { build } from "vite";
import { create } from "tar";
import { z } from "zod";
import { isMainModule } from "./check.mjs";
import { isPathWithin } from "./tarball-consumer-validation.mjs";

const root = path.resolve(import.meta.dirname, "..");
export const SCRIPT_ENTRY = "sefaria-elements.js";
export const SCRIPT_ENTRIES = {
  [SCRIPT_ENTRY]: path.join("web-components", "dist", "index.js"),
  "sefaria-api-client.js": path.join("client", "dist", "index.js"),
  "sefaria-text-transform.js": path.join("text-transform", "dist", "index.js"),
};
const LEGACY_SCRIPT_FILES = [
  SCRIPT_ENTRY,
  "LICENSE.txt",
  "THIRD-PARTY-NOTICES.txt",
  "source.tar.gz",
];
const SCHEMA_TWO_ENTRIES = [
  SCRIPT_ENTRY,
  "sefaria-client.js",
  "sefaria-text-transform.js",
];
const SCHEMA_TWO_FILES = [
  ...SCHEMA_TWO_ENTRIES,
  ...LEGACY_SCRIPT_FILES.slice(1),
];
export const SCRIPT_FILES = [
  ...Object.keys(SCRIPT_ENTRIES),
  "LICENSE.txt",
  "THIRD-PARTY-NOTICES.txt",
  "source.tar.gz",
];
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const measure = (bytes) => ({
  raw: Buffer.byteLength(bytes),
  gzip: gzipSync(bytes, { level: 9 }).length,
});
const browserBuildFile = path.join(
  root,
  ".artifacts",
  "package-browser-build.json",
);
const licenseFilename = /^(?:licen[sc]e|copying|notice)(?:[.-].*)?$/iu;
const dependencyIdentity = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  license: z.string().min(1),
});
const repositoryRelativePath = z
  .string()
  .min(1)
  .refine(
    (relative) =>
      !path.isAbsolute(relative) &&
      isPathWithin(root, path.resolve(root, relative)),
    "Expected a repository-relative path.",
  );
const browserBuildSchema = z
  .object({
    schemaVersion: z.literal(1),
    inputs: z
      .record(repositoryRelativePath, z.string().regex(/^[a-f0-9]{64}$/u))
      .refine(
        (inputs) => Object.keys(inputs).length <= 10_000,
        "Too many build inputs.",
      ),
    dependencies: z
      .array(
        dependencyIdentity
          .extend({
            directory: repositoryRelativePath,
          })
          .strict(),
      )
      .max(1_000),
  })
  .strict();

function packagedBrowserDirectory(relative) {
  return path.join(root, "packages", path.dirname(relative), "browser");
}

async function readBrowserBuild(filename) {
  const evidence = browserBuildSchema.parse(
    JSON.parse(await readFile(filename, "utf8")),
  );
  const required = [
    "scripts/build-script-source.mjs",
    "LICENSE",
    "package.json",
    "pnpm-lock.yaml",
    ...Object.values(SCRIPT_ENTRIES).map(
      (relative) => `packages/${relative.split(path.sep).join("/")}`,
    ),
    ...Object.entries(SCRIPT_ENTRIES).flatMap(([entry, relative]) =>
      [entry, "LICENSE.txt", "THIRD-PARTY-NOTICES.txt"].map((name) =>
        path
          .relative(root, path.join(packagedBrowserDirectory(relative), name))
          .split(path.sep)
          .join("/"),
      ),
    ),
  ];
  if (required.some((relative) => evidence.inputs[relative] === undefined)) {
    throw new Error(
      "Incomplete packaged browser build evidence. Run pnpm build.",
    );
  }
  for (const [relative, expected] of Object.entries(evidence.inputs)) {
    if (sha256(await readFile(path.join(root, relative))) !== expected)
      throw new Error(
        `Stale packaged browser build: ${relative}. Run pnpm build.`,
      );
  }
  const dependencies = await Promise.all(
    evidence.dependencies.map(async ({ directory, ...identity }) => {
      const manifestPath = `${directory}/package.json`;
      if (evidence.inputs[manifestPath] === undefined)
        throw new Error(`Missing dependency fingerprint: ${manifestPath}.`);
      const manifest = dependencyIdentity.parse(
        JSON.parse(await readFile(path.join(root, manifestPath), "utf8")),
      );
      if (JSON.stringify(manifest) !== JSON.stringify(identity))
        throw new Error(
          `Stale dependency identity: ${manifestPath}. Run pnpm build.`,
        );
      return { directory: path.join(root, directory), manifest };
    }),
  );
  const bundles = Object.fromEntries(
    await Promise.all(
      Object.entries(SCRIPT_ENTRIES).map(async ([entry, relative]) => [
        entry,
        await readFile(path.join(packagedBrowserDirectory(relative), entry)),
      ]),
    ),
  );
  return {
    bundles,
    dependencies,
    notices: await dependencyNotices(dependencies),
  };
}

export async function bundleElements({
  split = false,
  entry = SCRIPT_ENTRY,
} = {}) {
  const directory = path.join(root, "packages", "web-components", "dist");
  const output = await build({
    configFile: false,
    logLevel: "warn",
    build: {
      write: false,
      minify: true,
      target: "es2022",
      rollupOptions: {
        input: split
          ? Object.fromEntries(
              [
                "bilingual-segment",
                "connections-panel",
                "reader",
                "source-card",
                "text-segment",
              ].map((name) => [
                name,
                path.join(directory, `${name}-element.js`),
              ]),
            )
          : { entry: path.join(root, "packages", SCRIPT_ENTRIES[entry]) },
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          entryFileNames: split ? "[name].js" : entry,
          chunkFileNames: "shared-[hash].js",
        },
      },
    },
  });
  if (Array.isArray(output)) throw new Error("Expected one ES output.");
  const chunks = output.output;
  if (chunks.some((chunk) => chunk.type !== "chunk"))
    throw new Error("Unexpected script asset.");
  const names = new Set(chunks.map((chunk) => chunk.fileName));
  for (const chunk of chunks) {
    if (
      [...chunk.imports, ...chunk.dynamicImports].some(
        (name) => !names.has(name),
      )
    ) {
      throw new Error(`External runtime import in ${chunk.fileName}.`);
    }
  }
  if (
    !split &&
    (chunks.length !== 1 ||
      chunks[0].imports.length ||
      chunks[0].dynamicImports.length)
  ) {
    throw new Error("Script entry must be self-contained.");
  }
  return chunks.map((chunk) => ({
    type: chunk.type,
    fileName: chunk.fileName,
    imports: chunk.imports,
    dynamicImports: chunk.dynamicImports,
    moduleIds: chunk.moduleIds,
    code: `/*! MIT. Copyright (c) 2026 Sefaria. See LICENSE.txt and THIRD-PARTY-NOTICES.txt beside this file. */\n${chunk.code}`,
  }));
}

async function dependencyRoots(chunks) {
  const found = new Map();
  for (const id of new Set(chunks.flatMap((chunk) => chunk.moduleIds))) {
    if (!id.includes("node_modules")) continue;
    let directory = path.dirname(await realpath(id.split("?")[0]));
    for (;;) {
      const entries = await readdir(directory);
      if (entries.includes("package.json")) {
        const manifest = JSON.parse(
          await readFile(path.join(directory, "package.json"), "utf8"),
        );
        if (manifest.name && manifest.version) {
          found.set(`${manifest.name}@${manifest.version}`, {
            directory,
            manifest,
          });
          break;
        }
      }
      const parent = path.dirname(directory);
      if (parent === directory)
        throw new Error(`No package identity for ${id}.`);
      directory = parent;
    }
  }
  return [...found.values()].sort((a, b) =>
    a.manifest.name.localeCompare(b.manifest.name),
  );
}

async function dependencyNotices(dependencies) {
  return Promise.all(
    dependencies.map(async ({ directory, manifest }) => {
      const licenses = (await readdir(directory)).filter((name) =>
        licenseFilename.test(name),
      );
      if (!licenses.length || !manifest.license)
        throw new Error(`Missing license evidence: ${manifest.name}.`);
      return `${manifest.name}@${manifest.version} (${manifest.license})\n${(await Promise.all(licenses.map((name) => readFile(path.join(directory, name), "utf8")))).join("\n")}`;
    }),
  );
}

export async function buildScriptSource({
  destination = path.join(root, "dist", "script-source"),
  version = "local",
  sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    windowsHide: true,
    cwd: root,
    encoding: "utf8",
  }).trim(),
  compare = false,
  browserBuildManifest = browserBuildFile,
} = {}) {
  if (
    version !== "local" &&
    !/^0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*$/u.test(version)
  )
    throw new Error("Invalid script version.");
  if (!/^[a-f0-9]{40}$/u.test(sourceSha))
    throw new Error("Invalid source SHA.");
  const { bundles, dependencies, notices } =
    await readBrowserBuild(browserBuildManifest);
  await mkdir(destination, { recursive: true });
  const source = await mkdtemp(path.join(tmpdir(), "sefaria-script-source-"));
  try {
    const tracked = execFileSync(
      "git",
      [
        "ls-files",
        "-z",
        "packages",
        "scripts",
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "tsconfig.base.json",
        "LICENSE",
      ],
      { cwd: root, encoding: "utf8", windowsHide: true },
    )
      .split("\0")
      .filter(Boolean);
    for (const file of tracked) {
      await mkdir(path.dirname(path.join(source, "toolkit", file)), {
        recursive: true,
      });
      await cp(path.join(root, file), path.join(source, "toolkit", file));
    }
    // A working-tree build must carry the new build recipe even before it is tracked.
    await cp(
      import.meta.filename,
      path.join(source, "toolkit", "scripts", "build-script-source.mjs"),
    );
    for (const { directory, manifest } of dependencies) {
      await cp(
        directory,
        path.join(
          source,
          "dependencies",
          `${manifest.name.replaceAll("/", "__")}@${manifest.version}`,
        ),
        {
          recursive: true,
          filter: (file) =>
            file === directory || path.basename(file) !== "node_modules",
        },
      );
    }
    await writeFile(
      path.join(source, "SOURCE.txt"),
      `Toolkit source: ${sourceSha}\nThe toolkit tree contains source, generated contracts, lockfile and build recipes.\nDependency directories contain the exact published package sources used by the bundler, including their source maps where provided.\nBuild with the pinned pnpm using pnpm install --frozen-lockfile, pnpm build, then pnpm build:script-source.\n`,
    );
    await create(
      {
        cwd: source,
        file: path.join(destination, "source.tar.gz"),
        gzip: true,
        portable: true,
        mtime: new Date(0),
      },
      ["SOURCE.txt", "toolkit", "dependencies"],
    );
    for (const [entry, bytes] of Object.entries(bundles))
      await writeFile(path.join(destination, entry), bytes);
    await cp(path.join(root, "LICENSE"), path.join(destination, "LICENSE.txt"));
    await writeFile(
      path.join(destination, "THIRD-PARTY-NOTICES.txt"),
      notices.join("\n\n--------------------\n\n"),
    );
    const files = Object.fromEntries(
      await Promise.all(
        SCRIPT_FILES.map(async (name) => [
          name,
          sha256(await readFile(path.join(destination, name))),
        ]),
      ),
    );
    const manifest = {
      schemaVersion: 3,
      version,
      sourceSha,
      entry: SCRIPT_ENTRY,
      size: measure(bundles[SCRIPT_ENTRY]),
      entries: Object.fromEntries(
        Object.entries(bundles).map(([entry, bytes]) => [
          entry,
          { size: measure(bytes) },
        ]),
      ),
      gzipLevel: 9,
      dependencies: dependencies.map(({ manifest: dependency }) => ({
        name: dependency.name,
        version: dependency.version,
        license: dependency.license,
      })),
      files,
    };
    await writeFile(
      path.join(destination, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    if (compare) {
      const split = await bundleElements({ split: true });
      const closure = new Set();
      function visit(name) {
        if (closure.has(name)) return;
        closure.add(name);
        const chunk = split.find((entry) => entry.fileName === name);
        if (!chunk) throw new Error(`Missing comparison chunk ${name}.`);
        for (const dependency of [...chunk.imports, ...chunk.dynamicImports])
          visit(dependency);
      }
      visit("source-card.js");
      const sum = (selected) =>
        selected.reduce(
          (total, chunk) => {
            const size = measure(chunk.code);
            return { raw: total.raw + size.raw, gzip: total.gzip + size.gzip };
          },
          { raw: 0, gzip: 0 },
        );
      await writeFile(
        path.join(destination, "comparison.json"),
        `${JSON.stringify({ allElements: manifest.size, splitTotal: sum(split), sourceCardClosure: sum(split.filter((chunk) => closure.has(chunk.fileName))), sourceCardFiles: [...closure] }, null, 2)}\n`,
      );
    }
    return manifest;
  } finally {
    await rm(source, { recursive: true, force: true });
  }
}

const sizeSchema = z.strictObject({
  raw: z.number().int().positive(),
  gzip: z.number().int().positive(),
});
const hashes = (names) =>
  z.strictObject(
    Object.fromEntries(
      names.map((name) => [name, z.string().regex(/^[a-f0-9]{64}$/u)]),
    ),
  );
const manifestBase = {
  version: z.string().regex(/^(?:local|0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*)$/u),
  sourceSha: z.string().regex(/^[a-f0-9]{40}$/u),
  entry: z.literal(SCRIPT_ENTRY),
  size: sizeSchema,
  gzipLevel: z.literal(9),
  dependencies: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        version: z.string().min(1),
        license: z.string().min(1),
      }),
    )
    .min(1),
};
const manifestSchema = z.discriminatedUnion("schemaVersion", [
  z.strictObject({
    schemaVersion: z.literal(1),
    ...manifestBase,
    files: hashes(LEGACY_SCRIPT_FILES),
  }),
  z.strictObject({
    schemaVersion: z.literal(2),
    ...manifestBase,
    entries: z.strictObject(
      Object.fromEntries(
        SCHEMA_TWO_ENTRIES.map((name) => [
          name,
          z.strictObject({ size: sizeSchema }),
        ]),
      ),
    ),
    files: hashes(SCHEMA_TWO_FILES),
  }),
  z.strictObject({
    schemaVersion: z.literal(3),
    ...manifestBase,
    entries: z.strictObject(
      Object.fromEntries(
        Object.keys(SCRIPT_ENTRIES).map((name) => [
          name,
          z.strictObject({ size: sizeSchema }),
        ]),
      ),
    ),
    files: hashes(SCRIPT_FILES),
  }),
]);

/** Files carried by a manifest; retained schema 1 releases are elements-only. */
export const manifestFiles = (manifest) => {
  switch (manifest.schemaVersion) {
    case 1:
      return LEGACY_SCRIPT_FILES;
    case 2:
      return SCHEMA_TWO_FILES;
    case 3:
      return SCRIPT_FILES;
    default:
      throw new Error(
        `Unsupported script manifest schema: ${manifest.schemaVersion}.`,
      );
  }
};

export async function buildPackageBrowserModules() {
  const chunks = [];
  const inputFiles = new Set([
    import.meta.filename,
    path.join(root, "LICENSE"),
    path.join(root, "package.json"),
    path.join(root, "pnpm-lock.yaml"),
  ]);
  for (const [entry, relative] of Object.entries(SCRIPT_ENTRIES)) {
    const [chunk] = await bundleElements({ entry });
    chunks.push(chunk);
    for (const id of chunk.moduleIds) {
      const filename = id.split("?")[0];
      if (path.isAbsolute(filename)) inputFiles.add(filename);
    }
    const directory = packagedBrowserDirectory(relative);
    const dependencies = await dependencyRoots([chunk]);
    const notices = await dependencyNotices(dependencies);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, entry), chunk.code);
    await cp(path.join(root, "LICENSE"), path.join(directory, "LICENSE.txt"));
    await writeFile(
      path.join(directory, "THIRD-PARTY-NOTICES.txt"),
      notices.join("\n\n--------------------\n\n"),
    );
    for (const name of [entry, "LICENSE.txt", "THIRD-PARTY-NOTICES.txt"])
      inputFiles.add(path.join(directory, name));
  }
  const dependencies = await dependencyRoots(chunks);
  for (const { directory } of dependencies) {
    inputFiles.add(path.join(directory, "package.json"));
    for (const name of (await readdir(directory)).filter((name) =>
      licenseFilename.test(name),
    ))
      inputFiles.add(path.join(directory, name));
  }
  const inputs = Object.fromEntries(
    await Promise.all(
      [...inputFiles].map(async (filename) => [
        path.relative(root, filename).split(path.sep).join("/"),
        sha256(await readFile(filename)),
      ]),
    ),
  );
  const evidence = browserBuildSchema.parse({
    schemaVersion: 1,
    inputs,
    dependencies: dependencies.map(({ directory, manifest }) => ({
      directory: path.relative(root, directory).split(path.sep).join("/"),
      ...dependencyIdentity.parse(manifest),
    })),
  });
  await mkdir(path.dirname(browserBuildFile), { recursive: true });
  await writeFile(browserBuildFile, `${JSON.stringify(evidence, null, 2)}\n`);
}

export async function verifyScriptSource(directory) {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8")),
  );
  for (const name of manifestFiles(manifest)) {
    if (
      sha256(await readFile(path.join(directory, name))) !==
      manifest.files[name]
    )
      throw new Error(`Script hash mismatch: ${name}.`);
  }
  const sizes = manifest.entries ?? { [SCRIPT_ENTRY]: { size: manifest.size } };
  if (
    JSON.stringify(sizes[SCRIPT_ENTRY].size) !== JSON.stringify(manifest.size)
  )
    throw new Error("Script size mismatch.");
  for (const [name, { size: expected }] of Object.entries(sizes)) {
    const size = measure(await readFile(path.join(directory, name)));
    if (JSON.stringify(size) !== JSON.stringify(expected))
      throw new Error(`Script size mismatch: ${name}.`);
  }
  return manifest;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  if (process.argv.includes("--packages")) {
    await buildPackageBrowserModules();
  } else {
    const manifest = await buildScriptSource({
      version: process.env.SCRIPT_VERSION ?? "local",
      compare: process.argv.includes("--compare"),
    });
    process.stdout.write(`${JSON.stringify(manifest.entries)}\n`);
  }
}
