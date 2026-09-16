import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const packagedApp = path.join(root, "dist", "app", "mcp-app.html");

export default defineConfig({
  base: "./",
  root: path.join(root, "host"),
  plugins: [
    {
      name: "packaged-mcp-app",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "mcp-app.html",
          source: readFileSync(packagedApp, "utf8"),
        });
      },
    },
  ],
  build: {
    outDir: path.join(root, "dist", "host"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.join(root, "host", "index.html"),
        live: path.join(root, "host", "live.html"),
        sandbox: path.join(root, "host", "sandbox.html"),
      },
    },
  },
});
