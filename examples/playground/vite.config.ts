import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "playground-parent-csp",
      transformIndexHtml(html) {
        const graph = JSON.parse(
          readFileSync(
            path.resolve(import.meta.dirname, "public", "runtime-graph.json"),
            "utf8",
          ),
        ) as { imports: Record<string, string> };
        const importMap = JSON.stringify({ imports: graph.imports }).replaceAll(
          "<",
          "\\u003c",
        );
        const hash = createHash("sha256").update(importMap).digest("base64");
        return html.replace("__PLAYGROUND_IMPORT_MAP_HASH__", hash);
      },
    },
  ],
  build: {
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "index.html"),
    },
  },
});
