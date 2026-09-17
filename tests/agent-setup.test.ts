import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  classifyToolkitManifest,
  detectToolkitCheckout,
} from "../.github/scripts/detect-toolkit.mjs";
import { runAgentSetup } from "../scripts/setup-agent.mjs";

describe("Copilot agent setup", () => {
  it("recognizes the toolkit package without depending on a branch name", () => {
    expect(
      classifyToolkitManifest({
        name: "@arithmomaniac/sefaria-web-components",
        private: true,
      }),
    ).toBe("toolkit");
    expect(
      classifyToolkitManifest({
        name: "@sefaria/components",
        private: true,
      }),
    ).toBe("unrelated");
    expect(() => classifyToolkitManifest({ private: true })).toThrow(
      "packages/web-components/package.json",
    );
  });

  it("uses the same detector for missing, malformed, and ready checkouts", async () => {
    await expect(
      detectToolkitCheckout("repo", {
        read: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("missing"), { code: "ENOENT" }),
          ),
        requireSetup: vi.fn(),
      }),
    ).resolves.toBe("unrelated");

    await expect(
      detectToolkitCheckout("repo", {
        read: vi.fn().mockResolvedValue(JSON.stringify({ private: true })),
        requireSetup: vi.fn(),
      }),
    ).rejects.toThrow("has no package name");

    const requireSetup = vi.fn().mockResolvedValue(undefined);
    await expect(
      detectToolkitCheckout("repo", {
        read: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ name: "@arithmomaniac/sefaria-web-components" }),
          ),
        requireSetup,
      }),
    ).resolves.toBe("toolkit");
    expect(requireSetup).toHaveBeenCalledWith(
      path.join("repo", "scripts", "setup-agent.mjs"),
    );
  });

  it("prepares dependencies, qualified browsers, and a launch probe", async () => {
    const run = vi.fn().mockResolvedValue(0);

    await expect(
      runAgentSetup({
        platform: "win32",
        run,
      }),
    ).resolves.toBeUndefined();

    expect(run.mock.calls.slice(0, 3)).toEqual([
      ["pnpm", ["--version"]],
      ["pnpm", ["install", "--frozen-lockfile"]],
      [
        "pnpm",
        ["exec", "playwright", "install", "chromium", "firefox", "webkit"],
      ],
    ]);
    expect(run.mock.calls[3]?.[0]).toBe("node");
    expect(run.mock.calls[3]?.[1]?.join(" ")).toContain(
      "chromium, firefox, webkit",
    );
  });

  it("installs Linux browser dependencies without accessing Git history", async () => {
    const run = vi.fn().mockResolvedValue(0);

    await runAgentSetup({
      platform: "linux",
      run,
    });

    expect(run.mock.calls.some(([command]) => command === "git")).toBe(false);
    expect(run).toHaveBeenCalledWith("pnpm", [
      "exec",
      "playwright",
      "install",
      "--with-deps",
      "chromium",
      "firefox",
      "webkit",
    ]);
  });

  it("stops at the exact failed preparation step", async () => {
    const run = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(17);

    await expect(
      runAgentSetup({
        platform: "linux",
        run,
      }),
    ).rejects.toThrow(
      "pnpm install --frozen-lockfile failed with exit code 17",
    );
    expect(run).toHaveBeenCalledTimes(2);
  });
});
