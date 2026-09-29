import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { toJavaScript } from "../../scripts/strip-types.mjs";

export interface SiteSnippet {
  file: string;
  typescript: string;
  javascript: string;
}

declare const data: Record<string, SiteSnippet>;
export { data };

const root = path.resolve(import.meta.dirname, "../..");
const directory = path.join(root, "examples", "site-snippets");

// Excerpts of existing examples, marked with `// #region <name>` comments.
const regions = [
  {
    name: "mcp-reader-acquisition",
    file: "examples/mcp-app/src/app.ts",
    region: "reader-acquisition",
  },
  {
    name: "weekly-portion-calendar-call",
    file: "examples/weekly-portion/src/app.ts",
    region: "calendar-call",
  },
];

export function extractRegion(source: string, region: string): string {
  const start = source.indexOf(`// #region ${region}\n`);
  const end = source.indexOf(`// #endregion ${region}`);
  if (start === -1 || end < start) {
    throw new Error(`Missing region ${region}.`);
  }
  return source.slice(start + `// #region ${region}\n`.length, end);
}

async function read(file: string): Promise<string> {
  return (await readFile(path.join(root, file), "utf8")).replaceAll(
    "\r\n",
    "\n",
  );
}

export default {
  watch: [
    "../../examples/site-snippets/*.ts",
    ...regions.map(({ file }) => `../../${file}`),
  ],
  async load(): Promise<Record<string, SiteSnippet>> {
    const snippets: Record<string, SiteSnippet> = {};
    for (const name of (await readdir(directory)).sort()) {
      if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
      const file = `examples/site-snippets/${name}`;
      const typescript = await read(file);
      snippets[name.slice(0, -3)] = {
        file,
        typescript,
        javascript: await toJavaScript(typescript),
      };
    }
    for (const { name, file, region } of regions) {
      const typescript = extractRegion(await read(file), region);
      snippets[name] = {
        file,
        typescript,
        javascript: await toJavaScript(typescript),
      };
    }
    return snippets;
  },
};
