import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import {
  canReuseSiteBuild,
  writeSiteBuildKey,
} from "../scripts/build-site-cache.mjs";
import { publishSitePreview } from "../scripts/site-preview-copy.mjs";

it("reuses a site build only for an exact key and complete output", async () => {
  const site = path.join(".artifacts", `site-cache-${crypto.randomUUID()}`);
  await mkdir(site, { recursive: true });
  await writeFile(path.join(site, "index.html"), "<html></html>");
  const key = { head: "abc", inputs: "def", siteBasePath: "/", options: {} };
  await writeSiteBuildKey(site, key);

  await expect(
    canReuseSiteBuild({
      siteDirectory: site,
      requiredFiles: ["index.html"],
      expectedKey: key,
    }),
  ).resolves.toBe(true);
  await expect(
    canReuseSiteBuild({
      siteDirectory: site,
      requiredFiles: ["missing.html"],
      expectedKey: key,
    }),
  ).resolves.toBe(false);
  await expect(
    canReuseSiteBuild({
      siteDirectory: site,
      requiredFiles: ["index.html"],
      expectedKey: { ...key, head: "other" },
    }),
  ).resolves.toBe(false);
});

it("copies preview output outside the build directory atomically", async () => {
  const root = path.join(".artifacts", `site-preview-${crypto.randomUUID()}`);
  const site = path.join(root, "dist", "site");
  await mkdir(site, { recursive: true });
  await writeFile(path.join(site, "index.html"), "first");

  const published = await publishSitePreview({ root, generation: "one" });
  await writeFile(path.join(site, "index.html"), "second");

  await expect(
    import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(published, "index.html"), "utf8"),
    ),
  ).resolves.toBe("first");
});
