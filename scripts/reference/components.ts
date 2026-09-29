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
  readonly type?: { readonly text: string };
  readonly default?: string;
  readonly description?: string;
  readonly attribute?: string;
}
interface Named {
  readonly name: string;
  readonly description?: string;
  readonly default?: string;
}
interface Declaration {
  readonly tagName: string;
  readonly members: readonly Member[];
  readonly events: readonly Named[];
  readonly slots: readonly Named[];
  readonly cssParts: readonly Named[];
  readonly cssProperties: readonly Named[];
}
interface CatalogEntry {
  readonly name: string;
  readonly howTo: string;
  readonly summary: string;
  readonly data: string;
  readonly empty: string;
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
  const files = (await readdir(ELEMENT_SOURCES)).filter(
    (file) =>
      file.endsWith(".ts") && !file.includes(".test.") && file !== "tokens.ts",
  );
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, ELEMENT_SOURCES), "utf8")),
  );
  return new Set(
    names.filter((name) => {
      const alias = new RegExp(
        `var\\(\\s*${name.replace("--sefaria-", "--_sefaria-")}\\s*[,)]`,
        "u",
      );
      return !sources.some((source) => alias.test(source));
    }),
  );
}

interface EventDetails {
  readonly detail: string;
  readonly cancelable: boolean;
  readonly preventDefault: string;
}

const ELEMENT_SOURCES = new URL(
  "../../packages/web-components/src/",
  import.meta.url,
);

/**
 * Reads the hand-written event catalog and checks each `cancelable` entry
 * against how the element source dispatches that event.
 */
async function loadEventCatalog(
  declarations: readonly Declaration[],
): Promise<Record<string, EventDetails>> {
  const catalog = JSON.parse(
    await readFile(new URL("./event-catalog.json", import.meta.url), "utf8"),
  ) as Record<string, EventDetails>;
  const names = declarations.flatMap((d) => d.events.map((e) => e.name));
  const missing = names.filter((name) => !catalog[name]);
  const unknown = Object.keys(catalog).filter((name) => !names.includes(name));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `event-catalog.json must describe every event once. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
    );
  }
  for (const declaration of declarations) {
    const file = `${declaration.tagName.replace(/^sefaria-/u, "")}-element.ts`;
    const source = await readFile(new URL(file, ELEMENT_SOURCES), "utf8");
    const emitCancelable = /#emit\(name: string[\s\S]*?cancelable: true/u.test(
      source,
    );
    for (const { name } of declaration.events) {
      const viaEmit = source.includes(`#emit("${name}"`);
      const direct = new RegExp(
        `new CustomEvent\\("${name}",\\s*\\{[^}]*?cancelable: true`,
        "u",
      ).test(source);
      const cancelable = (viaEmit && emitCancelable) || direct;
      if (cancelable !== catalog[name]!.cancelable) {
        throw new Error(
          `event-catalog.json says ${name} is ${catalog[name]!.cancelable ? "" : "not "}cancelable, but ${file} disagrees.`,
        );
      }
    }
  }
  return catalog;
}

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
  const events = await loadEventCatalog(declarations);
  const reserved = await reservedTokens(
    declarations[0]!.cssProperties.map((property) => property.name),
  );
  const missing = tags.filter((tag) => !catalog[tag]);
  const unknown = Object.keys(catalog).filter((tag) => !tags.includes(tag));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `component-catalog.json must describe every element once. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
    );
  }

  const lines: string[] = [
    `This page lists the attributes, properties, data, empty states, events, and style settings of the toolkit's ${declarations.length} elements. The generator builds it from the package's \`custom-elements.json\`.`,
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
      `\`<${declaration.tagName}>\`. ${entry.summary} [How to use it](${entry.howTo}).`,
      "",
      "### Attributes and properties",
      "",
      "Set an attribute in HTML or a property in JavaScript. If a property has no attribute, set it in JavaScript.",
      "",
      "| Property | Attribute | Type | Default | Description |",
      "| --- | --- | --- | --- | --- |",
      ...fields.map(
        (member) =>
          `| ${code(member.name)} | ${member.attribute ? code(member.attribute) : "—"} | ${code(member.type?.text ?? "unknown")} | ${member.default ? code(member.default) : "—"} | ${cell(member.description ?? "")} |`,
      ),
      "",
      "### Data",
      "",
      entry.data,
      "",
      "### Empty state",
      "",
      entry.empty,
      "",
    );
    const events = declaration.events;
    lines.push(
      "### Events",
      "",
      events.length === 0
        ? "None."
        : `${events.map((event) => code(event.name)).join(", ")}. See [Events](#events).`,
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
    if (declaration.cssParts.length > 0) {
      lines.push(
        "### CSS parts",
        "",
        "Style these from your page with `::part(name)`.",
        "",
        "| Part | Description |",
        "| --- | --- |",
        ...declaration.cssParts.map(
          (part) => `| ${code(part.name)} | ${cell(part.description ?? "")} |`,
        ),
        "",
      );
    }
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
    "| Element | Event | Description | Detail | Cancelable | What `preventDefault()` does |",
    "| --- | --- | --- | --- | --- | --- |",
    ...declarations.flatMap((declaration) =>
      declaration.events.map((event) => {
        const details = events[event.name]!;
        return `| ${catalog[declaration.tagName]!.name} | ${code(event.name)} | ${cell(event.description ?? "")} | ${cell(details.detail)} | ${details.cancelable ? "Yes" : "No"} | ${cell(details.preventDefault)} |`;
      }),
    ),
    "",
    '<a id="style-settings"></a>',
    "",
    "## Style settings",
    "",
    "The elements share these CSS custom properties. Not every element uses every one. Set them on the element or on any ancestor. [Match your site's look](/across-components/match-your-sites-look.md) shows how.",
    "",
    "| Property | Default | Description |",
    "| --- | --- | --- |",
    ...declarations[0]!.cssProperties.map(
      (property) =>
        `| ${code(property.name)} | ${code(property.default ?? "")} | ${reserved.has(property.name) ? `${RESERVED} ` : ""}${cell(property.description ?? "")} |`,
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
