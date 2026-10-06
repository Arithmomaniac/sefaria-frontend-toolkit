import { readFile } from "node:fs/promises";

const CUSTOM_ELEMENTS = new URL(
  "../../packages/web-components/custom-elements.json",
  import.meta.url,
);
const PUBLIC_EXPORTS = new URL(
  "../../packages/public-exports.json",
  import.meta.url,
);

export interface ApiLinkCatalogEntry {
  readonly name: string;
  readonly href: string;
  readonly source: "components" | "client" | "text-transform" | "packages";
  readonly page: string;
  readonly anchor: string;
}

interface Declaration {
  readonly tagName: string;
  readonly events?: readonly { readonly name: string }[];
}

interface PublicExports {
  readonly packages: readonly {
    readonly name: string;
    readonly exports: readonly {
      readonly subpath: string;
      readonly declarations: readonly string[];
    }[];
  }[];
}

const CLIENT_PACKAGE = "@sefaria/api-client";
const TEXT_TRANSFORM_PACKAGE = "@sefaria/text-transform";
const WEB_COMPONENTS_PACKAGE = "@sefaria/web-components";
const CLIENT_REFERENCE_NAMES = new Set([
  "calendars",
  "collections",
  "ContractIssue",
  "createSefariaClient",
  "getResponseContract",
  "index",
  "lexicon",
  "misc",
  "ref",
  "related",
  "ResponseSelector",
  "SefariaCacheOptions",
  "SefariaClient",
  "SefariaClientOptions",
  "SefariaContractError",
  "SefariaContractErrorOptions",
  "sheets",
  "term",
  "text",
  "topic",
  "validateExternalResponse",
  "ValidationResult",
]);
const TEXT_TRANSFORM_NAMES = new Set([
  "applyVocalization",
  "applyVocalizationToHtml",
  "createTextPreview",
  "normalizeText",
]);

export async function buildApiLinkCatalog(): Promise<
  readonly ApiLinkCatalogEntry[]
> {
  const entries = new Map<string, ApiLinkCatalogEntry>();
  const add = (entry: ApiLinkCatalogEntry) => {
    if (!entries.has(entry.name)) entries.set(entry.name, entry);
  };

  const manifest = JSON.parse(await readFile(CUSTOM_ELEMENTS, "utf8")) as {
    modules: readonly { readonly declarations: readonly Declaration[] }[];
  };
  for (const declaration of manifest.modules.flatMap(
    (module) => module.declarations,
  )) {
    const tag = declaration.tagName;
    add(componentEntry(`<${tag}>`, tag));
    add(componentEntry(tag, tag));
    for (const event of declaration.events ?? []) {
      add({
        name: event.name,
        href: "/reference/components.md#events",
        source: "components",
        page: "/reference/components.md",
        anchor: "events",
      });
    }
  }

  const inventory = JSON.parse(
    await readFile(PUBLIC_EXPORTS, "utf8"),
  ) as PublicExports;
  for (const packageEntry of inventory.packages) {
    for (const item of packageEntry.exports) {
      add({
        name: importPath(packageEntry.name, item.subpath),
        href: `/reference/package-imports-and-exports.md#${slug(packageEntry.name)}`,
        source: "packages",
        page: "/reference/package-imports-and-exports.md",
        anchor: slug(packageEntry.name),
      });
      for (const declaration of item.declarations) {
        if (
          packageEntry.name === CLIENT_PACKAGE &&
          CLIENT_REFERENCE_NAMES.has(declaration)
        ) {
          add(referenceEntry(declaration, "/reference/client.md", "client"));
        } else if (packageEntry.name === TEXT_TRANSFORM_PACKAGE) {
          add(
            referenceEntry(
              declaration,
              "/reference/text-transform.md",
              "text-transform",
            ),
          );
        } else if (packageEntry.name === WEB_COMPONENTS_PACKAGE) {
          add({
            name: declaration,
            href: `/reference/package-imports-and-exports.md#${slug(packageEntry.name)}`,
            source: "packages",
            page: "/reference/package-imports-and-exports.md",
            anchor: slug(packageEntry.name),
          });
        }
      }
    }
  }

  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function componentEntry(name: string, tag: string): ApiLinkCatalogEntry {
  return {
    name,
    href: `/reference/components.md#${tag}`,
    source: "components",
    page: "/reference/components.md",
    anchor: tag,
  };
}

function referenceEntry(
  name: string,
  page: "/reference/client.md" | "/reference/text-transform.md",
  source: "client" | "text-transform",
): ApiLinkCatalogEntry {
  return {
    name,
    href: `${page}#${slug(`${name}${TEXT_TRANSFORM_NAMES.has(name) || name === "createSefariaClient" ? "" : ""}`)}`,
    source,
    page,
    anchor: slug(name),
  };
}

function importPath(name: string, subpath: string): string {
  return subpath === "." ? name : `${name}/${subpath.slice(2)}`;
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/<|>|`|\(\)/gu, "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .trim()
    .replaceAll(/^-|-$/gu, "");
}
