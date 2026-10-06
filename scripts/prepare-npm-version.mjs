import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { log } from "node:console";
import { pathToFileURL } from "node:url";
import {
  PACKAGE_DEFINITIONS,
  readReleaseState,
} from "./package-publication.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const cli = path.join(
  repository,
  "node_modules",
  "@changesets",
  "cli",
  "bin.js",
);
export const INITIAL_CHANGESETS_SOURCE =
  "0d11376df384f7bd9b5321146a1ebd95f6f3668b";

export async function prepareInitialVersion({ destination = repository } = {}) {
  for (const definition of PACKAGE_DEFINITIONS) {
    const manifest = JSON.parse(
      await readFile(
        path.join(destination, definition.directory, "package.json"),
        "utf8",
      ),
    );
    if (manifest.version !== "0.0.0" || manifest.private !== true)
      throw new Error(
        "Initial version preparation requires the private 0.0.0 baseline.",
      );
  }
  execFileSync(process.execPath, [cli, "pre", "enter", "alpha"], {
    windowsHide: true,
    cwd: destination,
    env: { ...process.env, INIT_CWD: destination },
    stdio: "pipe",
  });
  execFileSync(process.execPath, [cli, "version"], {
    windowsHide: true,
    cwd: destination,
    env: { ...process.env, INIT_CWD: destination },
    stdio: "pipe",
  });
  await readReleaseState(destination, "0.1.0-alpha.0");
}

export async function proveCurrentChangesets() {
  const fixture = await mkdtemp(
    path.join(tmpdir(), "sefaria-actual-changesets-"),
  );
  try {
    const inventory = JSON.parse(
      await readFile(
        path.join(repository, "tests", "fixtures", "initial-changesets.json"),
        "utf8",
      ),
    );
    if (inventory.source !== INITIAL_CHANGESETS_SOURCE)
      throw new Error("Initial Changesets fixture source mismatch.");
    for (const [filename, content] of Object.entries(inventory.files)) {
      await mkdir(path.join(fixture, path.dirname(filename)), {
        recursive: true,
      });
      await writeFile(path.join(fixture, filename), content);
    }

    execFileSync("git", ["init", "--quiet"], {
      cwd: fixture,
      windowsHide: true,
    });
    await writeFile(path.join(fixture, ".gitignore"), "node_modules\n");
    await prepareInitialVersion({ destination: fixture });
    return "0.1.0-alpha.0";
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

export async function captureInitialChangesets() {
  const filenames = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", INITIAL_CHANGESETS_SOURCE],
    { cwd: repository, encoding: "utf8", windowsHide: true },
  )
    .trim()
    .split("\n")
    .filter(
      (filename) =>
        filename.startsWith(".changeset/") ||
        /^(?:packages|examples)\/[^/]+\/package\.json$/.test(filename) ||
        [
          "package.json",
          "pnpm-workspace.yaml",
          "tests/compatibility/package.json",
        ].includes(filename),
    );
  const files = Object.fromEntries(
    filenames.map((filename) => [
      filename,
      execFileSync(
        "git",
        ["show", `${INITIAL_CHANGESETS_SOURCE}:${filename}`],
        { cwd: repository, encoding: "utf8", windowsHide: true },
      ),
    ]),
  );
  await mkdir(path.join(repository, "tests", "fixtures"), { recursive: true });
  await writeFile(
    path.join(repository, "tests", "fixtures", "initial-changesets.json"),
    `${JSON.stringify({ source: INITIAL_CHANGESETS_SOURCE, files }, null, 2)}\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (process.argv[2] === "capture") await captureInitialChangesets();
  else if (process.argv[2] === "prove") log(await proveCurrentChangesets());
  else if (process.argv[2] === "initial") await prepareInitialVersion();
  else
    throw new Error(
      "Expected prove or initial; later versions use the installed Changesets CLI.",
    );
}
