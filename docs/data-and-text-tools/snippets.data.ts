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

const directory = path.resolve(
  import.meta.dirname,
  "../../examples/site-snippets",
);

export default {
  watch: ["../../examples/site-snippets/*.ts"],
  async load(): Promise<Record<string, SiteSnippet>> {
    const snippets: Record<string, SiteSnippet> = {};
    for (const name of (await readdir(directory)).sort()) {
      if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
      const typescript = (
        await readFile(path.join(directory, name), "utf8")
      ).replaceAll("\r\n", "\n");
      snippets[name.slice(0, -3)] = {
        file: `examples/site-snippets/${name}`,
        typescript,
        javascript: await toJavaScript(typescript),
      };
    }
    return snippets;
  },
};
