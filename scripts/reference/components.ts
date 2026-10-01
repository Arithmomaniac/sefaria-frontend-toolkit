import { readdir, readFile } from "node:fs/promises";
import { releaseSection, renderPage } from "./release.js";

export const COMPONENTS_PAGE = new URL(
  "../../docs/reference/components.md",
  import.meta.url,
);
const MANIFEST = new URL(
  "../../packages/web-components/custom-elements.json",
  import.meta.url,
);
const CATALOG = new URL("./component-catalog.json", import.meta.url);

interface Member {
  readonly kind: string;
  readonly name: string;
  readonly privacy?: string;
  readonly static?: boolean;
  readonly readonly?: boolean;
  readonly type?: { readonly text: string };
  readonly default?: string;
  readonly description?: string;
  readonly attribute?: string;
}
interface Named {
  readonly name: string;
  readonly description?: string;
  readonly default?: string;
  readonly detail?: string;
  readonly cancelable?: boolean;
}
interface Declaration {
  readonly tagName: string;
  readonly description?: string;
  readonly data?: string;
  readonly empty?: string;
  readonly members: readonly Member[];
  readonly events: readonly Named[];
  readonly slots: readonly Named[];
  readonly cssParts: readonly Named[];
  readonly cssProperties: readonly Named[];
}
interface CatalogEntry {
  readonly name: string;
  readonly howTo: string;
}

const cell = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/gu, " ").trim();
const code = (value: string) => `\`${cell(value)}\``;

export const RESERVED = "Reserved. No component uses it yet.";

/**
 * Returns the `--sefaria-*` tokens whose internal `--_sefaria-*` alias no
 * component stylesheet reads. `tokens.ts` only declares the aliases.
 */
export async function reservedTokens(
  names: readonly string[],
): Promise<ReadonlySet<string>> {
  const usedBy = await tokenUsers(names);
  return new Set(names.filter((name) => usedBy.get(name)!.length === 0));
}

export async function tokenUsers(
  names: readonly string[],
): Promise<ReadonlyMap<string, readonly string[]>> {
  const read = (file: string) =>
    readFile(new URL(file, ELEMENT_SOURCES), "utf8");
  const files = (await readdir(ELEMENT_SOURCES)).filter((file) =>
    file.endsWith("-element.ts"),
  );
  // An element's styles include shared styles from the local modules it imports.
  const sources = await Promise.all(
    files
      .filter((file) => file !== "sefaria-element.ts")
      .map(async (file) => {
        const own = await read(file);
        const imports = [...own.matchAll(/from\s+"\.\/([^"]+)\.js"/gu)]
          .map((match) => `${match[1]}.ts`)
          .filter((name) => name !== "tokens.ts");
        const imported = await Promise.all(
          imports.map((name) => read(name).catch(() => "")),
        );
        return { file, source: [own, ...imported].join("\n") };
      }),
  );
  return new Map(
    names.map((name) => {
      const alias = new RegExp(
        `var\\(\\s*${name.replace("--sefaria-", "--_sefaria-")}\\s*[,)]`,
        "u",
      );
      return [
        name,
        sources
          .filter(({ source }) => alias.test(source))
          .map(({ file }) => `sefaria-${file.replace(/-element\.ts$/u, "")}`),
      ];
    }),
  );
}

const ELEMENT_SOURCES = new URL(
  "../../packages/web-components/src/",
  import.meta.url,
);

