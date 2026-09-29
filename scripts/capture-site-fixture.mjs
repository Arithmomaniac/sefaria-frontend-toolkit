import { writeFile } from "node:fs/promises";
import path from "node:path";

import { format } from "prettier";

import { validateGetV3Texts200 } from "../packages/client/dist/index.js";

const url =
  "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?return_format=default&version=primary&version=translation";
const response = await globalThis.fetch(url);
if (!response.ok) throw new Error(`Sefaria returned HTTP ${response.status}.`);
const payload = await response.json();
if (!validateGetV3Texts200(payload)) {
  throw new Error("The captured response failed the client's validator.");
}
const capturedAt = new Date().toISOString();
const target = path.resolve(
  import.meta.dirname,
  "..",
  "tests",
  "site-fixtures",
  `micah-6-8-${capturedAt.slice(0, 10)}.json`,
);
await writeFile(
  target,
  await format(JSON.stringify({ url, capturedAt, payload }), {
    parser: "json",
  }),
);
globalThis.console.log(`Captured ${url} to ${target}.`);
