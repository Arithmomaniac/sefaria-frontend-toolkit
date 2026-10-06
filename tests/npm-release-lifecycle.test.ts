import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  captureDraft,
  digests,
  finalizeDraft,
  handoffAssets,
  maintainerCommands,
  npmRecord,
  publishCaptured,
  readHandoff,
  requireOidcEnvironment,
  uploadDraft,
  validateManifest,
} from "../scripts/npm-release.mjs";
import {
  PACKAGE_DEFINITIONS,
  tarballFilename,
} from "../scripts/package-publication.mjs";
import { cdnUrls, verifyCdnFiles } from "../scripts/verify-npm-cdn.mjs";

const version = "0.1.0-alpha.0";
const source = "a".repeat(40);

function fixture() {
  const tarballs = new Map(
    PACKAGE_DEFINITIONS.map((definition) => [
      tarballFilename(definition, version),
      Buffer.from(`qualified ${definition.name}`),
    ]),
  );
  const manifest = {
    schemaVersion: 1,
    repository: "Sefaria/sefaria-frontend-toolkit",
    source,
    version,
    tag: "alpha",
    packages: PACKAGE_DEFINITIONS.map((definition) => {
      const filename = tarballFilename(definition, version);
      const bytes = tarballs.get(filename)!;
      return {
        name: definition.name,
        filename,
        size: bytes.length,
        ...digests(bytes),
        dependencies:
          definition.slug === "web-components"
            ? {
                "@sefaria/api-client": version,
                "@sefaria/text-transform": version,
              }
            : {},
        browserFiles: Object.fromEntries(
          [
            definition.browserFile,
            "LICENSE.txt",
            "THIRD-PARTY-NOTICES.txt",
          ].map((file) => [file, "b".repeat(64)]),
        ),
      };
    }),
  };
  return { manifest, assets: handoffAssets(manifest, tarballs), tarballs };
}

function github() {
  const bytes = new Map<number, Buffer>();
  let tag: string | undefined;
  let release:
    | {
        id: number;
        tag_name: string;
        target_commitish: string;
        draft: boolean;
        prerelease: boolean;
        assets: Array<{ id: number; name: string; size: number }>;
        upload_url: string;
        html_url: string;
      }
    | undefined;
  const calls = { create: 0, upload: 0, finalize: 0 };
  const api = {
    git: {
      getRef: async () => {
        if (!tag) throw Object.assign(new Error("Absent"), { status: 404 });
        return { data: { object: { type: "commit", sha: tag } } };
      },
    },
    repos: {
      listReleases: async () => ({
        data: release ? [structuredClone(release)] : [],
      }),
      createRelease: async (input: {
        target_commitish: string;
        tag_name: string;
      }) => {
        calls.create++;
        release = {
          id: 1,
          tag_name: input.tag_name,
          target_commitish: input.target_commitish,
          draft: true,
          prerelease: true,
          assets: [],
          upload_url:
            "https://uploads.github.com/repos/Sefaria/sefaria-frontend-toolkit/releases/1/assets",
          html_url:
            "https://github.com/Sefaria/sefaria-frontend-toolkit/releases/tag/v0.1.0-alpha.0",
        };
        return { data: structuredClone(release) };
      },
      uploadReleaseAsset: async ({
        name,
        data,
      }: {
        name: string;
        data: Buffer;
      }) => {
        calls.upload++;
        const id = bytes.size + 1;
        bytes.set(id, Buffer.from(data));
        release!.assets.push({ id, name, size: data.length });
        return { data: {} };
      },
      getReleaseAsset: async ({ asset_id }: { asset_id: number }) => ({
        data: bytes.get(asset_id)!,
      }),
      getRelease: async () => ({ data: structuredClone(release) }),
      updateRelease: async () => {
        calls.finalize++;
        release!.draft = false;
        tag = source;
        return { data: structuredClone(release) };
      },
    },
  };
  return {
    api,
    bytes,
    calls,
    get release() {
      return release!;
    },
    setTag: (sha: string) => {
      tag = sha;
    },
  };
}

