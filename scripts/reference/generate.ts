import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildApiLinkCatalog } from "./api-link-catalog.js";
import {
  API_CORRECTIONS_PAGE,
  renderApiCorrections,
} from "./api-corrections.js";
import { CLIENT_PAGE, renderClientReference } from "./client.js";
import { COMPONENTS_PAGE, renderComponentsReference } from "./components.js";
import { PACKAGES_PAGE, renderPackagesReference } from "./packages.js";
import {
  TEXT_TRANSFORM_PAGE,
  renderTextTransformReference,
} from "./text-transform.js";

type Page = { readonly file: URL; readonly render: () => Promise<string> };

export const REFERENCE_PAGES: readonly Page[] = [
  { file: API_CORRECTIONS_PAGE, render: renderApiCorrections },
  { file: CLIENT_PAGE, render: renderClientReference },
  { file: TEXT_TRANSFORM_PAGE, render: renderTextTransformReference },
  { file: COMPONENTS_PAGE, render: renderComponentsReference },
  { file: PACKAGES_PAGE, render: renderPackagesReference },
];

const API_LINK_CATALOG = new URL("./api-link-catalog.json", import.meta.url);

async function main(check: boolean): Promise<void> {
  const { readFile } = await import("node:fs/promises");
  const stale: string[] = [];
  for (const page of REFERENCE_PAGES) {
    const expected = await page.render();
    if (check) {
      const actual = await readFile(page.file, "utf8").catch(() => "");
      if (actual !== expected) stale.push(fileURLToPath(page.file));
    } else {
      await writeFile(page.file, expected);
    }
  }
  const catalog = `${JSON.stringify(await buildApiLinkCatalog(), null, 2)}\n`;
  if (check) {
    const actual = await readFile(API_LINK_CATALOG, "utf8").catch(() => "");
    if (actual !== catalog) stale.push(fileURLToPath(API_LINK_CATALOG));
  } else {
    await writeFile(API_LINK_CATALOG, catalog);
  }
  if (stale.length > 0) {
    console.error(
      `Generated reference pages are stale. Run pnpm reference:generate.\n${stale.join("\n")}`,
    );
    process.exitCode = 1;
  }
}

await main(process.argv.includes("--check"));
