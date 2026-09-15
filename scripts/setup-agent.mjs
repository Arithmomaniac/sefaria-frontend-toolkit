import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const browserProbe =
  "import { chromium } from 'playwright'; const browser = await chromium.launch({ headless: true }); await browser.close();";

export async function runAgentSetup({
  platform = process.platform,
  run = runCommand,
} = {}) {
  requireSupportedNode();
  await runChecked(run, "pnpm", ["--version"]);
  await runChecked(run, "pnpm", ["install", "--frozen-lockfile"]);

  const playwrightArgs = ["exec", "playwright", "install"];
  if (platform === "linux") playwrightArgs.push("--with-deps");
  playwrightArgs.push("chromium");
  await runChecked(run, "pnpm", playwrightArgs);
  await runChecked(run, "node", [
    "--input-type=module",
    "--eval",
    browserProbe,
  ]);
}

async function runChecked(run, command, args) {
  const exitCode = await run(command, args);
  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${exitCode}`,
    );
  }
}

function requireSupportedNode() {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error(
      `Node.js 22.12 or later is required; found ${process.versions.node}.`,
    );
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const executable =
      windows && command === "pnpm"
        ? (process.env.ComSpec ?? "cmd.exe")
        : command;
    const commandArgs =
      windows && command === "pnpm"
        ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`]
        : args;
    const child = spawn(executable, commandArgs, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function isMainModule(moduleUrl, entryPath) {
  return (
    entryPath !== undefined &&
    moduleUrl === pathToFileURL(path.resolve(entryPath)).href
  );
}

if (isMainModule(import.meta.url, process.argv[1])) {
  try {
    await runAgentSetup();
    await writeSetupResult({ status: "passed", error: null });
  } catch (error) {
    await writeSetupResult({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function writeSetupResult(result) {
  const directory = path.resolve(".artifacts", "setup");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
}
