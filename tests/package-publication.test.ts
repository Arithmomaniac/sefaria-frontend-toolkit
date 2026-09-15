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

import {
  PACKAGE_DEFINITIONS,
  createPackagePageUrl,
  createRegistryMetadataUrl,
  createPublishManifest,
  createPublishVersion,
  preflightPublication,
  stagePublishPackages,
  validatePublicationPreflight,
  validatePublishedPackage,
  validateRegistryConsumerLockfile,
} from "../scripts/package-publication.mjs";

const version = "0.0.0-alpha.123456.2";
const repositoryFullName = "Arithmomaniac/sefaria-frontend-toolkit";

describe("private package publication", () => {
  it("derives a unique synchronized version from the run and attempt", () => {
    expect(createPublishVersion("123456", "2")).toBe(version);

    for (const [runId, runAttempt] of [
      ["", "1"],
      ["0", "1"],
      ["123", "0"],
      ["123.4", "1"],
      ["123", "attempt"],
    ]) {
      expect(() => createPublishVersion(runId, runAttempt)).toThrow(
        "positive integer",
      );
    }
  });

  it("creates publish-only manifests with exact internal versions", () => {
    const manifest = createPublishManifest({
      definition: PACKAGE_DEFINITIONS[2],
      sourceManifest: {
        name: "@arithmomaniac/sefaria-web-components",
        version: "0.0.0",
        private: true,
        dependencies: {
          "@arithmomaniac/sefaria-client": "workspace:*",
          "@arithmomaniac/sefaria-text-transform": "workspace:*",
          lit: "^3.3.3",
        },
      },
      version,
    });

    expect(manifest).toMatchObject({
      name: "@arithmomaniac/sefaria-web-components",
      version,
      private: false,
      publishConfig: {
        access: "restricted",
        registry: "https://npm.pkg.github.com",
      },
      dependencies: {
        "@arithmomaniac/sefaria-client": version,
        "@arithmomaniac/sefaria-text-transform": version,
        lit: "^3.3.3",
      },
    });
    expect(manifest.dependencies["@arithmomaniac/sefaria-client"]).not.toBe(
      "workspace:*",
    );
  });

  it("uses separate registry and unauthenticated package-page endpoints", () => {
    expect(createRegistryMetadataUrl("@arithmomaniac/sefaria-client")).toBe(
      "https://npm.pkg.github.com/@arithmomaniac%2Fsefaria-client",
    );
    expect(
      createPackagePageUrl({
        serverUrl: "https://github.com",
        repositoryFullName,
        packageName: "@arithmomaniac/sefaria-client",
      }),
    ).toBe(
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/pkgs/npm/sefaria-client",
    );
  });

  it("stages only publishable package files and leaves source manifests private", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "sefaria-publication-stage-test-"),
    );
    const destination = path.join(root, "publish");
    try {
      await writeFile(path.join(root, "LICENSE"), "license\n");
      for (const definition of PACKAGE_DEFINITIONS) {
        const packageRoot = path.join(root, definition.directory);
        await mkdir(path.join(packageRoot, "dist"), { recursive: true });
        await mkdir(path.join(packageRoot, "src"), { recursive: true });
        await Promise.all([
          writeFile(
            path.join(packageRoot, "package.json"),
            `${JSON.stringify({
              name: definition.name,
              version: "0.0.0",
              private: true,
              files: ["dist", "README.md"],
              dependencies:
                definition.name === "@arithmomaniac/sefaria-web-components"
                  ? {
                      "@arithmomaniac/sefaria-client": "workspace:*",
                      "@arithmomaniac/sefaria-text-transform": "workspace:*",
                    }
                  : {},
            })}\n`,
          ),
          writeFile(path.join(packageRoot, "README.md"), definition.name),
          writeFile(path.join(packageRoot, "dist", "index.js"), "export {};\n"),
          writeFile(path.join(packageRoot, "src", "secret.ts"), "source\n"),
        ]);
        if (definition.customElements) {
          await writeFile(
            path.join(packageRoot, "custom-elements.json"),
            '{"schemaVersion":"2.1.0","modules":[]}\n',
          );
        }
      }

      await stagePublishPackages({
        repository: root,
        destination,
        version,
      });

      for (const definition of PACKAGE_DEFINITIONS) {
        const sourceManifest = JSON.parse(
          await readFile(
            path.join(root, definition.directory, "package.json"),
            "utf8",
          ),
        );
        const stagedRoot = path.join(destination, definition.slug);
        const stagedManifest = JSON.parse(
          await readFile(path.join(stagedRoot, "package.json"), "utf8"),
        );
        const stagedFiles = (await readdir(stagedRoot)).sort();

        expect(sourceManifest.private).toBe(true);
        expect(stagedManifest.version).toBe(version);
        expect(stagedManifest.private).toBe(false);
        expect(stagedFiles).toEqual(
          [
            "LICENSE",
            "README.md",
            ...(definition.customElements ? ["custom-elements.json"] : []),
            "dist",
            "package.json",
          ].sort(),
        );
      }
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("requires private package metadata, repository linkage, and the exact version", () => {
    expect(() =>
      validatePublishedPackage({
        definition: PACKAGE_DEFINITIONS[0],
        registryMetadata: {
          name: "@arithmomaniac/sefaria-client",
          "dist-tags": { alpha: version },
          versions: {
            [version]: {
              name: "@arithmomaniac/sefaria-client",
              version,
              repository: {
                type: "git",
                url: `git+https://github.com/${repositoryFullName}.git`,
              },
            },
          },
        },
        publicStatus: 404,
        repositoryFullName,
        version,
      }),
    ).not.toThrow();

    expect(() =>
      validatePublishedPackage({
        definition: PACKAGE_DEFINITIONS[0],
        registryMetadata: {
          name: "@arithmomaniac/sefaria-client",
          "dist-tags": { alpha: version },
          versions: {
            [version]: {
              name: "@arithmomaniac/sefaria-client",
              version,
              repository: {
                type: "git",
                url: "git+https://github.com/someone/else.git",
              },
            },
          },
        },
        publicStatus: 200,
        repositoryFullName,
        version,
      }),
    ).toThrow("must be private");
  });

  it("requires every existing package record to have a private linked alpha version", () => {
    const packages = PACKAGE_DEFINITIONS.map((definition) => ({
      definition,
      publicStatus: 404,
      registryMetadata: {
        name: definition.name,
        "dist-tags": { alpha: version },
        versions: {
          [version]: {
            name: definition.name,
            version,
            repository: {
              type: "git",
              url: `git+https://github.com/${repositoryFullName}.git`,
            },
            dependencies:
              definition.name === "@arithmomaniac/sefaria-web-components"
                ? {
                    "@arithmomaniac/sefaria-client": version,
                    "@arithmomaniac/sefaria-text-transform": version,
                  }
                : {},
          },
        },
      },
    }));

    expect(
      validatePublicationPreflight({
        packages: packages.map((entry, index) =>
          index === 1
            ? {
                ...entry,
                registryMetadata: {
                  ...entry.registryMetadata,
                  "dist-tags": { alpha: "0.0.0-alpha.123455.1" },
                  versions: {
                    "0.0.0-alpha.123455.1": {
                      ...entry.registryMetadata.versions[version],
                      version: "0.0.0-alpha.123455.1",
                    },
                  },
                },
              }
            : entry,
        ),
        repositoryFullName,
      }),
    ).toEqual([version, "0.0.0-alpha.123455.1", version]);
    expect(() =>
      validatePublicationPreflight({
        packages: packages.map((entry, index) =>
          index === 0 ? { ...entry, publicStatus: 200 } : entry,
        ),
        repositoryFullName,
      }),
    ).toThrow("must be private");
    expect(() =>
      validatePublicationPreflight({
        packages: packages.map((entry, index) =>
          index === 2
            ? { ...entry, registryMetadata: { error: "not found" } }
            : entry,
        ),
        repositoryFullName,
      }),
    ).toThrow("registry metadata is invalid");
  });

  it("authenticates every registry preflight while checking package pages anonymously", async () => {
    const calls: Array<{
      url: string;
      headers: Record<string, string>;
    }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, headers });
      const definition = PACKAGE_DEFINITIONS.find(
        (candidate) =>
          createRegistryMetadataUrl(candidate.name) === url ||
          createPackagePageUrl({
            serverUrl: "https://github.com",
            repositoryFullName,
            packageName: candidate.name,
          }) === url,
      );
      if (definition === undefined) {
        throw new Error(`Unexpected preflight URL ${url}`);
      }
      if (!url.startsWith("https://npm.pkg.github.com/")) {
        return { status: 404 };
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          name: definition.name,
          "dist-tags": { alpha: version },
          versions: {
            [version]: {
              name: definition.name,
              version,
              repository: {
                type: "git",
                url: `git+https://github.com/${repositoryFullName}.git`,
              },
              dependencies:
                definition.name === "@arithmomaniac/sefaria-web-components"
                  ? {
                      "@arithmomaniac/sefaria-client": version,
                      "@arithmomaniac/sefaria-text-transform": version,
                    }
                  : {},
            },
          },
        }),
      };
    }) as typeof fetch;

    try {
      await expect(
        preflightPublication({
          repositoryFullName,
          serverUrl: "https://github.com",
          token: "test-token",
        }),
      ).resolves.toEqual(PACKAGE_DEFINITIONS.map(() => version));
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(PACKAGE_DEFINITIONS.length * 2);
    expect(
      calls
        .filter(({ url }) => url.startsWith("https://npm.pkg.github.com/"))
        .every(({ headers }) => headers.Authorization === "Bearer test-token"),
    ).toBe(true);
    expect(
      calls
        .filter(({ url }) => url.startsWith("https://github.com/"))
        .every(({ headers }) => headers.Authorization === undefined),
    ).toBe(true);
  });

  it("rejects workspace, file, and mismatched registry consumer resolutions", () => {
    const exactDependencies = Object.fromEntries(
      PACKAGE_DEFINITIONS.map((definition) => [definition.name, version]),
    );
    expect(() =>
      validateRegistryConsumerLockfile({
        lockfile: JSON.stringify(exactDependencies),
        version,
      }),
    ).not.toThrow();
    expect(() =>
      validateRegistryConsumerLockfile({
        lockfile: JSON.stringify(
          Object.fromEntries(
            PACKAGE_DEFINITIONS.map((definition) => [
              definition.name,
              {
                specifier: version,
                version: `${version}(lit@3.3.3)`,
              },
            ]),
          ),
        ),
        version,
      }),
    ).not.toThrow();

    for (const invalid of [
      "workspace:*",
      "link:../../packages/client",
      "file:x.tgz",
    ]) {
      expect(() =>
        validateRegistryConsumerLockfile({
          lockfile: JSON.stringify({
            ...exactDependencies,
            "@arithmomaniac/sefaria-client": invalid,
          }),
          version,
        }),
      ).toThrow();
    }
    expect(() =>
      validateRegistryConsumerLockfile({
        lockfile: JSON.stringify({
          ...exactDependencies,
          "@arithmomaniac/sefaria-client": "0.0.0-alpha.123456.1",
        }),
        version,
      }),
    ).toThrow("exact published version");
  });
});
