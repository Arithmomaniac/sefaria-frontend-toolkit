import { readFile, readdir, writeFile } from "node:fs/promises";
import release from "../npm-documentation-release.json";

const root = new URL("../../", import.meta.url);
const stamp =
  /<!-- npm-release-version: ([0-9]+\.[0-9]+\.[0-9]+(?:-[\w.-]+)?) -->/u;
const elementsImport =
  /src="https:\/\/cdn\.jsdelivr\.net\/npm\/@sefaria\/web-components@([0-9]+\.[0-9]+\.[0-9]+(?:-[\w.-]+)?)\/dist\/browser\/sefaria-elements\.js"/u;

export function renderNpmDocumentation(
  source: string,
  version: string = release.version,
): string {
  const previous = source.startsWith("<script")
    ? elementsImport.exec(source)?.[1]
    : stamp.exec(source)?.[1];
  if (previous === undefined) {
    throw new Error(
      "Missing npm-release-version stamp or exact elements import.",
    );
  }
  return source.replaceAll(previous, version);
}

export async function npmDocumentationFiles(): Promise<readonly string[]> {
  const snippets = await readdir(new URL("examples/site-snippets/", root));
  return [
    "README.md",
    "packages/client/README.md",
    "packages/text-transform/README.md",
    "packages/web-components/README.md",
    "docs/README.md",
    "docs/index.md",
    "docs/help/install-and-status.md",
    "docs/use-components/start-here.md",
    "docs/use-components/use-with-a-framework.md",
    "docs/data-and-text-tools/start-here.md",
    "docs/.vitepress/theme/README.md",
    "examples/site-snippets/ai-assistant-prompt.md",
    ...snippets
      .filter((file) => file.endsWith(".html"))
      .map((file) => `examples/site-snippets/${file}`),
  ];
}

export async function synchronizeNpmDocumentation(
  check: boolean,
): Promise<readonly string[]> {
  const stale: string[] = [];
  for (const file of await npmDocumentationFiles()) {
    const url = new URL(file, root);
    const source = await readFile(url, "utf8");
    const expected = renderNpmDocumentation(source);
    if (check) {
      if (source !== expected) stale.push(file);
    } else if (source !== expected) {
      await writeFile(url, expected);
    }
  }
  return stale;
}
