import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SCRIPT_ENTRIES,
  manifestFiles,
} from "../scripts/build-script-source.mjs";
import { validateBootstrapInventory } from "../scripts/package-publication.mjs";

const root = path.resolve(import.meta.dirname, "..");
const repository = "Sefaria/sefaria-frontend-toolkit";

describe("Sefaria ownership migration", () => {
  it.each([
    ["client", "@sefaria/api-client"],
    ["text-transform", "@sefaria/text-transform"],
    ["web-components", "@sefaria/web-components"],
  ])(
    "gives %s the Sefaria package identity and MIT license",
    async (directory, name) => {
      const manifest = JSON.parse(
        await readFile(
          path.join(root, "packages", directory, "package.json"),
          "utf8",
        ),
      );
      expect(manifest.name).toBe(name);
      expect(manifest.license).toBe("MIT");
      expect(manifest.private).toBe(true);
      expect(manifest.repository.url).toBe(
        `git+https://github.com/${repository}.git`,
      );
    },
  );

  it("identifies Sefaria in the new MIT license", async () => {
    const license = await readFile(path.join(root, "LICENSE"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 Sefaria");
  });

  it("separates new browser names from immutable legacy inventories", () => {
    expect(Object.keys(SCRIPT_ENTRIES)).toEqual([
      "sefaria-elements.js",
      "sefaria-api-client.js",
      "sefaria-text-transform.js",
    ]);
    expect(manifestFiles({ schemaVersion: 1 })).not.toContain(
      "sefaria-client.js",
    );
    expect(manifestFiles({ schemaVersion: 2 })).toContain("sefaria-client.js");
    expect(manifestFiles({ schemaVersion: 2 })).not.toContain(
      "sefaria-api-client.js",
    );
    expect(manifestFiles({ schemaVersion: 3 })).toContain(
      "sefaria-api-client.js",
    );
    expect(manifestFiles({ schemaVersion: 3 })).not.toContain(
      "sefaria-client.js",
    );
    expect(() => manifestFiles({ schemaVersion: 99 })).toThrow();
  });

  it("permits empty and correctly linked partial bootstrap inventories", () => {
    expect(() => validateBootstrapInventory([], repository)).not.toThrow();
    for (const visibility of ["private", "public"]) {
      expect(() =>
        validateBootstrapInventory(
          [
            {
              name: "api-client",
              package_type: "npm",
              visibility,
              repository: { full_name: repository },
            },
          ],
          repository,
        ),
      ).not.toThrow();
    }
  });

  it("rejects ambiguous, unavailable, and incorrectly linked bootstrap inventory", () => {
    const record = {
      name: "api-client",
      package_type: "npm",
      repository: { full_name: repository },
    };
    for (const records of [
      null,
      [record, record],
      [{ ...record, repository: { full_name: "different/repository" } }],
      [{ ...record, repository: undefined }],
      [{ ...record, package_type: "container" }],
    ]) {
      expect(() => validateBootstrapInventory(records, repository)).toThrow();
    }
  });

  it("keeps the README and website origin acknowledgement identical", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    const theme = await readFile(
      path.join(root, "docs", ".vitepress", "theme", "index.ts"),
      "utf8",
    );
    const origin = readme.split("## Project origin\n\n")[1].split("\n")[0];
    expect(theme).toContain(JSON.stringify(origin));
  });
});
