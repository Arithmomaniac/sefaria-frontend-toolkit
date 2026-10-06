import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  PACKAGE_DEFINITIONS,
  createPublishManifest,
  readReleaseState,
} from "../scripts/package-publication.mjs";
import { proveCurrentChangesets } from "../scripts/prepare-npm-version.mjs";
import { rehearseChangesets } from "../scripts/rehearse-changesets.mjs";

describe("npm-only release contract", () => {
  it.each(["0.1.0-alpha.0", "0.1.0"])(
    "allows pending changesets in ordinary qualification of %s, but never in release preparation",
    async (version) => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "sefaria-pending-release-"),
      );
      try {
        for (const definition of PACKAGE_DEFINITIONS) {
          const root = path.join(directory, definition.directory);
          await mkdir(root, { recursive: true });
          await writeFile(
            path.join(root, "package.json"),
            JSON.stringify({
              name: definition.name,
              private: true,
              version,
            }),
          );
        }
        await mkdir(path.join(directory, ".changeset"));
        await writeFile(
          path.join(directory, ".changeset", "feature.md"),
          '---\n"@sefaria/api-client": patch\n---\n\nPending feature.\n',
        );
        if (version.includes("alpha"))
          await writeFile(
            path.join(directory, ".changeset", "pre.json"),
            JSON.stringify({ mode: "pre", tag: "alpha" }),
          );
        await expect(
          readReleaseState(directory, version, { requireConsumed: false }),
        ).resolves.toHaveLength(3);
        await expect(readReleaseState(directory, version)).rejects.toThrow();
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
  it("the actual pending Changesets produce exactly the requested first alpha", async () => {
    expect(await proveCurrentChangesets()).toBe("0.1.0-alpha.0");
  }, 120_000);
  it("advances synchronized alpha releases into a stable release with the installed CLI", async () => {
    expect(await rehearseChangesets()).toEqual({
      firstVersion: "0.1.1-alpha.0",
      secondVersion: "0.1.1-alpha.1",
      stableVersion: "0.1.1",
    });
  }, 120_000);
  it("stages the reviewed numbered version for public npm only", () => {
    const sourceManifest = {
      name: "@sefaria/web-components",
      version: "0.1.0-alpha.0",
      private: true,
      dependencies: {
        "@sefaria/api-client": "workspace:*",
        "@sefaria/text-transform": "workspace:*",
      },
    };
    expect(
      createPublishManifest({
        definition: PACKAGE_DEFINITIONS[2],
        sourceManifest,
        version: sourceManifest.version,
      }),
    ).toMatchObject({
      private: false,
      version: "0.1.0-alpha.0",
      publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org",
      },
      dependencies: {
        "@sefaria/api-client": "0.1.0-alpha.0",
        "@sefaria/text-transform": "0.1.0-alpha.0",
      },
    });
    expect(() =>
      createPublishManifest({
        definition: PACKAGE_DEFINITIONS[2],
        sourceManifest,
        version: "0.1.0-alpha.1",
      }),
    ).toThrow("reviewed");
  });

  it("ordinary CI publishes nothing even with both legacy flags enabled", async () => {
    const directory = path.resolve(".github", "workflows");
    const source = await readFile(path.join(directory, "ci.yml"), "utf8");
    const ci = YAML.parse(source);
    expect(Object.keys(ci.jobs).sort()).toEqual(["check", "validation"]);
    expect(source).not.toMatch(
      /vars\.|publish|packages:|id-token|contents: write/,
    );
    expect(await readdir(directory)).not.toContain("bootstrap-packages.yml");
    expect(await readdir(directory)).not.toContain("publish-packages.yml");
  });
});
