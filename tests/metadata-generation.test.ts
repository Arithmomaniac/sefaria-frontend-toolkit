import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

describe("generated public metadata", () => {
  it("describes every registered element without analyzer placeholder events", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(repository, "packages/web-components/custom-elements.json"),
        "utf8",
      ),
    ) as {
      modules: Array<{
        path: string;
        declarations?: Array<{
          tagName?: string;
          description?: string;
          events?: Array<{
            name: string;
            description?: string;
            detail?: string;
            cancelable?: boolean;
          }>;
          members?: Array<{
            name: string;
            readonly?: boolean;
            description?: string;
          }>;
          data?: string;
          empty?: string;
          slots?: unknown[];
          cssParts?: unknown[];
          cssProperties?: Array<{ name: string }>;
        }>;
      }>;
    };
    for (const module of manifest.modules) {
      expect(module.path).toMatch(/^dist\/.+\.js$/u);
    }
    const elements = manifest.modules
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.tagName !== undefined);

    expect(elements.map((element) => element.tagName).sort()).toEqual([
      "sefaria-bilingual-segment",
      "sefaria-connections-panel",
      "sefaria-reader",
      "sefaria-source-card",
      "sefaria-text-segment",
    ]);
    expect(
      elements.flatMap((element) =>
        (element.events ?? []).map((event) => event.name),
      ),
    ).not.toContain("name");
    for (const element of elements) {
      if (element.tagName === "sefaria-reader") {
        expect(element.slots).toEqual([
          {
            name: "toolbar-actions",
            description:
              "Host-owned actions placed after the Reader's built-in toolbar controls.",
          },
        ]);
        expect(element.cssParts).toEqual([
          {
            name: "toolbar",
            description: "Container for compact pane and host action controls.",
          },
          {
            name: "history",
            description: "Back and retained-history controls.",
          },
          {
            name: "source-pane",
            description: "Scrollable source-text pane.",
          },
          {
            name: "connections-pane",
            description: "Scrollable connections pane.",
          },
        ]);
      } else {
        expect(element.slots).toEqual([]);
        expect(element.cssParts).toEqual([]);
      }
      expect(element.cssProperties?.length).toBeGreaterThan(10);
    }
  });

  it("publishes element reference text from source JSDoc", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(repository, "packages/web-components/custom-elements.json"),
        "utf8",
      ),
    ) as {
      modules: Array<{
        declarations?: Array<{
          tagName?: string;
          description?: string;
          events?: Array<{
            name: string;
            description?: string;
            detail?: string;
            cancelable?: boolean;
          }>;
          members?: Array<{
            name: string;
            readonly?: boolean;
            description?: string;
          }>;
          data?: string;
          empty?: string;
        }>;
      }>;
    };
    const byTag = new Map(
      manifest.modules
        .flatMap((module) => module.declarations ?? [])
        .filter((declaration) => declaration.tagName !== undefined)
        .map((declaration) => [declaration.tagName!, declaration]),
    );

    expect(byTag.get("sefaria-text-segment")?.description).toBe(
      "Shows the text of one passage in one selected edition.",
    );
    expect(byTag.get("sefaria-text-segment")?.data).toContain(
      "`data` takes the body of a successful `GET /api/v3/texts/{tref}` response",
    );
    expect(byTag.get("sefaria-reader")?.data).toBeUndefined();
    expect(byTag.get("sefaria-reader")?.empty).toContain(
      "A Reader that has never had `sref` is blank.",
    );

    const readerBack = byTag
      .get("sefaria-reader")
      ?.events?.find((event) => event.name === "sefaria-reader-back");
    expect(readerBack).toMatchObject({
      description:
        "Requests navigation to the previous entry. Call `preventDefault()` to stop the Reader from going back.",
      detail: "`originEntryId`, the entry the Reader was showing",
      cancelable: true,
    });
    expect(
      byTag
        .get("sefaria-text-segment")
        ?.events?.find((event) => event.name === "sefaria-text-segment-error"),
    ).toMatchObject({
      description:
        "Reports a failure while loading or validating data from `sref`.",
      detail:
        "`error` is the original failure. `sref` is the reference that was loading.",
      cancelable: false,
    });
    expect(
      byTag
        .get("sefaria-text-segment")
        ?.members?.find((member) => member.name === "selectedVersion"),
    ).toMatchObject({ readonly: true });
    expect(
      byTag
        .get("sefaria-reader")
        ?.members?.filter((member) => member.readonly)
        .map((member) => member.name)
        .sort(),
    ).toEqual([
      "canGoBack",
      "currentEntryId",
      "historyTruncated",
      "readerError",
      "rootLoading",
      "selectedRef",
      "status",
    ]);
  });

  it("publishes declaration-derived inventory for   all 16 supported subpaths", async () => {
    const inventory = JSON.parse(
      await readFile(
        path.join(repository, "packages/public-exports.json"),
        "utf8",
      ),
    ) as {
      packages: Array<{ exports: Array<{ declarations: string[] }> }>;
    };

    expect(
      inventory.packages.reduce(
        (count, packageEntry) => count + packageEntry.exports.length,
        0,
      ),
    ).toBe(16);
    for (const packageEntry of inventory.packages) {
      for (const exportEntry of packageEntry.exports) {
        expect(exportEntry.declarations.length).toBeGreaterThan(0);
      }
    }
  });
});
