import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function normalizeProxyTarballUrls(lockfile) {
  return lockfile.replace(/^.*tarball:.*$/gmu, (line) => {
    if (!line.includes("https://packagefeedproxy.microsoft.io/npm/")) {
      return line;
    }
    if (line.trimStart().startsWith("tarball:")) {
      return `${line.match(/^\s*/u)?.[0] ?? ""}tarball:`;
    }
    return line.replace(
      /,\s*tarball:\s+https:\/\/packagefeedproxy\.microsoft\.io\/npm\/[^,}\s]+\/-\/[^,}\s]+\.tgz/u,
      "",
    );
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const lockfilePath = path.resolve("pnpm-lock.yaml");
  const original = await readFile(lockfilePath, "utf8");
  const normalized = normalizeProxyTarballUrls(original);
  if (normalized !== original) await writeFile(lockfilePath, normalized);
}
