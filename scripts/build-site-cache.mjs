import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

export const BUILD_KEY_FILE = ".build-key.json";

export async function createSiteBuildKey({
  root,
  siteBasePath,
  options,
  exec = runGit,
} = {}) {
  const files = await listInputFiles(root, exec);
  return {
    version: 1,
    head: exec(root, ["rev-parse", "HEAD"]) ?? "unknown",
    siteBasePath,
    options,
    node: process.version,
    pnpm: readPackageManager(root),
    inputs: await hashFiles(root, files),
    lockfile: await hashOptionalFile(path.join(root, "pnpm-lock.yaml")),
  };
}

export async function canReuseSiteBuild({
  siteDirectory,
  requiredFiles,
  expectedKey,
} = {}) {
  try {
    const actualKey = JSON.parse(
      await readFile(path.join(siteDirectory, BUILD_KEY_FILE), "utf8"),
    );
    if (JSON.stringify(actualKey) !== JSON.stringify(expectedKey)) return false;
    await Promise.all(
      requiredFiles.map((file) => access(path.join(siteDirectory, file))),
    );
    return true;
  } catch {
    return false;
  }
}

export async function writeSiteBuildKey(siteDirectory, key) {
  await writeFile(
    path.join(siteDirectory, BUILD_KEY_FILE),
    `${JSON.stringify(key, null, 2)}\n`,
  );
}

async function listInputFiles(root, exec) {
  const output = exec(root, [
    "ls-files",
    "-co",
    "--exclude-standard",
    "demos",
    "docs",
    "examples",
    "packages",
    "scripts",
    "tests",
    "LICENSE",
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    "vite.config.ts",
  ]);
  if (output === undefined) return await walk(root);
  return output.split(/\r?\n/u).filter(Boolean);
}

async function walk(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", ".artifacts"].includes(entry.name))
      continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(root, full)));
    else if (entry.isFile()) files.push(path.relative(root, full));
  }
  return files;
}

async function hashFiles(root, files) {
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    const full = path.join(root, file);
    const info = await stat(full).catch(() => undefined);
    if (!info?.isFile()) continue;
    hash.update(file.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(await readFile(full));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function hashOptionalFile(file) {
  try {
    return createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  } catch {
    return null;
  }
}

function readPackageManager(root) {
  try {
    return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
      .packageManager;
  } catch {
    return "unknown";
  }
}

function runGit(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return undefined;
  return result.stdout.trim();
}
