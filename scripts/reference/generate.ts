import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  API_CORRECTIONS_PAGE,
  renderApiCorrections,
} from "./api-corrections.js";

type Page = { readonly file: URL; readonly render: () => Promise<string> };

export const REFERENCE_PAGES: readonly Page[] = [
  { file: API_CORRECTIONS_PAGE, render: renderApiCorrections },
];

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
  if (stale.length > 0) {
    console.error(
      `Generated reference pages are stale. Run pnpm reference:generate.\n${stale.join("\n")}`,
    );
    process.exitCode = 1;
  }
}

await main(process.argv.includes("--check"));
