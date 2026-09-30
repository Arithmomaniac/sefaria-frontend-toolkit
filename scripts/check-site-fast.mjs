import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const all = process.argv.includes("--all");

const changed = all ? undefined : getChangedFiles();
const selectAll = changed === undefined;
const files = changed ?? [];

const commands = [];
if (selectAll || files.length > 0) {
  commands.push(["format:check"], ["lint"]);
}
if (
  selectAll ||
  files.some((file) => file.startsWith("docs/") || file.startsWith("examples/"))
) {
  commands.push(["build:site"]);
  commands.push(["test", "tests/documentation-site.test.ts"]);
}
if (
  selectAll ||
  files.some((file) =>
    /^(docs\/reference|packages\/|scripts\/check-api-docs\.mjs|pnpm-lock\.yaml)/u.test(
      file,
    ),
  )
) {
  commands.push(["check:api-docs"]);
}
if (
  selectAll ||
  files.some((file) =>
    /^(docs\/|README\.md|packages\/.*README\.md)/u.test(file),
  )
) {
  commands.push(["prose:check"]);
}

for (const args of commands) runPnpm(args);

function getChangedFiles() {
  const base =
    git(["merge-base", "HEAD", "origin/main"]) ??
    git(["merge-base", "HEAD", "main"]);
  if (base === undefined) return undefined;
  const tracked = git(["diff", "--name-only", base, "--"]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  if (tracked === undefined || untracked === undefined) return undefined;
  return [...tracked.split(/\r?\n/u), ...untracked.split(/\r?\n/u)]
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function runPnpm(args) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const executableArgs = windows
    ? ["/d", "/s", "/c", `pnpm ${args.map(quoteArgument).join(" ")}`]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function quoteArgument(value) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
