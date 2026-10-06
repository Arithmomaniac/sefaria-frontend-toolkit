import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { log } from "node:console";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  boundedResponse,
  digests,
  readHandoff,
  verifyAnonymousConsumer,
  verifyNpm,
} from "./npm-release.mjs";
import { PACKAGE_DEFINITIONS } from "./package-publication.mjs";
import { testPackageBrowserModules } from "./test-package-browser.mjs";
const { AbortSignal } = globalThis;

export function cdnUrls(manifest, host) {
  if (!["https://cdn.jsdelivr.net/npm", "https://unpkg.com"].includes(host))
    throw new Error("Only exact jsDelivr and UNPKG hosts are supported.");
  return Object.fromEntries(
    PACKAGE_DEFINITIONS.map((definition) => [
      definition.browserFile,
      `${host}/${definition.name}@${manifest.version}/dist/browser/${definition.browserFile}`,
    ]),
  );
}

export async function verifyCdnFiles(
  manifest,
  host,
  { fetch = globalThis.fetch } = {},
) {
  const urls = cdnUrls(manifest, host);
  const files = new Map();
  for (const [index, definition] of PACKAGE_DEFINITIONS.entries()) {
    for (const file of [
      definition.browserFile,
      "LICENSE.txt",
      "THIRD-PARTY-NOTICES.txt",
    ]) {
      const url = `${host}/${definition.name}@${manifest.version}/dist/browser/${file}`;
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok)
        throw new Error(
          `CDN qualification pending/failed: ${url} (${response.status}).`,
        );
      if (response.headers.get("access-control-allow-origin") !== "*")
        throw new Error(`CDN CORS mismatch: ${url}.`);
      if (
        file.endsWith(".js") &&
        !/^(?:text|application)\/javascript(?:;|$)/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        throw new Error(`CDN JavaScript MIME mismatch: ${url}.`);
      const bytes = await boundedResponse(response, 20_000_000);
      if (digests(bytes).sha256 !== manifest.packages[index].browserFiles[file])
        throw new Error(`CDN bytes differ from qualified npm assets: ${url}.`);
      files.set(`${definition.slug}/${file}`, bytes);
    }
  }
  return { urls, files };
}

export async function verifyHostedCdn(captured) {
  await verifyNpm(captured);
  await verifyAnonymousConsumer(captured.manifest);
  const directory = await mkdtemp(path.join(tmpdir(), "sefaria-hosted-cdn-"));
  try {
    for (const host of ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"]) {
      const { files, urls } = await verifyCdnFiles(captured.manifest, host);
      const packages = [];
      for (const definition of PACKAGE_DEFINITIONS) {
        const root = path.join(directory, definition.slug);
        await mkdir(path.join(root, "dist", "browser"), { recursive: true });
        for (const file of [
          definition.browserFile,
          "LICENSE.txt",
          "THIRD-PARTY-NOTICES.txt",
        ])
          await writeFile(
            path.join(root, "dist", "browser", file),
            files.get(`${definition.slug}/${file}`),
          );
        packages.push({ directory: root, browserFile: definition.browserFile });
      }
      await testPackageBrowserModules({
        packages,
        urls,
        live: true,
        fixture: JSON.parse(
          await readFile(
            path.join(
              import.meta.dirname,
              "..",
              "examples",
              "react-vite",
              "src",
              "micah-6-8.json",
            ),
            "utf8",
          ),
        ),
      });
      log(
        `Qualified actual ${host} bytes and all three modules in Chromium, Firefox and WebKit.`,
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (process.argv.length !== 3)
    throw new Error("Provide only the downloaded qualified asset directory.");
  const directory = z.string().min(1).parse(process.argv[2]);
  await verifyHostedCdn(await readHandoff(path.resolve(directory)));
}
