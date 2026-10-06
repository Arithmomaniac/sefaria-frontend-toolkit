import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Header } from "tar";
import { describe, expect, it } from "vitest";
import { boundedResponse, inspectNpmTarball } from "../scripts/npm-release.mjs";
import { PACKAGE_DEFINITIONS } from "../scripts/package-publication.mjs";

const definition = PACKAGE_DEFINITIONS[1];
const version = "0.1.0-alpha.0";
const manifest = {
  name: definition.name,
  version,
  private: false,
  publishConfig: {
    registry: "https://registry.npmjs.org",
    access: "public",
  },
  repository: {
    url: "git+https://github.com/Sefaria/sefaria-frontend-toolkit.git",
  },
  exports: {
    ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
  },
};

function entries() {
  return [
    { path: "package/package.json", body: JSON.stringify(manifest) },
    { path: "package/dist/index.js", body: "export {};" },
    { path: "package/dist/index.d.ts", body: "export {};" },
    {
      path: `package/dist/browser/${definition.browserFile}`,
      body: "export {};",
    },
    { path: "package/dist/browser/LICENSE.txt", body: "MIT" },
    { path: "package/dist/browser/THIRD-PARTY-NOTICES.txt", body: "Notices" },
  ];
}

type Entry = {
  path: string;
  body?: string;
  size?: number;
  type?: "File" | "Directory" | "SymbolicLink" | "Link";
  linkpath?: string;
};

async function withTarball(
  contents: Entry[],
  run: (filename: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(tmpdir(), "sefaria-npm-boundary-"));
  try {
    const chunks: Buffer[] = [];
    for (const entry of contents) {
      const body = Buffer.from(entry.body ?? "");
      const header = new Header({
        path: entry.path,
        type: entry.type ?? "File",
        size: entry.size ?? body.length,
        mode: 0o644,
        uid: 0,
        gid: 0,
        mtime: new Date(0),
        linkpath: entry.linkpath,
      });
      header.encode();
      chunks.push(
        header.block!,
        body,
        Buffer.alloc((512 - (body.length % 512)) % 512),
      );
    }
    chunks.push(Buffer.alloc(1024));
    const filename = path.join(directory, "package.tar");
    await writeFile(filename, Buffer.concat(chunks));
    await run(filename);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("npm tarball inspection boundaries", () => {
  it.each([4000, 4001])(
    "accepts at most 4000 entries: %i",
    async (count) => {
      const contents: Entry[] = entries();
      while (contents.length < count)
        contents.push({
          path: `package/dist/extra-${contents.length}.js`,
          body: "export {};",
        });
      await withTarball(contents, async (filename) => {
        const result = inspectNpmTarball(filename, definition, version);
        if (count === 4000)
          await expect(result).resolves.toMatchObject({ dependencies: {} });
        else
          await expect(result).rejects.toThrow(
            "Unsafe, duplicate or oversized npm tarball entry",
          );
      });
    },
    120_000,
  );

  it.each([
    { path: "package/../outside.js" },
    { path: "package/./dist/extra.js" },
    { path: "package\\dist\\extra.js" },
    { path: "/package/dist/extra.js" },
    { path: "other/dist/extra.js" },
    { path: "package/package.json", body: "{}" },
    {
      path: "package/dist/link.js",
      type: "SymbolicLink",
      linkpath: "../../outside.js",
    },
    {
      path: "package/dist/link.js",
      type: "Link",
      linkpath: "package/package.json",
    },
    { path: "package/dist/oversized.js", size: 80_000_001 },
  ] satisfies Entry[])("rejects unsafe entry $path ($type)", async (entry) => {
    await withTarball([...entries(), entry], async (filename) => {
      await expect(
        inspectNpmTarball(filename, definition, version),
      ).rejects.toThrow("Unsafe, duplicate or oversized npm tarball entry");
    });
  });
});

describe("hosted response byte limits", () => {
  it.each([undefined, "1", "6"])(
    "checks streamed bytes with Content-Length %s",
    async (length) => {
      for (const [chunks, accepted] of [
        [["abc", "def"], true],
        [["abc", "def", "g"], false],
      ] as const) {
        const response = new Response(
          new ReadableStream({
            start(controller) {
              for (const chunk of chunks)
                controller.enqueue(Buffer.from(chunk));
              controller.close();
            },
          }),
          {
            headers: length === undefined ? {} : { "content-length": length },
          },
        );
        if (accepted)
          await expect(boundedResponse(response, 6)).resolves.toEqual(
            Buffer.from("abcdef"),
          );
        else
          await expect(boundedResponse(response, 6)).rejects.toThrow(
            "Hosted response exceeds size limit",
          );
      }
    },
  );

  it("rejects an oversized advertised length before reading the body", async () => {
    await expect(
      boundedResponse(
        new Response("a", { headers: { "content-length": "7" } }),
        6,
      ),
    ).rejects.toThrow("Hosted response exceeds size limit");
  });

  it("rejects missing bodies", async () => {
    await expect(boundedResponse(new Response(null), 6)).rejects.toThrow(
      "Hosted response has no body",
    );
  });

  it.each([
    new Error("Network failure"),
    new DOMException("Cancelled", "AbortError"),
  ])("preserves original stream failures: %s", async (failure) => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("abc"));
          controller.error(failure);
        },
      }),
    );
    await expect(boundedResponse(response, 6)).rejects.toBe(failure);
  });
});
