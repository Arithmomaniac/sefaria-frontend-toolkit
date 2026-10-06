import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { prepareNpmAssets, readHandoff } from "./npm-release.mjs";
import { PACKAGE_DEFINITIONS } from "./package-publication.mjs";
import { readFile } from "node:fs/promises";

const repository = path.resolve(import.meta.dirname, "..");
if (!process.env.SEFARIA_NPM_ASSETS) {
  const parent = path.join(repository, ".artifacts", "npm-qualification");
  await mkdir(parent, { recursive: true });
  const releasePreparation = process.env.SEFARIA_RELEASE_PREPARE === "true";
  const directory = releasePreparation
    ? path.join(repository, ".artifacts", "npm-release")
    : await mkdtemp(path.join(parent, "consumer-"));
  const repeated = await mkdtemp(path.join(parent, "reproducible-"));
  try {
    const version = JSON.parse(
      await readFile(
        path.join(repository, PACKAGE_DEFINITIONS[0].directory, "package.json"),
        "utf8",
      ),
    ).version;
    const source = execFileSync("git", ["rev-parse", "HEAD"], {
      windowsHide: true,
      encoding: "utf8",
      cwd: repository,
    }).trim();
    await prepareNpmAssets({
      version,
      source,
      directory,
      requireConsumed: releasePreparation,
    });
    if (!releasePreparation) {
      await prepareNpmAssets({
        version,
        source,
        directory: repeated,
        requireConsumed: false,
      });
      const first = await readHandoff(directory);
      const second = await readHandoff(repeated);
      for (const [name, bytes] of first.assets)
        if (!second.assets.get(name)?.equals(bytes))
          throw new Error(`Non-reproducible qualified npm asset: ${name}.`);
    }
    execFileSync(
      process.execPath,
      [path.join(repository, "scripts", "test-tarball-consumer.mjs")],
      {
        windowsHide: true,
        cwd: repository,
        env: { ...process.env, SEFARIA_NPM_ASSETS: directory },
        stdio: "inherit",
      },
    );
  } finally {
    if (!releasePreparation)
      await rm(directory, { recursive: true, force: true });
    await rm(repeated, { recursive: true, force: true });
  }
}
