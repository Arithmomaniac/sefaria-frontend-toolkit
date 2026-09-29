import { readFile } from "node:fs/promises";
import { releaseSection, renderPage } from "./release.js";

export const PACKAGES_PAGE = new URL(
  "../../docs/reference/package-imports-and-exports.md",
  import.meta.url,
);
const INVENTORY = new URL(
  "../../packages/public-exports.json",
  import.meta.url,
);

interface Inventory {
  readonly packages: readonly {
    readonly name: string;
    readonly exports: readonly {
      readonly subpath: string;
      readonly types: string;
      readonly import: string;
      readonly declarations: readonly string[];
    }[];
  }[];
}

const PACKAGE_NOTES: Record<string, { summary: string; reference: string }> = {
  "@arithmomaniac/sefaria-client": {
    summary:
      "Fetches Sefaria API responses and checks them against the corrected API description.",
    reference: "/reference/client.md",
  },
  "@arithmomaniac/sefaria-text-transform": {
    summary:
      "Makes Sefaria's text HTML safe to display and prepares it for display.",
    reference: "/reference/text-transform.md",
  },
  "@arithmomaniac/sefaria-web-components": {
    summary: "The Sefaria elements, such as Source Card and Reader.",
    reference: "/reference/components.md",
  },
};

const ELEMENT_SUBPATHS = new Set([
  "./bilingual-segment",
  "./connections-panel",
  "./reader",
  "./ref-label",
  "./source-card",
  "./text-segment",
]);

const importPath = (name: string, subpath: string) =>
  subpath === "." ? name : `${name}/${subpath.slice(2)}`;

export async function renderPackagesReference(): Promise<string> {
  const inventory = JSON.parse(await readFile(INVENTORY, "utf8")) as Inventory;
  const names = inventory.packages.map((entry) => entry.name);
  const unknown = names.filter((name) => !PACKAGE_NOTES[name]);
  if (unknown.length > 0) {
    throw new Error(`Describe these packages: ${unknown.join(", ")}.`);
  }
  const lines: string[] = [
    `The toolkit has ${inventory.packages.length} packages. This page lists each package's import paths and the names each path exports. It's generated from the packages' export maps and built type declarations, through \`packages/public-exports.json\`.`,
    "",
    "Each package ships its own TypeScript types. To choose between the script tag and the packages, or to install a package, see [Install and status](/help/install-and-status.md).",
    "",
    releaseSection(),
    "",
    '<a id="register-the-elements"></a>',
    "",
    "## Register the elements",
    "",
    "Import the web components package root once to register all the elements:",
    "",
    "```js",
    'import "@arithmomaniac/sefaria-web-components";',
    "```",
    "",
    "The element subpaths, such as `@arithmomaniac/sefaria-web-components/source-card`, don't register their element. They export types, plus a few helpers for the Connections Panel and Reader. Import them alongside the package root, not instead of it.",
    "",
  ];
  for (const entry of inventory.packages) {
    const note = PACKAGE_NOTES[entry.name]!;
    lines.push(
      `## \`${entry.name}\``,
      "",
      `${note.summary} [Reference](${note.reference}).`,
      "",
      "| Import path | Exports |",
      "| --- | --- |",
    );
    for (const item of entry.exports) {
      const typesOnly =
        entry.name === "@arithmomaniac/sefaria-web-components" &&
        ELEMENT_SUBPATHS.has(item.subpath)
          ? " (doesn't register the element)"
          : "";
      const declarations =
        entry.name === "@arithmomaniac/sefaria-client" &&
        item.declarations.length > 40
          ? `${item.declarations.length} names, including the generated types, schemas and validators listed in the [client reference](/reference/client.md)`
          : item.declarations.map((name) => `\`${name}\``).join(", ");
      lines.push(
        `| \`${importPath(entry.name, item.subpath)}\`${typesOnly} | ${declarations} |`,
      );
    }
    lines.push("");
  }
  lines.push(
    "## Where to go next",
    "",
    "- [Install and status](/help/install-and-status.md) explains how to install the packages.",
    "- [Use with a framework](/use-components/use-with-a-framework.md) shows the package import in a build.",
  );
  return renderPage({
    title: "Reference › Package imports and exports",
    heading: "Package imports and exports",
    description:
      "The import paths of each toolkit package and the names each path exports.",
    body: lines.join("\n"),
  });
}
