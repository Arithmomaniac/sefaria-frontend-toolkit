import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

/** Runs a Node script in isolation, preserving literal arguments and failures. */
export function runNodeScript(script, args = [], options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    ...options,
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${script} failed (${result.signal ?? `exit ${result.status}`}).`,
    );
  }
}

/** Runs a repository-installed package binary without a package-manager shell. */
export function runPackageTool(packageName, binary, args = [], options = {}) {
  const manifestPath = require.resolve(`${packageName}/package.json`);
  const { bin } = require(manifestPath);
  const entry = typeof bin === "string" ? bin : bin?.[binary];
  if (typeof entry !== "string") {
    throw new Error(`No binary ${binary} in installed package ${packageName}.`);
  }
  runNodeScript(path.resolve(path.dirname(manifestPath), entry), args, options);
}