export async function renderComponentsReference(): Promise<string> {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as {
    modules: { declarations: Declaration[] }[];
  };
  const catalog = JSON.parse(await readFile(CATALOG, "utf8")) as Record<
    string,
    CatalogEntry
  >;
  const declarations = manifest.modules
    .flatMap((module) => module.declarations)
    .sort(
      (a, b) =>
        Object.keys(catalog).indexOf(a.tagName) -
        Object.keys(catalog).indexOf(b.tagName),
    );
  const tags = declarations.map((declaration) => declaration.tagName);
  const reserved = await reservedTokens(
    declarations[0]!.cssProperties.map((property) => property.name),
  );
  const usedBy = await tokenUsers(
    declarations[0]!.cssProperties.map((property) => property.name),
  );
  const missing = tags.filter((tag) => !catalog[tag]);
  const unknown = Object.keys(catalog).filter((tag) => !tags.includes(tag));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `component-catalog.json must describe every element once. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
    );
  }
  for (const declaration of declarations) {
    const missingText = [];
    if (!declaration.description) missingText.push("summary");
    if (!declaration.empty) missingText.push("empty");
    if (
      [
        "sefaria-text-segment",
        "sefaria-bilingual-segment",
        "sefaria-source-card",
      ].includes(declaration.tagName) &&
      !declaration.data
    ) {
      missingText.push("data");
    }
    for (const event of declaration.events) {
      if (!event.description) missingText.push(`${event.name} description`);
      if (!event.detail) missingText.push(`${event.name} detail`);
    }
    if (missingText.length > 0) {
      throw new Error(
        `${declaration.tagName} is missing reference text: ${missingText.join(", ")}.`,
      );
    }
  }

  const lines: string[] = [
    `This page lists the attributes, properties, data, empty states, events, and style settings of the toolkit's ${["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][declarations.length] ?? declarations.length} elements. The generator builds it from the package's \`custom-elements.json\`.`,
    "",
    'The elements are registered when you load the script tag or when you import the package root with `import "@arithmomaniac/sefaria-web-components";`. The element subpaths, such as `@arithmomaniac/sefaria-web-components/source-card`, don\'t register their element. They export types and a few helpers.',
    "",
    releaseSection(),
    "",
    "## Elements",
    "",
    ...declarations.map(
      (declaration) =>
        `- [${catalog[declaration.tagName]!.name}](#${declaration.tagName}): \`<${declaration.tagName}>\``,
    ),
    "",
  ];
  for (const declaration of declarations) {
    const entry = catalog[declaration.tagName]!;
    const fields = declaration.members.filter(
      (member) =>
        member.kind === "field" &&
        member.privacy !== "private" &&
        member.privacy !== "protected" &&
        !member.static,
    );
    lines.push(
      `<a id="${declaration.tagName}"></a>`,
      "",
      `## ${entry.name}`,
      "",
      `\`<${declaration.tagName}>\`. ${declaration.description} [How to use it](${entry.howTo}).`,
      "",
      "### Attributes and properties",
      "",
      "Set an attribute in HTML or a property in JavaScript. If a property has no attribute, set it in JavaScript.",
      "",
      "| Property | Attribute | Type | Default | Description |",
      "| --- | --- | --- | --- | --- |",
      ...fields.map(
        (member) =>
          `| ${code(member.name)} | ${member.attribute ? code(member.attribute) : "—"} | ${code(member.type?.text ?? "unknown")} | ${member.default ? code(member.default) : "—"} | ${cell(`${member.readonly ? "Read-only. " : ""}${member.description ?? ""}`)} |`,
      ),
      "",
      "### Data",
      "",
      declaration.data ??
        'It has no `data` property. To give it local data, set `source` to `{ kind: "custom", loader }`, where the custom loader\'s `getText` and `getLinks` functions answer from your data. See [Give components your own data](/data-and-text-tools/give-components-your-own-data.md#control-loading).',
      "",
      "### Empty state",
      "",
      declaration.empty!,
      "",
    );
    const events = declaration.events;
    lines.push(
      "### Events",
      "",
      events.length === 0
        ? "None."
        : "| Event | Description | Detail | Cancelable |",
      ...(events.length === 0
        ? []
        : [
            "| --- | --- | --- | --- |",
            ...events.map(
              (event) =>
                `| <a id="${event.name}"></a>${code(event.name)} | ${cell(event.description ?? "")} | ${cell(event.detail ?? "")} | ${event.cancelable ? "Yes" : "No"} |`,
            ),
          ]),
      "",
    );
    if (declaration.slots.length > 0) {
      lines.push(
        "### Slots",
        "",
        "| Slot | Description |",
        "| --- | --- |",
        ...declaration.slots.map(
          (slot) =>
            `| ${slot.name ? code(slot.name) : "Default"} | ${cell(slot.description ?? "")} |`,
        ),
        "",
      );
    }
    lines.push(
      "### CSS parts",
      "",
      declaration.cssParts.length === 0
        ? "CSS parts: none."
        : "Style these from your page with `::part(name)`.",
      ...(declaration.cssParts.length === 0
        ? []
        : [
            "",
            "| Part | Description |",
            "| --- | --- |",
            ...declaration.cssParts.map(
              (part) =>
                `| ${code(part.name)} | ${cell(part.description ?? "")} |`,
            ),
          ]),
      "",
    );
  }
  lines.push(
    '<a id="events"></a>',
    "",
    "## Events",
    "",
    "Each element dispatches `CustomEvent`s that bubble and cross shadow roots. Listen for them with `addEventListener` on the element or an ancestor. For a cancelable event, call `preventDefault()` in your listener to stop the element's own action. The element acts after your listener returns.",
    "",
    "Invalid supplied `data` puts an element into its error state. The Reader reports it with `sefaria-reader-error`. The other elements don't dispatch an error event for it.",
    "",
    "[Make components respond to each other](/across-components/make-components-respond-to-each-other.md) shows how to use them.",
    "",
    '<a id="style-settings"></a>',
    "",
    "## Style settings",
    "",
    "The elements share these CSS custom properties. Not every element uses every one. Set them on the element or on any ancestor. [Match your site's look](/across-components/match-your-sites-look.md) shows how.",
    "",
    "| Property | Default | Description | Used by |",
    "| --- | --- | --- | --- |",
    ...declarations[0]!.cssProperties.map(
      (property) =>
        `| ${code(property.name)} | ${code(property.default ?? "")} | ${reserved.has(property.name) ? `${RESERVED} ` : ""}${cell(property.description ?? "")} | ${usedBy.get(property.name)!.map(code).join(", ") || "—"} |`,
    ),
  );
  return renderPage({
    title: "Reference › Components",
    heading: "Components reference",
    description:
      "Attributes, properties, data, empty states, events and style settings for each Sefaria element.",
    body: lines.join("\n"),
  });
}
