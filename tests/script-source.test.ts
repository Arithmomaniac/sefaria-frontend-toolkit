import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildScriptSource,
  verifyScriptSource,
  measure,
  sha256,
} from "../scripts/build-script-source.mjs";
import {
  admitRelease,
  assembleScripts,
  packArtifact,
  retireRelease,
} from "../scripts/script-source-release.mjs";

describe("production script source", () => {
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "sefaria-script-"));
    await buildScriptSource({ destination: directory });
  }, 120_000);

  afterAll(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("emits a self-contained licensed module and independently measured bytes", async () => {
    const manifest = await verifyScriptSource(directory);
    expect(manifest.version).toBe("local");
    expect(manifest.entry).toBe("sefaria-elements.js");
    expect(manifest.size.raw).toBeGreaterThan(manifest.size.gzip);
    expect(manifest.size.gzip).toBeGreaterThan(0);
    expect(
      manifest.dependencies.map((entry: { name: string }) => entry.name),
    ).toEqual(
      expect.arrayContaining([
        "lit",
        "zod",
        "htmlparser2",
        "entities",
        "domhandler",
        "lru-cache",
      ]),
    );
    const notices = await readFile(
      path.join(directory, "THIRD-PARTY-NOTICES.txt"),
      "utf8",
    );
    expect(notices).toContain("BSD");
    expect(notices).toContain("MIT");
    expect(
      await readFile(path.join(directory, "LICENSE.txt"), "utf8"),
    ).toContain("GNU GENERAL PUBLIC LICENSE");
  });

  it("rejects a changed module instead of accepting stale hashes and size", async () => {
    const entry = path.join(directory, "sefaria-elements.js");
    const original = await readFile(entry);
    try {
      await writeFile(
        entry,
        Buffer.concat([original, Buffer.from("\n// changed\n")]),
      );
      await expect(verifyScriptSource(directory)).rejects.toThrow(
        "sefaria-elements.js",
      );
    } finally {
      await writeFile(entry, original);
    }
  });

  it("restores original bytes across distinct deployments and explicit retirement", async () => {
    const temporary = await mkdtemp(
      path.join(tmpdir(), "sefaria-deployments-"),
    );
    try {
      let catalog = { schemaVersion: 1, releases: [] };
      const archives = new Map<string, Buffer>();
      for (const id of [1, 2]) {
        const version = `0.0.0-alpha.${id}.1`;
        const candidate = path.join(temporary, version);
        await cp(directory, candidate, { recursive: true });
        const manifest = await verifyScriptSource(candidate);
        manifest.version = version;
        const entry = path.join(candidate, manifest.entry);
        const bytes = Buffer.concat([
          await readFile(entry),
          Buffer.from(`\n// release ${id}\n`),
        ]);
        await writeFile(entry, bytes);
        manifest.files[manifest.entry] = sha256(bytes);
        manifest.size = measure(bytes);
        await writeFile(
          path.join(candidate, "manifest.json"),
          JSON.stringify(manifest),
        );
        const archive = await packArtifact(
          candidate,
          path.join(temporary, `${id}.tar.gz`),
        );
        const repeated = await packArtifact(
          candidate,
          path.join(temporary, `${id}-repeat.tar.gz`),
        );
        expect(repeated).toEqual(archive);
        archives.set(version, archive);
        catalog = admitRelease(catalog, {
          version,
          sourceSha: manifest.sourceSha,
          runId: String(id),
          runNumber: String(id),
          runAttempt: "1",
          assetId: id,
          archiveHash: sha256(archive),
          state: "active",
        });
        await assembleScripts({
          catalog,
          destination: path.join(temporary, "cdn"),
          download: async (record: { version: string }) =>
            archives.get(record.version),
        });
      }
      const oldVersion = "0.0.0-alpha.1.1";
      const newVersion = "0.0.0-alpha.2.1";
      for (const file of [
        "sefaria-elements.js",
        "manifest.json",
        "source.tar.gz",
        "LICENSE.txt",
        "THIRD-PARTY-NOTICES.txt",
      ]) {
        expect(
          await readFile(path.join(temporary, "cdn", oldVersion, file)),
        ).toEqual(await readFile(path.join(temporary, oldVersion, file)));
        expect(
          await readFile(path.join(temporary, "cdn", "alpha", file)),
        ).toEqual(await readFile(path.join(temporary, newVersion, file)));
      }
      const original = await readFile(
        path.join(temporary, "cdn", oldVersion, "sefaria-elements.js"),
      );
      await expect(
        assembleScripts({
          catalog,
          destination: path.join(temporary, "cdn"),
          download: async () => Buffer.from("corrupted"),
        }),
      ).rejects.toThrow("hash");
      expect(
        await readFile(
          path.join(temporary, "cdn", oldVersion, "sefaria-elements.js"),
        ),
      ).toEqual(original);
      catalog = retireRelease(catalog, newVersion);
      await assembleScripts({
        catalog,
        destination: path.join(temporary, "cdn"),
        download: async (record: { version: string }) =>
          archives.get(record.version),
      });
      await expect(
        readFile(
          path.join(temporary, "cdn", newVersion, "sefaria-elements.js"),
        ),
      ).rejects.toThrow();
      expect(
        await readFile(
          path.join(temporary, "cdn", "alpha", "sefaria-elements.js"),
        ),
      ).toEqual(original);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);
});
