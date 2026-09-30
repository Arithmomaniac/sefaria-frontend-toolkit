import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import console from "node:console";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
for (const file of await markdownFiles(path.join(root, "docs"))) {
  const text = await readFile(file, "utf8");
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (/^###+\s/u.test(line) && line.length > 120) {
      failures.push(
        `${path.relative(root, file)}:${index + 1} has a long heading.`,
      );
    }
  }
}
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}
