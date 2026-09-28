import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it, onTestFinished } from "vitest";

import { runNodeScript, runPackageTool } from "../scripts/node-tool.mjs";

it("passes literal arguments and cwd to Node without shell interpretation", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "sefaria node tools "));
  onTestFinished(() => rm(cwd, { recursive: true, force: true }));
  const script = path.join(cwd, "capture args.mjs");
  await writeFile(
    script,
    `import { writeFileSync } from "node:fs";
writeFileSync("result.json", JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(), marker: process.env.TEST_MARKER
}));`,
  );
  const args = ["with spaces", 'a"b', "a&b", "%PATH%", "$(not-a-command)"];
  runNodeScript(script, args, {
    cwd,
    env: { ...process.env, TEST_MARKER: "literal" },
  });
  expect(
    JSON.parse(await readFile(path.join(cwd, "result.json"), "utf8")),
  ).toEqual({
    args,
    cwd,
    marker: "literal",
  });
});

it("reports nonzero exits instead of returning a successful result", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "sefaria node failure "));
  onTestFinished(() => rm(cwd, { recursive: true, force: true }));
  const script = path.join(cwd, "fail.mjs");
  await writeFile(script, "process.exitCode = 7;");
  expect(() => runNodeScript(script)).toThrow(/7/);
});

it("runs the installed tool and rejects an unknown binary", () => {
  runPackageTool("vite", "vite", ["--version"]);
  expect(() => runPackageTool("vite", "missing", [])).toThrow(/missing/);
});

it("preserves a process-launch error", () => {
  expect(() =>
    runNodeScript("unused.mjs", [], {
      cwd: path.join(import.meta.filename, "not-a-directory"),
    }),
  ).toThrow();
});
