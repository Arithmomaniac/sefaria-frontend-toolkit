import path from "node:path";
import console from "node:console";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import { preview } from "vite";

import { normalizeSiteBasePath } from "./build-site-plan.mjs";
import { publishSitePreview } from "./site-preview-copy.mjs";

export const siteIdentity =
  '<meta name="sefaria-docs-site" content="local-docs-site-wave-3">';

export async function startSitePreview({
  root,
  siteBasePath = "/",
  outputDirectory = path.join(root, "dist", "site"),
}) {
  const base = normalizeSiteBasePath(siteBasePath);
  const server = await preview({
    root,
    configFile: false,
    base,
    cacheDir: path.join(root, "dist", "site-preview-cache"),
    build: {
      outDir: outputDirectory,
    },
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: true,
    },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("The owned site preview did not expose an assigned port.");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  const siteUrl = `${origin}${base}`;

  return {
    origin,
    siteUrl,
    async waitUntilReady() {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        try {
          const response = await globalThis.fetch(siteUrl);
          const html = await response.text();
          if (response.ok && html.includes(siteIdentity)) return;
        } catch {
          // The owned Vite preview is still starting.
        }
        await delay(100);
      }
      throw new Error(
        `The owned preview at ${origin} did not serve the expected site identity.`,
      );
    },
    async close() {
      await server.close();
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const root = path.resolve(import.meta.dirname, "..");
  const published = await publishSitePreview({ root });
  const preview = await startSitePreview({
    root,
    siteBasePath: process.env.SITE_BASE_PATH ?? "/",
    outputDirectory: published,
  });
  console.log(`Preview: ${preview.siteUrl}`);
  await preview.waitUntilReady();
}
