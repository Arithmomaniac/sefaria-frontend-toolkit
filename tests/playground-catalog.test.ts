import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createProjectCatalog,
  selectProject,
} from "../examples/playground/src/project-catalog.js";
import { PUBLIC_ENTRIES } from "../examples/playground/scripts/runtime-entries.mjs";

const root = path.resolve(import.meta.dirname, "..");
const expectedIds = [
  "ref-label",
  "text-segment",
  "bilingual-segment",
  "source-card",
  "popup",
  "connections-panel",
  "reader",
] as const;
const expectedEntries = [
  "@arithmomaniac/sefaria-client",
  "@arithmomaniac/sefaria-client/validation",
  "@arithmomaniac/sefaria-web-components",
  "@arithmomaniac/sefaria-web-components/acquisition",
  "@arithmomaniac/sefaria-web-components/bilingual-segment",
  "@arithmomaniac/sefaria-web-components/connections-panel",
  "@arithmomaniac/sefaria-web-components/popup",
  "@arithmomaniac/sefaria-web-components/reader",
  "@arithmomaniac/sefaria-web-components/reader-session",
  "@arithmomaniac/sefaria-web-components/ref-label",
  "@arithmomaniac/sefaria-web-components/source-card",
  "@arithmomaniac/sefaria-web-components/text-segment",
] as const;

describe("playground project catalog", () => {
  it("loads exactly the seven maintained projects from real manifests and files", () => {
    const manifests = Object.fromEntries(
      expectedIds.map((id) => [
        `../projects/${id}/project.json`,
        JSON.parse(
          readFileSync(
            path.join(
              root,
              "examples",
              "playground",
              "projects",
              id,
              "project.json",
            ),
            "utf8",
          ),
        ),
      ]),
    );
    const files: Record<string, string> = {};
    for (const id of expectedIds) {
      const manifest = manifests[`../projects/${id}/project.json`] as {
        files: Record<string, string>;
        assets: { specifier: string; path: string }[];
      };
      for (const file of Object.values(manifest.files)) {
        const key = `../projects/${id}/${file}`;
        files[key] = readFileSync(
          path.join(root, "examples", "playground", "projects", id, file),
          "utf8",
        );
      }
      for (const asset of manifest.assets) {
        const resolved = path.posix.normalize(
          `../projects/${id}/${asset.path}`,
        );
        files[resolved] = readFileSync(
          path.resolve(
            root,
            "examples",
            "playground",
            "projects",
            id,
            asset.path,
          ),
          "utf8",
        );
      }
    }

    const catalog = createProjectCatalog(manifests, files);

    expect(catalog.projects.map(({ manifest }) => manifest.id)).toEqual(
      expectedIds,
    );
    for (const project of catalog.projects) {
      expect(project.maintained.html).not.toHaveLength(0);
      expect(project.maintained.css).not.toHaveLength(0);
      expect(project.maintained.javascript).not.toHaveLength(0);
      expect(project.manifest.sourceBaseUrl).toMatch(
        /^https:\/\/github\.com\/Arithmomaniac\/sefaria-frontend-toolkit\/blob\/main\//u,
      );
    }
  });

  it("selects the documented default only when the query is missing", () => {
    const catalog = createProjectCatalog(
      Object.fromEntries(
        expectedIds.map((id) => [
          `../projects/${id}/project.json`,
          manifest(id),
        ]),
      ),
      filesFor(...expectedIds),
    );

    expect(selectProject(catalog, "")).toMatchObject({
      state: "selected",
      project: { manifest: { id: "source-card" } },
    });
    expect(selectProject(catalog, "?project=popup")).toMatchObject({
      state: "selected",
      project: { manifest: { id: "popup" } },
    });
    expect(selectProject(catalog, "?project=unknown")).toEqual({
      state: "invalid",
      requestedId: "unknown",
    });
  });

  it("rejects duplicate IDs, missing files, and undeclared source kinds", () => {
    expect(() =>
      createProjectCatalog(
        {
          "../projects/first/project.json": manifest("source-card"),
          "../projects/second/project.json": manifest("source-card"),
        },
        filesFor("first", "second"),
      ),
    ).toThrow("Duplicate playground project ID source-card");

    expect(() =>
      createProjectCatalog(
        { "../projects/source-card/project.json": manifest("source-card") },
        {
          "../projects/source-card/index.html": "<p>Only HTML</p>",
        },
      ),
    ).toThrow("Missing playground project file");

    expect(() =>
      createProjectCatalog(
        {
          "../projects/source-card/project.json": {
            ...manifest("source-card"),
            files: {
              ...manifest("source-card").files,
              typescript: "main.ts",
            },
          },
        },
        filesFor("source-card"),
      ),
    ).toThrow("exactly html, css, and javascript");

    expect(() =>
      createProjectCatalog(
        {
          "../projects/source-card/project.json": {
            ...manifest("source-card"),
            assets: [
              { specifier: "./payload.js", path: "payload.js" },
              { specifier: "./payload.js", path: "other.js" },
            ],
          },
        },
        filesFor("source-card"),
      ),
    ).toThrow("Duplicate playground asset specifier ./payload.js");

    for (const specifier of [
      "__proto__",
      "toString",
      "../payload.js",
      "/payload.js",
      "https://example.test/payload.js",
    ]) {
      expect(() =>
        createProjectCatalog(
          {
            "../projects/source-card/project.json": {
              ...manifest("source-card"),
              assets: [{ specifier, path: "payload.js" }],
            },
          },
          filesFor("source-card"),
        ),
      ).toThrow("invalid asset specifier");
    }
  });
});

describe("playground runtime graph", () => {
  it("allowlists only the public entries required by maintained projects", () => {
    expect(Object.keys(PUBLIC_ENTRIES).sort()).toEqual(
      [...expectedEntries].sort(),
    );
    for (const shim of Object.values(PUBLIC_ENTRIES)) {
      expect(
        existsSync(
          path.join(
            root,
            "examples",
            "playground",
            "src",
            "graph",
            `${shim}.ts`,
          ),
        ),
      ).toBe(true);
    }
  });
});

function manifest(id: string) {
  return {
    id,
    title: id,
    summary: `${id} summary`,
    coverage: `${id} coverage`,
    files: {
      html: "index.html",
      css: "styles.css",
      javascript: "main.js",
    },
    assets: [],
    sourceBaseUrl:
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/playground/projects/source-card/",
  };
}

function filesFor(...directories: string[]): Record<string, string> {
  return Object.fromEntries(
    directories.flatMap((directory) => [
      [`../projects/${directory}/index.html`, "<p>HTML</p>"],
      [`../projects/${directory}/styles.css`, "p { color: black; }"],
      [`../projects/${directory}/main.js`, "export {};"],
    ]),
  );
}
