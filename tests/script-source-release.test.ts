import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assembleScripts,
  admitRelease,
  retireRelease,
  validateCatalog,
  unpackArtifact,
  readCatalog,
  writeCatalog,
  createGithubClient,
  assertSiteSize,
  renderVersionsIndex,
} from "../scripts/script-source-release.mjs";

const sourceSha = "a".repeat(40);
const record = (id: number) => ({
  version: `0.0.0-alpha.${id}.1`,
  sourceSha,
  runId: String(id),
  runNumber: String(id),
  runAttempt: "1",
  assetId: id,
  archiveHash: "b".repeat(64),
  state: "active",
});
const empty = () => ({ schemaVersion: 1, releases: [] });
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("script retention catalog", () => {
  it("applies a fresh effective deadline to each GitHub request", async () => {
    const signals: unknown[] = [];
    const client = createGithubClient({
      repository: "owner/repo",
      token: "fixture",
      fetch: async (_input: unknown, init: RequestInit) => {
        signals.push(init.signal);
        return new Response("{}", {
          headers: { "content-type": "application/json" },
        });
      },
    });
    await client.api.repos.get({ owner: "owner", repo: "repo" });
    await client.api.repos.get({ owner: "owner", repo: "repo" });
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBeInstanceOf(AbortSignal);
    expect(signals[0]).not.toBe(signals[1]);
    const stalled = createGithubClient({
      repository: "owner/repo",
      token: "fixture",
      timeoutMs: 20,
      fetch: async (_input: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(new Error("deadline")),
            { once: true },
          );
        }),
    });
    await expect(
      stalled.api.repos.get({ owner: "owner", repo: "repo" }),
    ).rejects.toThrow("deadline");
  });

  it("checks the exact complete-site byte budget without retiring anything", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "script-size-"));
    directories.push(directory);
    await writeFile(path.join(directory, "index.html"), "1234567890");
    await expect(assertSiteSize(directory, 10)).resolves.toBe(10);
    await expect(assertSiteSize(directory, 9)).rejects.toThrow("10 bytes");
    expect(await readFile(path.join(directory, "index.html"), "utf8")).toBe(
      "1234567890",
    );
  });
  it("does not turn provider failure or missing restore state into an empty catalog", async () => {
    const failure = Object.assign(new Error("catalog unavailable"), {
      status: 404,
    });
    const client = {
      api: {
        git: {
          getRef: async () => {
            throw failure;
          },
        },
      },
      owner: "owner",
      repo: "repo",
    };
    await expect(readCatalog(client)).rejects.toBe(failure);
  });

  it("uses a non-forced parent-based update so concurrent writers cannot lose a release", async () => {
    let head = "initial";
    let sequence = 0;
    const parents = new Map<string, string>();
    const client = {
      owner: "owner",
      repo: "repo",
      api: {
        git: {
          createTree: async () => ({ data: { sha: "tree" } }),
          createCommit: async (input: { parents: string[] }) => {
            const sha = `commit-${++sequence}`;
            parents.set(sha, input.parents[0]);
            return { data: { sha } };
          },
          updateRef: async (input: { sha: string; force: boolean }) => {
            expect(input.force).toBe(false);
            if (parents.get(input.sha) !== head)
              throw new Error("non-fast-forward");
            head = input.sha;
          },
        },
      },
    };
    const snapshot = { head, catalog: empty() };
    const results = await Promise.allSettled([
      writeCatalog(client, snapshot, admitRelease(empty(), record(1))),
      writeCatalog(client, snapshot, admitRelease(empty(), record(2))),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });
  it("keeps old versions when later releases finish out of order", () => {
    const catalog = admitRelease(admitRelease(empty(), record(2)), record(1));
    expect(
      catalog.releases.map((entry: { version: string }) => entry.version),
    ).toEqual([record(1).version, record(2).version]);
    expect(admitRelease(catalog, record(1))).toEqual(catalog);
    expect(() =>
      admitRelease(catalog, { ...record(1), archiveHash: "c".repeat(64) }),
    ).toThrow("immutable");
  });

  it("requires explicit retirement and never reuses a retired URL", () => {
    const catalog = admitRelease(admitRelease(empty(), record(1)), record(2));
    const retired = retireRelease(catalog, record(1).version);
    expect(retired.releases[0].state).toBe("retired");
    expect(retired.releases[1]).toEqual(record(2));
    expect(() => admitRelease(retired, record(1))).toThrow("retired");
    expect(() => retireRelease(retired, "missing")).toThrow();
  });

  it("rejects duplicate versions, mismatched producer identity and unknown fields", () => {
    expect(() =>
      validateCatalog({ schemaVersion: 1, releases: [record(1), record(1)] }),
    ).toThrow();
    expect(() =>
      validateCatalog({
        schemaVersion: 1,
        releases: [{ ...record(1), runId: "5" }],
      }),
    ).toThrow();
    expect(() => validateCatalog({ ...empty(), unexpected: true })).toThrow();
  });

  it("fails closed when an active archive is unavailable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "script-restore-"));
    directories.push(directory);
    await expect(
      assembleScripts({
        catalog: admitRelease(empty(), record(1)),
        destination: path.join(directory, "cdn"),
        download: async () => {
          throw new Error("missing release asset");
        },
      }),
    ).rejects.toThrow("missing release asset");
  });

  it("serves no alpha when every version is explicitly retired", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "script-retired-"));
    directories.push(directory);
    await writeFile(path.join(directory, "unrelated.txt"), "keep");
    const catalog = retireRelease(
      admitRelease(empty(), record(1)),
      record(1).version,
    );
    await assembleScripts({
      catalog,
      destination: path.join(directory, "cdn"),
      download: async () => {
        throw new Error("must not download");
      },
    });
    expect(
      JSON.parse(
        await readFile(path.join(directory, "cdn", "catalog.json"), "utf8"),
      ).alpha,
    ).toBeNull();
    expect(await readFile(path.join(directory, "unrelated.txt"), "utf8")).toBe(
      "keep",
    );
  });

  it("rejects corrupt archives before extraction", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "script-corrupt-"));
    directories.push(directory);
    await expect(
      unpackArtifact(Buffer.from("wrong"), record(1), directory),
    ).rejects.toThrow("hash");
  });
});

