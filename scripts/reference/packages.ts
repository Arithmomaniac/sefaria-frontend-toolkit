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

const PACKAGE_REFERENCES: Record<string, string> = {
  "@sefaria/api-client": "/reference/client.md",
  "@sefaria/text-transform": "/reference/text-transform.md",
  "@sefaria/web-components": "/reference/components.md",
};

interface PackageManifest {
  readonly description?: string;
  readonly version?: string;
  readonly exports?: Record<string, unknown>;
}

async function packageManifest(name: string): Promise<PackageManifest> {
  const directories: Record<string, string> = {
    "@sefaria/api-client": "client",
    "@sefaria/text-transform": "text-transform",
    "@sefaria/web-components": "web-components",
  };
  const directory = directories[name];
  if (!directory) throw new Error(`Unknown package: ${name}.`);
  return JSON.parse(
    await readFile(
      new URL(`../../packages/${directory}/package.json`, import.meta.url),
      "utf8",
    ),
  ) as PackageManifest;
}

const importPath = (name: string, subpath: string) =>
  subpath === "." ? name : `${name}/${subpath.slice(2)}`;

export async function renderPackagesReference(): Promise<string> {
  const inventory = JSON.parse(await readFile(INVENTORY, "utf8")) as Inventory;
  const manifests = new Map(
    await Promise.all(
      inventory.packages.map(
        async (entry) =>
          [entry.name, await packageManifest(entry.name)] as const,
      ),
    ),
  );
  const names = inventory.packages.map((entry) => entry.name);
  const unknown = names.filter((name) => !PACKAGE_REFERENCES[name]);
  if (unknown.length > 0) {
    throw new Error(`Describe these packages: ${unknown.join(", ")}.`);
  }
  const missingDescriptions = [...manifests]
    .filter(([, manifest]) => !manifest.description?.trim())
    .map(([name]) => name);
  if (missingDescriptions.length > 0) {
    throw new Error(
      `Add package.json descriptions for: ${missingDescriptions.join(", ")}.`,
    );
  }
  const lines: string[] = [
    `The toolkit has ${inventory.packages.length} packages. This page lists each package's import paths and the names each path exports. It's generated from the packages' export maps and type declarations.`,
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
    'import "@sefaria/web-components";',
    "```",
    "",
    "Only the package root registers elements. Element subpaths such as `@sefaria/web-components/source-card`, `@sefaria/web-components/data-source`, and `@sefaria/web-components/reader-session` export types and helpers. Import them alongside the package root, not instead of it.",
    "",
    "The client package root re-exports the generated namespaces, contracts, schemas, validators, errors, validation helpers, and client factory. Import `createSefariaClient` from `@sefaria/api-client` or `@sefaria/api-client/client`. Import focused error and validation helpers from `@sefaria/api-client/errors` and `@sefaria/api-client/validation`.",
    "",
  ];
  for (const entry of inventory.packages) {
    const manifest = manifests.get(entry.name)!;
    lines.push(
      `## \`${entry.name}\``,
      "",
      `${manifest.description} Package manifest version: \`${manifest.version ?? "unknown"}\`. [Reference](${PACKAGE_REFERENCES[entry.name]}).`,
      "",
      "| Import path | Exports |",
      "| --- | --- |",
    );
    for (const item of entry.exports) {
      const declarations =
        entry.name === "@sefaria/api-client" && item.declarations.length > 40
          ? `${item.declarations.length} names; see the [client reference](/reference/client.md)`
          : item.declarations.map((name) => `\`${name}\``).join(", ");
      lines.push(
        `| \`${importPath(entry.name, item.subpath)}\` | ${declarations} |`,
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
