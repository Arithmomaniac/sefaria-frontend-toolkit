import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const repository = path.resolve(import.meta.dirname, "..");
const execFileAsync = promisify(execFile);

export async function rehearseChangesets({
  temporaryDirectory = tmpdir(),
} = {}) {
  const fixture = await mkdtemp(
    path.join(temporaryDirectory, "sefaria-toolkit-changesets-rehearsal-"),
  );
  try {
    await mkdir(path.join(fixture, ".changeset"), { recursive: true });
    await cp(
      path.join(repository, ".changeset", "config.json"),
      path.join(fixture, ".changeset", "config.json"),
    );
    await writeJson(fixture, "package.json", {
      name: "changesets-rehearsal",
      version: "0.0.0",
      private: true,
    });
    await writeFile(
      path.join(fixture, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    for (const [directory, name] of [
      ["client", "@arithmomaniac/sefaria-client"],
      ["text-transform", "@arithmomaniac/sefaria-text-transform"],
      ["web-components", "@arithmomaniac/sefaria-web-components"],
    ]) {
      await mkdir(path.join(fixture, "packages", directory), {
        recursive: true,
      });
      await writeJson(fixture, `packages/${directory}/package.json`, {
        name,
        version: "0.1.0",
        private: true,
        ...(name === "@arithmomaniac/sefaria-web-components"
          ? {
              dependencies: {
                "@arithmomaniac/sefaria-client": "^0.1.0",
                "@arithmomaniac/sefaria-text-transform": "^0.1.0",
              },
            }
          : {}),
      });
    }

    await run(fixture, "git", ["init", "--initial-branch", "fixture"]);
    await run(fixture, "git", ["config", "user.name", "Changesets Rehearsal"]);
    await run(fixture, "git", [
      "config",
      "user.email",
      "changesets-rehearsal@example.invalid",
    ]);
    await run(fixture, "git", ["add", "."]);
    await run(fixture, "git", ["commit", "-m", "fixture baseline"]);
    const baseline = (
      await capture(fixture, "git", ["rev-parse", "HEAD"])
    ).trim();

    await writeChangeset(
      fixture,
      "first-alpha",
      "@arithmomaniac/sefaria-client",
      "Exercise first alpha.",
    );
    await runChangesets(fixture, ["pre", "enter", "alpha"]);
    await runChangesets(fixture, ["version"]);
    const firstVersions = await readVersions(fixture);
    assertSynchronized(firstVersions);
    if (!/^\d+\.\d+\.\d+-alpha\.0$/u.test(firstVersions[0])) {
      throw new Error(
        `Unexpected first prerelease version ${firstVersions[0]}.`,
      );
    }

    await writeChangeset(
      fixture,
      "second-alpha",
      "@arithmomaniac/sefaria-text-transform",
      "Exercise subsequent alpha.",
    );
    await runChangesets(fixture, ["version"]);
    const secondVersions = await readVersions(fixture);
    assertSynchronized(secondVersions);
    if (!/^\d+\.\d+\.\d+-alpha\.1$/u.test(secondVersions[0])) {
      throw new Error(
        `Unexpected second prerelease version ${secondVersions[0]}.`,
      );
    }

    const webManifest = await readJson(
      fixture,
      "packages/web-components/package.json",
    );
    for (const dependency of [
      "@arithmomaniac/sefaria-client",
      "@arithmomaniac/sefaria-text-transform",
    ]) {
      if (webManifest.dependencies[dependency] !== `^${secondVersions[0]}`) {
        throw new Error(
          `${dependency} was not updated to the synchronized fixed-group version.`,
        );
      }
    }
    for (const directory of ["client", "text-transform", "web-components"]) {
      const manifest = await readJson(
        fixture,
        `packages/${directory}/package.json`,
      );
      if (manifest.private !== true) {
        throw new Error(`${manifest.name} lost private status.`);
      }
      const changelog = await readFile(
        path.join(fixture, "packages", directory, "CHANGELOG.md"),
        "utf8",
      );
      if (!changelog.includes(secondVersions[0])) {
        throw new Error(
          `${manifest.name} changelog is missing the alpha sequence.`,
        );
      }
    }
    if (
      (await capture(fixture, "git", ["rev-parse", "HEAD"])).trim() !== baseline
    ) {
      throw new Error("Changesets created an automatic commit.");
    }
    if ((await capture(fixture, "git", ["tag", "--list"])).trim() !== "") {
      throw new Error("Changesets created a tag during local versioning.");
    }

    const result = {
      firstVersion: firstVersions[0],
      secondVersion: secondVersions[0],
    };
    process.stdout.write(
      `Changesets rehearsal: ${result.firstVersion} -> ${result.secondVersion}, fixed libraries synchronized with no commit or tag.\n`,
    );
    return result;
  } finally {
    await rm(fixture, { force: true, recursive: true });
  }
}

export async function rehearseConcurrentChangesets({
  temporaryDirectory = tmpdir(),
} = {}) {
  const sharedDirectory = await mkdtemp(
    path.join(temporaryDirectory, "sefaria-changesets-concurrency-test-"),
  );
  try {
    const results = await Promise.all([
      rehearseChangesets({ temporaryDirectory: sharedDirectory }),
      rehearseChangesets({ temporaryDirectory: sharedDirectory }),
    ]);
    for (const result of results) {
      if (
        result.firstVersion !== "0.1.1-alpha.0" ||
        result.secondVersion !== "0.1.1-alpha.1"
      ) {
        throw new Error(
          `Unexpected Changesets rehearsal versions: ${result.firstVersion} -> ${result.secondVersion}.`,
        );
      }
    }
    const remaining = await readdir(sharedDirectory);
    if (remaining.length > 0) {
      throw new Error(
        `Changesets rehearsal leaked fixtures: ${remaining.join(", ")}.`,
      );
    }
  } finally {
    await rm(sharedDirectory, { force: true, recursive: true });
  }
}

async function writeChangeset(fixture, id, packageName, summary) {
  await writeFile(
    path.join(fixture, ".changeset", `${id}.md`),
    `---\n"${packageName}": patch\n---\n\n${summary}\n`,
  );
}

async function readVersions(fixture) {
  return Promise.all(
    ["client", "text-transform", "web-components"].map(async (directory) => {
      const manifest = await readJson(
        fixture,
        `packages/${directory}/package.json`,
      );
      return manifest.version;
    }),
  );
}

function assertSynchronized(versions) {
  if (new Set(versions).size !== 1) {
    throw new Error(`Fixed library versions diverged: ${versions.join(", ")}.`);
  }
}

async function runChangesets(fixture, args) {
  const binary = path.join(
    repository,
    "node_modules",
    "@changesets",
    "cli",
    "bin.js",
  );
  await run(fixture, process.execPath, [binary, ...args]);
}

async function run(fixture, command, args) {
  const windowsCommand =
    process.platform === "win32" && command.endsWith(".cmd");
  const executable = windowsCommand
    ? (process.env.ComSpec ?? "cmd.exe")
    : command;
  const executableArgs = windowsCommand
    ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`]
    : args;
  try {
    await execFileAsync(executable, executableArgs, {
      windowsHide: true,
      cwd: fixture,
      env: { ...process.env, INIT_CWD: fixture },
    });
  } catch (error) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${exitCode(error)}.`,
      { cause: error },
    );
  }
}

async function capture(fixture, command, args) {
  try {
    const result = await execFileAsync(command, args, {
      windowsHide: true,
      cwd: fixture,
      encoding: "utf8",
    });
    return result.stdout;
  } catch (error) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${exitCode(error)}.`,
      { cause: error },
    );
  }
}

function exitCode(error) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : "unknown";
}

async function writeJson(fixture, relativePath, value) {
  const filename = path.join(fixture, relativePath);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(fixture, relativePath) {
  return JSON.parse(await readFile(path.join(fixture, relativePath), "utf8"));
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await rehearseConcurrentChangesets({
    temporaryDirectory:
      process.env.SEFARIA_REHEARSAL_TEMP_DIRECTORY ?? tmpdir(),
  });
}
