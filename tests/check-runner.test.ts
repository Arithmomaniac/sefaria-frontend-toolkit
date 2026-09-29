import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  CHECK_STAGES,
  isMainModule,
  runCheck,
  selectCheckStages,
  SITE_CHECK_STAGES,
} from "../scripts/check.mjs";

describe("repository check runner", () => {
  it("replaces Python checks with the compiled MCP acceptance harness", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);

    expect(names).not.toContain("Python static checks");
    expect(names).not.toContain("Python staged tests");
    expect(names.indexOf("Integration policy")).toBeLessThan(
      names.indexOf("Workspace builds"),
    );
    expect(names.indexOf("Workspace builds")).toBeLessThan(
      names.indexOf("MCP Inspector stdio acceptance"),
    );
    expect(names.indexOf("Documentation site browser acceptance")).toBeLessThan(
      names.indexOf("Playground browser acceptance"),
    );
    expect(names.indexOf("MCP Inspector stdio acceptance")).toBeLessThan(
      names.indexOf("MCP protocol and browser acceptance"),
    );
    expect(names.indexOf("MCP protocol and browser acceptance")).toBeLessThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.at(-1)).toBe("Changesets rehearsal");
  });

  it("runs cheap and frequently failing stages before browser acceptance", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);
    const firstBrowserStage = Math.min(
      names.indexOf("Documentation site browser acceptance"),
      names.indexOf("Script source browser acceptance"),
      names.indexOf("Playground browser acceptance"),
    );

    expect(names.slice(0, 2)).toEqual(["Formatting", "Oxlint"]);
    for (const stage of [
      "TypeScript typecheck",
      "API documentation",
      "Public metadata",
      "Reference freshness",
      "TypeScript and browser tests",
    ]) {
      expect(names.indexOf(stage), stage).toBeLessThan(firstBrowserStage);
    }
    expect(names.indexOf("Documentation site")).toBeLessThan(
      names.indexOf("TypeScript and browser tests"),
    );
    expect(names.indexOf("Reference freshness")).toBe(
      names.indexOf("Public metadata") + 1,
    );
    expect(names).toHaveLength(20);
  });

  it("selects the documentation-site subset only with --site", () => {
    expect(selectCheckStages([])).toBe(CHECK_STAGES);
    expect(selectCheckStages(["--site"])).toBe(SITE_CHECK_STAGES);
    expect(() => selectCheckStages(["--unknown"])).toThrow(/--unknown/u);
    expect(SITE_CHECK_STAGES.map((stage) => stage.name)).toEqual([
      "Formatting",
      "Oxlint",
      "Integration policy",
      "Workspace builds",
      "TypeScript typecheck",
      "API documentation",
      "Reference freshness",
      "Prose lint",
      "Documentation site",
      "Documentation site browser acceptance",
    ]);
    for (const stage of SITE_CHECK_STAGES) {
      expect(CHECK_STAGES).toContain(stage);
    }
  });

  it("builds workspace artifacts before TypeScript consumers resolve them", () => {
    const names = CHECK_STAGES.map((stage) => stage.name);

    expect(names).toContain("Oxlint");
    expect(names.indexOf("Workspace builds")).toBeLessThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.indexOf("API documentation")).toBeGreaterThan(
      names.indexOf("TypeScript typecheck"),
    );
    expect(names.indexOf("Public metadata")).toBeGreaterThan(
      names.indexOf("API documentation"),
    );
    expect(names.indexOf("API documentation")).toBeLessThan(
      names.indexOf("TypeScript and browser tests"),
    );
  });

  it("stops after the first failed stage and reports completed timings", async () => {
    const run = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(7);
    const log = vi.fn();
    const writeResult = vi.fn();

    const exitCode = await runCheck({
      stages: CHECK_STAGES.slice(0, 3),
      run,
      log,
      now: sequenceClock(100, 350, 500, 900),
      writeResult,
    });

    expect(exitCode).toBe(7);
    expect(run).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Formatting"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("250ms"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("failed"));
    expect(writeResult).toHaveBeenLastCalledWith({
      status: "failed",
      exitCode: 7,
      failedStage: "Oxlint",
      stages: [
        { name: "Formatting", elapsed: 250, exitCode: 0 },
        { name: "Oxlint", elapsed: 400, exitCode: 7 },
      ],
    });
  });

  it("writes a successful bounded check result", async () => {
    const writeResult = vi.fn();

    await expect(
      runCheck({
        stages: CHECK_STAGES.slice(0, 1),
        run: vi.fn().mockResolvedValue(0),
        log: vi.fn(),
        now: sequenceClock(0, 100),
        writeResult,
      }),
    ).resolves.toBe(0);

    expect(writeResult).toHaveBeenLastCalledWith({
      status: "passed",
      exitCode: 0,
      failedStage: null,
      stages: [{ name: "Formatting", elapsed: 100, exitCode: 0 }],
    });
  });

  it("recognizes the entry point after resolving a symlinked path", () => {
    const realPath = path.resolve("real-worktree", "scripts", "check.mjs");

    expect(
      isMainModule(
        pathToFileURL(realPath).href,
        path.resolve("linked-worktree", "scripts", "check.mjs"),
        () => realPath,
      ),
    ).toBe(true);
  });

  it("keeps emitting build metadata inside the output directory", async () => {
    const repository = path.resolve(import.meta.dirname, "..");
    const configs: Array<readonly [string, string, string]> = [
      ["packages/client/tsconfig.build.json", "dist", "dist/.tsbuildinfo"],
      [
        "packages/web-components/tsconfig.build.json",
        "dist",
        "dist/.tsbuildinfo",
      ],
      [
        "packages/text-transform/tsconfig.build.json",
        "dist",
        "dist/.tsbuildinfo",
      ],
      ["tests/compatibility/tsconfig.build.json", "dist", "dist/.tsbuildinfo"],
      [
        "examples/mcp-app/tsconfig.server.json",
        "dist/server",
        "dist/server/.tsbuildinfo",
      ],
    ];

    for (const [config, outDir, tsBuildInfoFile] of configs) {
      const contents = JSON.parse(
        await readFile(path.join(repository, config), "utf8"),
      ) as {
        compilerOptions?: {
          outDir?: string;
          tsBuildInfoFile?: string;
        };
      };

      expect(contents.compilerOptions, config).toMatchObject({
        outDir,
        tsBuildInfoFile,
      });
    }
  });
});

function sequenceClock(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
