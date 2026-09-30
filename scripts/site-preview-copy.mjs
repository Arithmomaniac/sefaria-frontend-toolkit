import { cp, mkdir, rm, rename } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export async function publishSitePreview({
  root,
  siteDirectory = path.join(root, "dist", "site"),
  previewDirectory = path.join(root, "dist", "site-preview"),
  generation = `${Date.now()}-${process.pid}`,
} = {}) {
  const staging = path.join(previewDirectory, `.staging-${generation}`);
  const published = path.join(previewDirectory, generation);
  await mkdir(previewDirectory, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await cp(siteDirectory, staging, { recursive: true });
  await rm(published, { recursive: true, force: true });
  await rename(staging, published);
  return published;
}
