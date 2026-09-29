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

const root = path.resolve(import.meta.dirname, "..");
export const SCRIPT_ENTRY = "sefaria-elements.js";
export const SCRIPT_FILES = [
  SCRIPT_ENTRY,
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

export async function bundleElements({ split = false } = {}) {
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
                "ref-label",
                "source-card",
                "text-segment",
              ].map((name) => [
                name,
                path.join(directory, `${name}-element.js`),
              ]),
            )
          : { elements: path.join(directory, "index.js") },
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          entryFileNames: split ? "[name].js" : SCRIPT_ENTRY,
          chunkFileNames: "shared-[hash].js",
          banner:
            "/*! GPL-3.0-only. See LICENSE.txt, THIRD-PARTY-NOTICES.txt and source.tar.gz beside this file. */",
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
  return chunks;
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

export async function buildScriptSource({
  destination = path.join(root, "dist", "script-source"),
  version = "local",
  sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    windowsHide: true,
    cwd: root,
    encoding: "utf8",
  }).trim(),
  compare = false,
} = {}) {
  if (
    version !== "local" &&
    !/^0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*$/u.test(version)
  )
    throw new Error("Invalid script version.");
  if (!/^[a-f0-9]{40}$/u.test(sourceSha))
    throw new Error("Invalid source SHA.");
  const chunks = await bundleElements();
  const dependencies = await dependencyRoots(chunks);
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
    const notices = [];
    for (const { directory, manifest } of dependencies) {
      const licenses = (await readdir(directory)).filter((name) =>
        /^(?:licen[sc]e|copying|notice)(?:[.-].*)?$/iu.test(name),
      );
      if (licenses.length === 0 || !manifest.license)
        throw new Error(`Missing license evidence: ${manifest.name}.`);
      notices.push(
        `${manifest.name}@${manifest.version} (${manifest.license})\n${(await Promise.all(licenses.map((name) => readFile(path.join(directory, name), "utf8")))).join("\n")}`,
      );
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
    await writeFile(path.join(destination, SCRIPT_ENTRY), chunks[0].code);
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
      schemaVersion: 1,
      version,
      sourceSha,
      entry: SCRIPT_ENTRY,
      size: measure(chunks[0].code),
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

export async function verifyScriptSource(directory) {
  const manifest = z
    .strictObject({
      schemaVersion: z.literal(1),
      version: z
        .string()
        .regex(/^(?:local|0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*)$/u),
      sourceSha: z.string().regex(/^[a-f0-9]{40}$/u),
      entry: z.literal(SCRIPT_ENTRY),
      size: z.strictObject({
        raw: z.number().int().positive(),
        gzip: z.number().int().positive(),
      }),
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
      files: z.strictObject(
        Object.fromEntries(
          SCRIPT_FILES.map((name) => [
            name,
            z.string().regex(/^[a-f0-9]{64}$/u),
          ]),
        ),
      ),
    })
    .parse(
      JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8")),
    );
  for (const name of SCRIPT_FILES) {
    if (
      sha256(await readFile(path.join(directory, name))) !==
      manifest.files[name]
    )
      throw new Error(`Script hash mismatch: ${name}.`);
  }
  const size = measure(await readFile(path.join(directory, SCRIPT_ENTRY)));
  if (
    manifest.gzipLevel !== 9 ||
    JSON.stringify(size) !== JSON.stringify(manifest.size)
  )
    throw new Error("Script size mismatch.");
  return manifest;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const manifest = await buildScriptSource({
    version: process.env.SCRIPT_VERSION ?? "local",
    compare: process.argv.includes("--compare"),
  });
  process.stdout.write(`${JSON.stringify(manifest.size)}\n`);
}
