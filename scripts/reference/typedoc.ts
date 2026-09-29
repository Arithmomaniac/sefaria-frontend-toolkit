import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

// TypeDoc 0.28 needs the TypeScript 6 compiler API, so it runs from the
// private tests/reference-docs package that pins TypeScript 6.0.3.
const docsPackage = fileURLToPath(
  new URL("../../tests/reference-docs/", import.meta.url),
);
const require = createRequire(path.join(docsPackage, "package.json"));

function typedocBin(): string {
  const manifestPath = require.resolve("typedoc/package.json");
  const manifest = require(manifestPath) as { bin: Record<string, string> };
  return path.join(path.dirname(manifestPath), manifest.bin.typedoc!);
}

/**
 * Removes properties inherited from built-ins such as `Error`, and the
 * "Inherited from" column, from TypeDoc property tables.
 */
function dropInheritedRows(markdown: string): string {
  const output: string[] = [];
  let inherited = false;
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) {
      inherited = false;
      output.push(line);
      continue;
    }
    if (line.endsWith("| Inherited from |")) inherited = true;
    if (!inherited) {
      output.push(line);
      continue;
    }
    const cells = line.slice(1, -1).split(" | ");
    const last = cells.pop()!.trim();
    if (last === "-" || last === "Inherited from" || /^-+$/u.test(last)) {
      output.push(`| ${cells.join(" | ").trim()} |`);
    }
  }
  return output.join("\n");
}

/**
 * Renders one TypeDoc entry point to Markdown and returns its body with
 * headings demoted so that the top level becomes `headingLevel`.
 */
export async function renderTypeDoc(
  entry: string,
  name: string,
  headingLevel = 3,
): Promise<string> {
  const out = await mkdtemp(path.join(tmpdir(), "reference-typedoc-"));
  try {
    await promisify(execFile)(
      process.execPath,
      [
        typedocBin(),
        "--plugin",
        "typedoc-plugin-markdown",
        "--tsconfig",
        path.join(docsPackage, "tsconfig.json"),
        "--entryPoints",
        `entries/${entry}`,
        "--name",
        name,
        "--out",
        out,
        "--readme",
        "none",
        "--router",
        "module",
        "--disableSources",
        "--hidePageHeader",
        "--hideBreadcrumbs",
        "--hidePageTitle",
        "--useCodeBlocks",
        "--parametersFormat",
        "table",
        "--interfacePropertiesFormat",
        "table",
        "--classPropertiesFormat",
        "table",
        "--validation.notExported",
        "false",
        "--logLevel",
        "Error",
      ],
      { cwd: docsPackage, maxBuffer: 16 * 1024 * 1024 },
    );
    const markdown = await readFile(path.join(out, "README.md"), "utf8");
    const shift = headingLevel - 2;
    const cleaned = dropInheritedRows(markdown.replaceAll("\r\n", "\n"))
      // `@see` links to the package README resolve to TypeDoc's _media copy.
      .replaceAll(/\n#{1,6} See\n\n\[[^\]]+\]\(_media\/[^)]+\)\n/gu, "\n")
      .replaceAll(/\| `undefined` \|$/gmu, "| — |");
    // Put functions first: readers look up calls before supporting types.
    const sections = cleaned.split(/\n(?=## )/u);
    const functions = sections.filter((part) =>
      part.startsWith("## Functions"),
    );
    const rest = sections.filter((part) => !part.startsWith("## Functions"));
    return [...functions, ...rest]
      .join("\n")
      .split("\n")
      .map((line) =>
        /^#{1,5} /u.test(line) ? `${"#".repeat(shift)}${line}` : line,
      )
      .join("\n")
      .replaceAll(/\n{3,}/gu, "\n\n")
      .trim();
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}
