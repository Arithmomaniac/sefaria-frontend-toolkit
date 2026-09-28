import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { pathToFileURL } from "node:url";

const stage = (name, ...args) => ({ name, args });

const FORMATTING = stage("Formatting", "format:check");
const OXLINT = stage("Oxlint", "lint");
const INTEGRATION_POLICY = stage("Integration policy", "integration:check");
const WORKSPACE_BUILDS = stage("Workspace builds", "build");
const TYPECHECK = stage("TypeScript typecheck", "typecheck");
const API_DOCUMENTATION = stage("API documentation", "check:api-docs");
const DOCUMENTATION_SITE = stage("Documentation site", "build:site:bundles");
const SITE_ACCEPTANCE = stage(
  "Documentation site browser acceptance",
  "test:site",
);

// Cheap and frequently failing stages run before the slow browser suites.
// Tests read the assembled site, so the site bundle stage precedes them.
export const CHECK_STAGES = [
  FORMATTING,
  OXLINT,
  stage("OpenAPI contracts", "openapi:check"),
  INTEGRATION_POLICY,
  WORKSPACE_BUILDS,
  stage(
    "MCP Inspector stdio acceptance",
    "--filter",
    "@sefaria-example/mcp-app",
    "inspect:stdio",
  ),
  stage(
    "MCP protocol and browser acceptance",
    "--filter",
    "@sefaria-example/mcp-app",
    "demo",
  ),
  TYPECHECK,
  API_DOCUMENTATION,
  stage("Public metadata", "metadata:check"),
  DOCUMENTATION_SITE,
  stage("TypeScript and browser tests", "test"),
  SITE_ACCEPTANCE,
  stage("Script source browser acceptance", "test:script-source"),
  stage("Playground browser acceptance", "test:playground"),
  stage("Compatibility qualification", "compatibility:qualify"),
  stage("Tarball consumer", "package:smoke"),
  stage("Changesets rehearsal", "changeset:rehearse"),
];

// Inner-loop subset for documentation-site slices; never a substitute for the full check.
export const SITE_CHECK_STAGES = [
  FORMATTING,
  OXLINT,
  INTEGRATION_POLICY,
  WORKSPACE_BUILDS,
  TYPECHECK,
  API_DOCUMENTATION,
  DOCUMENTATION_SITE,
  SITE_ACCEPTANCE,
];

export function selectCheckStages(argv) {
  const unknown = argv.filter((argument) => argument !== "--site");
  if (unknown.length > 0) {
    throw new Error(`Unknown check argument: ${unknown.join(" ")}`);
  }
  return argv.includes("--site") ? SITE_CHECK_STAGES : CHECK_STAGES;
}

export async function runCheck({
  stages = CHECK_STAGES,
  run = runPnpm,
  log = writeLine,
  now = performance.now.bind(performance),
  writeResult = writeCheckResult,
} = {}) {
  const results = [];

  for (const stage of stages) {
    log(`\n▶ ${stage.name}`);
    const started = now();
    const exitCode = await run(stage);
    const elapsed = now() - started;
    results.push({ name: stage.name, elapsed, exitCode });
    log(
      `${exitCode === 0 ? "✓" : "✗"} ${stage.name} (${formatDuration(elapsed)})`,
    );

    if (exitCode !== 0) {
      printSummary(results, log);
      await writeResult({
        status: "failed",
        exitCode,
        failedStage: stage.name,
        stages: results,
      });
      return exitCode;
    }
  }

  printSummary(results, log);
  await writeResult({
    status: "passed",
    exitCode: 0,
    failedStage: null,
    stages: results,
  });
  return 0;
}

function runPnpm(stage) {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
    const args = windows
      ? ["/d", "/s", "/c", `pnpm ${stage.args.join(" ")}`]
      : stage.args;
    const child = spawn(executable, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function printSummary(results, log) {
  log("\nCheck stage timings:");
  for (const result of results) {
    const status = result.exitCode === 0 ? "passed" : "failed";
    log(`- ${result.name}: ${formatDuration(result.elapsed)} (${status})`);
  }
}

function formatDuration(milliseconds) {
  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)}ms`;
  }
  const seconds = milliseconds / 1_000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

async function writeCheckResult(result) {
  const directory = path.resolve(".artifacts", "check");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

export function isMainModule(
  moduleUrl,
  entryPath,
  resolveRealPath = realpathSync,
) {
  return (
    entryPath !== undefined &&
    moduleUrl === pathToFileURL(resolveRealPath(entryPath)).href
  );
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exitCode = await runCheck({
    stages: selectCheckStages(process.argv.slice(2)),
  });
}