describe("script-tag versions index (EP6)", () => {
  it("lists active versions newest first, marks alpha, and omits retired addresses", () => {
    const catalog = retireRelease(
      admitRelease(
        admitRelease(admitRelease(empty(), record(1)), record(2)),
        record(3),
      ),
      record(2).version,
    );
    const html = renderVersionsIndex(catalog);
    expect(html).toMatch(/^<!doctype html>/u);
    const three = html.indexOf("0.0.0-alpha.3.1/sefaria-elements.js");
    const one = html.indexOf("0.0.0-alpha.1.1/sefaria-elements.js");
    expect(three).toBeGreaterThan(-1);
    expect(one).toBeGreaterThan(three);
    expect(html).not.toContain("0.0.0-alpha.2.1/sefaria-elements.js");
    expect(html).toContain("0.0.0-alpha.2.1");
    expect(html).toMatch(/alpha\/sefaria-elements\.js/u);
    expect(html).toMatch(/currently serves <code>0\.0\.0-alpha\.3\.1<\/code>/u);
    expect(html).toMatch(/may be retired without notice/u);
    expect(html).toContain("Community-driven with Sefaria backing and support");
    for (const route of [
      "../use-components/start-here.html",
      "../help/install-and-status.html",
      "../reference/package-imports-and-exports.html",
    ]) {
      expect(html).toContain(`href="${route}"`);
    }
    expect(html).toContain(`/commit/${sourceSha}`);
  });

  it("is written beside the assembled versions", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "script-index-"));
    directories.push(directory);
    const catalog = retireRelease(
      admitRelease(empty(), record(1)),
      record(1).version,
    );
    await assembleScripts({
      catalog,
      destination: path.join(directory, "cdn"),
      download: async () => {
        throw new Error("must not download");
      },
    });
    const html = await readFile(
      path.join(directory, "cdn", "index.html"),
      "utf8",
    );
    expect(html).toBe(renderVersionsIndex(catalog));
    expect(html).toMatch(/No version is being served/u);
  });
});
