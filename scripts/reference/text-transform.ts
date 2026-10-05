import { readFile } from "node:fs/promises";
import { normalizeText } from "../../packages/text-transform/src/index.js";
import { releaseSection, renderPage } from "./release.js";
import { renderTypeDoc } from "./typedoc.js";

export const TEXT_TRANSFORM_PAGE = new URL(
  "../../docs/reference/text-transform.md",
  import.meta.url,
);
const NORMALIZE_SOURCE = new URL(
  "../../packages/text-transform/src/normalize.ts",
  import.meta.url,
);
const CATALOG = new URL("./normalized-output-catalog.json", import.meta.url);

interface CatalogEntry {
  readonly attribute: string;
  readonly element: string;
  readonly input: string;
  readonly meaning: string;
  readonly option: string;
}

const cell = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/gu, " ").trim();

function setLiteral(source: string, name: string): readonly string[] {
  const match = new RegExp(
    `const ${name} = new Set\\(\\[([^\\]]*)\\]`,
    "u",
  ).exec(source);
  if (!match) throw new Error(`normalize.ts no longer defines ${name}.`);
  return [...match[1]!.matchAll(/"([^"]+)"/gu)].map((item) => item[1]!);
}

function mapLiteral(
  source: string,
  name: string,
): readonly (readonly [string, string])[] {
  const match = new RegExp(
    `const ${name} = new Map\\(\\[([\\s\\S]*?)\\]\\);`,
    "u",
  ).exec(source);
  if (!match) throw new Error(`normalize.ts no longer defines ${name}.`);
  return [...match[1]!.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/gu)].map(
    (item) => [item[1]!, item[2]!] as const,
  );
}

/** Generates the `#normalized-html-output` section from normalize.ts. */
export async function renderNormalizedOutput(): Promise<string> {
  const source = await readFile(NORMALIZE_SOURCE, "utf8");
  const catalog = JSON.parse(await readFile(CATALOG, "utf8")) as CatalogEntry[];
  const optionDocs = new Map(
    [
      ...source.matchAll(
        new RegExp(
          String.raw`/\*\*([\s\S]*?)\*/[\r\n]+  readonly (\w+)[?:]`,
          "gu",
        ),
      ),
    ].map(([, doc, name]) => [name, doc] as const),
  );
  const emitted = new Set(
    [...source.matchAll(/"(data-sefaria-[a-z-]+)"/gu)].map((m) => m[1]!),
  );
  const described = new Set(catalog.map((entry) => entry.attribute));
  const undocumented = [...emitted].filter((name) => !described.has(name));
  const unknown = [...described].filter((name) => !emitted.has(name));
  if (undocumented.length > 0 || unknown.length > 0) {
    throw new Error(
      `normalized-output-catalog.json is out of date. Undocumented: ${undocumented.join(", ") || "none"}. Not in normalize.ts: ${unknown.join(", ") || "none"}.`,
    );
  }
  const rows: string[] = [];
  const examples: string[] = [];
  for (const entry of catalog) {
    const output = normalizeText(entry.input).bodyHtml;
    if (!output.includes(`${entry.attribute}=`)) {
      throw new Error(
        `The ${entry.attribute} example doesn't produce the attribute: ${output}`,
      );
    }
    for (const option of entry.option.matchAll(/`(\w+)`/gu)) {
      const doc = optionDocs.get(option[1]!);
      if (!doc?.includes(entry.attribute)) {
        throw new Error(
          `NormalizeTextOptions.${option[1]} must document ${entry.attribute}.`,
        );
      }
    }
    rows.push(
      `| \`${entry.attribute}\` | \`<${entry.element}>\` | ${cell(entry.meaning)} | ${cell(entry.option)} |`,
    );
    if (!examples.includes(entry.input)) {
      examples.push(
        "```html",
        "<!-- Input -->",
        entry.input,
        "<!-- Output -->",
        output,
        "```",
        "",
      );
    }
  }
  const tags = setLiteral(source, "ORDINARY_TAGS");
  const mam = mapLiteral(source, "MAM_VALUES");
  return [
    '<a id="normalized-html-output"></a>',
    "",
    "## Normalized HTML output",
    "",
    "`normalizeText` returns `bodyHtml` and footnote HTML with no links, no event handlers and no scripts. It emits only the attributes listed in this section, plus approved `dir` values and the fixed `style` value generated for `<big>`. Addresses can still appear as ordinary text or inside an attribute value, such as a reference. This section is generated from `normalize.ts`, and each example below is the function's real output.",
    "",
    "### Elements",
    "",
    `- These formatting elements are kept, with no attributes except \`dir\` on \`<i>\`: ${tags.map((tag) => `\`<${tag}>\``).join(", ")}.`,
    "- `<br>` is kept with no attributes.",
    '- `<big>` becomes `<span style="font-size: larger;">`. This is the only `style` attribute in the output. Incoming styles are removed.',
    "- `<img>` is replaced by its `alt` text.",
    "- Toolkit-specific markup is output as `<span>` elements with the attributes below.",
    "- Block elements, such as `<blockquote>`, are unwrapped with a separator kept between their contents.",
    "- Scripts, styles and similar active content are removed. Other elements are unwrapped, keeping their text.",
    "- `dir` is kept only when its value is `ltr`, `rtl` or `auto`.",
    "",
    "### Attributes",
    "",
    "The last column names the `NormalizeTextOptions` setting that controls the markup. The four `allow…` settings default to `true`. `commentaryReferences` defaults to none, so a commentary anchor gets `data-sefaria-ref` only when you supply a matching reference. Masorah markings are kept when a `<span>` has exactly one recognized Masorah class.",
    "",
    "| Attribute | Element | Meaning | Controlled by |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "### Masorah markings",
    "",
    "`data-sefaria-mam` takes one of these values, converted from Sefaria's class names:",
    "",
    "| Sefaria class | `data-sefaria-mam` value |",
    "| --- | --- |",
    ...mam.map(([from, to]) => `| \`${from}\` | \`${to}\` |`),
    "",
    "### Examples",
    "",
    ...examples,
  ].join("\n");
}

export async function renderTextTransformReference(): Promise<string> {
  const [surface, output] = await Promise.all([
    renderTypeDoc("text-transform.ts", "@sefaria/text-transform", 3),
    renderNormalizedOutput(),
  ]);
  const body = [
    "This page lists the names exported by `@sefaria/text-transform` and the HTML that `normalizeText` produces. `normalizeText` makes Sefaria's HTML safe to display. Run it before `applyVocalizationToHtml`, which doesn't sanitize. `createTextPreview` accepts raw HTML and normalizes it itself.",
    "",
    releaseSection(),
    "",
    "## Functions and types",
    "",
    "Import all of these from the package root.",
    "",
    surface,
    "",
    output,
    "",
    "## Where to go next",
    "",
    "- [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) shows these functions in use.",
    "- [Clean text and safety](/concepts/clean-text-and-safety.md) explains why normalizing comes first.",
  ].join("\n");
  return renderPage({
    title: "Reference › Text tools",
    heading: "Text tools reference",
    description:
      "The functions and types exported by @sefaria/text-transform, and the HTML that normalizeText produces.",
    body,
  });
}
