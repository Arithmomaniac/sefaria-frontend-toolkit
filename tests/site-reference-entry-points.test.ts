import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadOverlayInputs } from "../packages/client/scripts/generate-openapi.js";
import { renderApiCorrections } from "../scripts/reference/api-corrections.js";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const RELEASE_SENTENCE =
  /documents the current `alpha` build from the `main` branch/u;
const OLDER_PINS = /Older pinned script-tag versions keep their own behavior/u;

describe("R5 corrections to Sefaria's API", () => {
  it("is generated from the overlay and pinned source", async () => {
    expect(await read("docs/reference/api-corrections.md")).toBe(
      await renderApiCorrections(),
    );
  });

  it("states the release it documents and links the versions index", async () => {
    const page = await read("docs/reference/api-corrections.md");
    expect(page).not.toMatch(/^stub: true$/mu);
    expect(page).toMatch(RELEASE_SENTENCE);
    expect(page).toMatch(OLDER_PINS);
    expect(page).toContain("<ReleaseStamp />");
  });

  it("groups corrections by endpoint and covers every correction and guard", async () => {
    const page = await read("docs/reference/api-corrections.md");
    const { overlay } = await loadOverlayInputs();
    expect(page).toMatch(/^## Corrections by endpoint$/mu);
    expect(page).toMatch(/^### `GET \/api\/v3\/texts\/\{tref\}`$/mu);
    for (const guard of overlay["x-sefaria-guards"]) {
      expect(page).toContain(`<a id="${guard.id}"></a>`);
    }
    for (const action of overlay.actions) {
      expect(page).toContain(`\`${action["x-action-id"]}\``);
    }
    const source = JSON.parse(
      await read("packages/client/openapi/source.json"),
    ) as { commit: string };
    expect(page).toContain(source.commit);
  });

  it("follows a correction through later copies of the value it changed", async () => {
    const page = await read("docs/reference/api-corrections.md");
    const section = page.slice(
      page.indexOf('<a id="versions-contract"></a>'),
      page.indexOf('<a id="v3-text-contract"></a>'),
    );
    expect(section).toMatch(/^Endpoints: .*`GET \/api\/texts\/\{tref\}`/mu);
    const linker = page.slice(
      page.indexOf('<a id="linker-detection-contract"></a>'),
    );
    expect(linker).not.toMatch(/^Endpoints: .*\/api\/texts\//mu);
  });
});