function registry(
  captured: ReturnType<typeof fixture>,
  published: Set<string>,
) {
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    expect(init?.headers ?? {}).not.toHaveProperty("Authorization");
    expect(init?.signal).toBeDefined();
    const text = String(url);
    const entry = captured.manifest.packages.find(
      (entry) =>
        text.includes(entry.name.replace("/", "%2F")) ||
        text.includes(`/${entry.name}/`),
    );
    if (!entry) throw new Error(`Unexpected URL ${url}`);
    if (!published.has(entry.name))
      return new Response('{"error":"Not found"}', { status: 404 });
    if (text.endsWith(".tgz"))
      return new Response(captured.assets.get(entry.filename));
    return Response.json({
      name: entry.name,
      version,
      dependencies: entry.dependencies,
      repository: {
        url: "git+https://github.com/Sefaria/sefaria-frontend-toolkit.git",
      },
      dist: {
        integrity: entry.integrity,
        tarball: `https://registry.npmjs.org/${entry.name}/-/${entry.filename.replace(/^sefaria-/, "")}`,
      },
    });
  });
}

describe("qualified draft npm asset handoff", () => {
  it("stops the maintainer script immediately after each failing native command", () => {
    const commands = maintainerCommands(fixture().manifest);
    expect(commands.match(/if \(\$LASTEXITCODE -ne 0\)/g)).toHaveLength(5);
    expect(commands).toContain("--ignore-scripts");
  });

  it("qualifies all exact CDN module paths and fails closed on hosted inconsistencies", async () => {
    const { manifest } = fixture();
    const bytes = Buffer.from("realistic bounded module or notice");
    for (const entry of manifest.packages)
      for (const file of Object.keys(entry.browserFiles))
        entry.browserFiles[file] = digests(bytes).sha256;
    for (const host of ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"]) {
      const urls = cdnUrls(manifest, host);
      expect(Object.keys(urls)).toHaveLength(3);
      for (const [index, definition] of PACKAGE_DEFINITIONS.entries())
        expect(urls[definition.browserFile]).toBe(
          `${host}/${manifest.packages[index].name}@${version}/dist/browser/${definition.browserFile}`,
        );
      const fetch = vi.fn(
        async () =>
          new Response(bytes, {
            headers: {
              "access-control-allow-origin": "*",
              "content-type": "text/javascript; charset=utf-8",
            },
          }),
      );
      expect((await verifyCdnFiles(manifest, host, { fetch })).files.size).toBe(
        9,
      );
      expect(fetch).toHaveBeenCalledTimes(9);
    }
    expect(() => cdnUrls(manifest, "https://example.org")).toThrow(
      "Only exact",
    );
    for (const [body, headers, status, message] of [
      [
        "altered",
        {
          "access-control-allow-origin": "*",
          "content-type": "text/javascript",
        },
        200,
        "bytes differ",
      ],
      [
        bytes,
        { "access-control-allow-origin": "*", "content-type": "text/html" },
        200,
        "MIME",
      ],
      [bytes, { "content-type": "text/javascript" }, 200, "CORS"],
      [bytes, {}, 404, "404"],
    ] as const)
      await expect(
        verifyCdnFiles(manifest, "https://unpkg.com", {
          fetch: async () => new Response(body, { headers, status }),
        }),
      ).rejects.toThrow(message);
    const failure = new DOMException("Cancelled", "AbortError");
    await expect(
      verifyCdnFiles(manifest, "https://unpkg.com", {
        fetch: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
  });

  it("rejects conflicting metadata and tarball bytes before publishing any package", async () => {
    const captured = fixture();
    const published = new Set(
      captured.manifest.packages.map((entry) => entry.name),
    );
    for (const mutation of ["integrity", "dependencies", "bytes", "shape"]) {
      const original = registry(captured, published);
      const fetch = async (url: string | URL, init?: RequestInit) => {
        const response = await original(url, init);
        if (String(url).endsWith(".tgz"))
          return mutation === "bytes" ? new Response("tampered") : response;
        const record = await response.json();
        if (mutation === "integrity") record.dist.integrity = "sha512-conflict";
        if (mutation === "dependencies")
          record.dependencies = { unexpected: "1.0.0" };
        if (mutation === "shape") record.dist.tarball = 42;
        return Response.json(record);
      };
      const publish = vi.fn();
      await expect(
        publishCaptured({
          ...captured,
          directory: "unused",
          resume: true,
          fetch,
          publish,
        }),
      ).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
    }
  });
  it("round-trips all package bytes and repeats preparation without replacing assets", async () => {
    const captured = fixture();
    const server = github();
    const release = await uploadDraft(server.api, captured);
    expect(release.draft).toBe(true);
    expect(server.calls).toEqual({ create: 1, upload: 6, finalize: 0 });
    await uploadDraft(server.api, captured);
    expect(server.calls).toEqual({ create: 1, upload: 6, finalize: 0 });
    const directory = await mkdtemp(
      path.join(tmpdir(), "sefaria-draft-roundtrip-"),
    );
    try {
      const downloaded = await captureDraft(server.api, {
        version,
        source,
        directory,
      });
      for (const [name, bytes] of captured.assets)
        expect(await readFile(path.join(directory, name))).toEqual(bytes);
      expect(downloaded.manifest).toEqual(captured.manifest);
      await expect(
        readHandoff(directory, { version, source }),
      ).resolves.toMatchObject({ manifest: captured.manifest });
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("completes only missing assets in an incomplete matching draft", async () => {
    const captured = fixture();
    const server = github();
    await uploadDraft(server.api, captured);
    server.release.assets.pop();
    await uploadDraft(server.api, captured);
    expect(server.calls.upload).toBe(7);
    expect(server.calls.create).toBe(1);
  });

  it.each([
    "missing",
    "duplicate",
    "tampered",
    "source-archive",
    "wrong-source",
    "wrong-tag",
  ])(
    "fails closed on %s assets/identity without overwrite",
    async (mutation) => {
      const captured = fixture();
      const server = github();
      await uploadDraft(server.api, captured);
      if (mutation === "missing") server.release.assets.pop();
      if (mutation === "duplicate")
        server.release.assets.push(server.release.assets[0]);
      if (mutation === "tampered")
        server.bytes.set(
          server.release.assets[0].id,
          Buffer.from("altered bytes"),
        );
      if (mutation === "source-archive")
        server.release.assets[0].name = "source.tar.gz";
      if (mutation === "wrong-source")
        server.release.target_commitish = "c".repeat(40);
      if (mutation === "wrong-tag") server.setTag("c".repeat(40));
      const directory = await mkdtemp(
        path.join(tmpdir(), "sefaria-invalid-capture-"),
      );
      try {
        await expect(
          captureDraft(server.api, { version, source, directory }),
        ).rejects.toThrow();
        expect(server.calls).toEqual({ create: 1, upload: 6, finalize: 0 });
      } finally {
        await rm(directory, { force: true, recursive: true });
      }
    },
  );

  it("rejects existing conflicting bytes before any draft uploads", async () => {
    const captured = fixture();
    const server = github();
    await uploadDraft(server.api, captured);
    server.bytes.set(server.release.assets[1].id, Buffer.from("bad"));
    await expect(uploadDraft(server.api, captured)).rejects.toThrow();
    expect(server.calls.upload).toBe(6);
  });

  it("keeps the draft and exact assets on partial publication then explicitly resumes", async () => {
    const captured = fixture();
    const server = github();
    await uploadDraft(server.api, captured);
    const published = new Set<string>();
    const fetch = registry(captured, published);
    const publish = vi.fn(async (entry: { name: string }) => {
      if (entry.name === "@sefaria/text-transform")
        throw new Error("2FA interruption");
      published.add(entry.name);
    });
    await expect(
      publishCaptured({ ...captured, directory: "unused", fetch, publish }),
    ).rejects.toThrow("2FA interruption");
    expect([...published]).toEqual(["@sefaria/api-client"]);
    expect(server.release.draft).toBe(true);
    expect(server.calls.finalize).toBe(0);
    await expect(
      publishCaptured({ ...captured, directory: "unused", fetch, publish }),
    ).rejects.toThrow("explicit");
    const resumed = vi.fn(async (entry: { name: string }) => {
      published.add(entry.name);
    });
    await publishCaptured({
      ...captured,
      directory: "unused",
      fetch,
      publish: resumed,
      resume: true,
    });
    expect(resumed.mock.calls.map(([entry]) => entry.name)).toEqual([
      "@sefaria/text-transform",
      "@sefaria/web-components",
    ]);
    expect(server.calls.finalize).toBe(0);
  });

  it("preflights all existing records before performing irreversible publication", async () => {
    const captured = fixture();
    const publish = vi.fn();
    const fetch = vi.fn(async () => new Response("forbidden", { status: 403 }));
    await expect(
      publishCaptured({
        ...captured,
        directory: "unused",
        fetch,
        publish,
        resume: true,
      }),
    ).rejects.toThrow("403");
    expect(publish).not.toHaveBeenCalled();
    const failure = new Error("Network unavailable");
    await expect(
      npmRecord(captured.manifest.packages[0], captured.manifest, {
        fetch: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
  });

  it("does not finalize until complete npm and anonymous consumer verification succeed", async () => {
    const captured = fixture();
    const server = github();
    await uploadDraft(server.api, captured);
    const consumer = vi.fn();
    await expect(
      finalizeDraft(server.api, captured, {
        verify: async () => {
          throw new Error("Incomplete npm release");
        },
        consumer,
      }),
    ).rejects.toThrow("Incomplete");
    expect(consumer).not.toHaveBeenCalled();
    expect(server.calls.finalize).toBe(0);
    await expect(
      finalizeDraft(server.api, captured, {
        verify: async () => {},
        consumer: async () => {
          throw new Error("Anonymous import failed");
        },
      }),
    ).rejects.toThrow("Anonymous");
    expect(server.calls.finalize).toBe(0);
    const finalized = await finalizeDraft(server.api, captured, {
      verify: async () => {},
      consumer,
    });
    expect(finalized.draft).toBe(false);
    expect(finalized.prerelease).toBe(true);
    await finalizeDraft(server.api, captured, {
      verify: async () => {},
      consumer,
    });
    expect(server.calls.finalize).toBe(1);
  });

  it("validates bounded JSON paths and exact dependency/browser inventories", () => {
    const captured = fixture();
    for (const value of [
      { ...captured.manifest, unexpected: true },
      { ...captured.manifest, packages: captured.manifest.packages.slice(1) },
      { ...captured.manifest, source: "main" },
      { ...captured.manifest, tag: "latest" },
      {
        ...captured.manifest,
        packages: [...captured.manifest.packages].reverse(),
      },
    ])
      expect(() => validateManifest(value)).toThrow();
    expect(() => handoffAssets(captured.manifest, new Map())).toThrow(
      "Missing",
    );
    const commands = maintainerCommands(captured.manifest);
    expect(commands).toContain(`gh release download v${version}`);
    expect(commands).toContain("Get-FileHash");
    expect(commands.match(/^npm publish/gm)).toHaveLength(3);
    expect(commands).not.toMatch(
      /npm pack|pnpm build|NODE_AUTH_TOKEN|npm.pkg.github.com/,
    );
  });

  it("checks local handoff auxiliaries rather than trusting source archive names", async () => {
    const captured = fixture();
    const directory = await mkdtemp(
      path.join(tmpdir(), "sefaria-invalid-assets-"),
    );
    try {
      for (const [name, bytes] of captured.assets)
        await writeFile(path.join(directory, name), bytes);
      await writeFile(
        path.join(directory, "MAINTAINER-COMMANDS.ps1"),
        "npm publish malicious",
      );
      await expect(readHandoff(directory)).rejects.toThrow("conflict");
      await writeFile(
        path.join(directory, "MAINTAINER-COMMANDS.ps1"),
        captured.assets.get("MAINTAINER-COMMANDS.ps1")!,
      );
      await writeFile(path.join(directory, "source.zip"), "not a package");
      await expect(readHandoff(directory)).rejects.toThrow("inventory");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("requires exact main caller OIDC and rejects permanent token fallback", () => {
    const environment = {
      GITHUB_REPOSITORY: "Sefaria/sefaria-frontend-toolkit",
      GITHUB_REF: "refs/heads/main",
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_WORKFLOW_REF:
        "Sefaria/sefaria-frontend-toolkit/.github/workflows/release-npm.yml@refs/heads/main",
      ACTIONS_ID_TOKEN_REQUEST_URL: "https://example.invalid/token",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "ephemeral-test",
    };
    expect(() => requireOidcEnvironment(environment)).not.toThrow();
    for (const mutation of [
      { GITHUB_REF: "refs/heads/feature" },
      { GITHUB_EVENT_NAME: "push" },
      { GITHUB_WORKFLOW_REF: "wrong.yml" },
      { ACTIONS_ID_TOKEN_REQUEST_URL: "" },
      { NODE_AUTH_TOKEN: "forbidden" },
      { NPM_TOKEN: "forbidden" },
    ])
      expect(() =>
        requireOidcEnvironment({ ...environment, ...mutation }),
      ).toThrow();
  });
});
