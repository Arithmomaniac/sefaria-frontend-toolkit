import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("LiveEditor", () => {
  const editor = read("docs/.vitepress/theme/LiveEditor.vue");

  it("isolates each example in an opaque-origin sandbox", () => {
    expect(editor).toContain('sandbox="allow-scripts"');
    expect(editor).not.toContain("allow-same-origin");
    expect(editor).toContain(':srcdoc="srcdoc"');
  });

  it("runs the shown code only once the example nears the viewport", () => {
    expect(editor).toContain("IntersectionObserver");
    expect(editor).toMatch(/visible\.value \? `\$\{running\.value\}/);
  });

  it("shows the running code and applies edits only on Run", () => {
    expect(editor).toContain('<CodeBlock v-if="!editing" :code="running"');
    expect(editor).toMatch(
      /function run\(\) \{\s+running\.value = draft\.value;/,
    );
  });

  it("accepts height messages only from its own frame", () => {
    expect(editor).toContain(
      "if (event.source !== frame.value?.contentWindow) return;",
    );
  });

  it("is documented in the theme README", () => {
    expect(read("docs/.vitepress/theme/README.md")).toContain(
      "## Live examples (`LiveEditor`)",
    );
  });
});

const showTextPages = {
  "sefaria-ref-label": {
    file: "docs/use-components/show-text/label-a-citation.md",
    attributes: ["sref", "label-language", "linked"],
  },
  "sefaria-text-segment": {
    file: "docs/use-components/show-text/show-one-passage.md",
    attributes: [
      "translation-language",
      "version-language",
      "version-title",
      "vocalization-mode",
    ],
  },
  "sefaria-bilingual-segment": {
    file: "docs/use-components/show-text/hebrew-and-translation.md",
    attributes: [
      "content-language",
      "layout",
      "side-order",
      "primary-version-title",
      "translation-version-title",
      "translation-language",
    ],
  },
} as const;

const manifest = JSON.parse(
  read("packages/web-components/custom-elements.json"),
) as {
  modules: {
    declarations?: {
      tagName?: string;
      attributes?: { name: string }[];
      members?: { name: string }[];
      events?: { name: string }[];
    }[];
  }[];
};
const declaration = (tag: string) =>
  manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.tagName === tag)!;

describe.each(Object.entries(showTextPages))(
  "Show text page for %s",
  (tag, { file, attributes }) => {
    const page = read(file);
    const errorEvent = `${tag}-error`;

    it("is written, not a stub", () => {
      expect(page).not.toMatch(/^stub: true$/m);
      expect(page).not.toContain("Coming soon");
    });

    it("documents attributes that generated metadata lists", () => {
      const listed = declaration(tag).attributes!.map((entry) => entry.name);
      for (const attribute of attributes) {
        expect(listed).toContain(attribute);
        expect(page).toContain(`\`${attribute}\``);
      }
      const members = declaration(tag).members!.map((entry) => entry.name);
      expect(members).toEqual(
        expect.arrayContaining(["data", "acquisition", "status"]),
      );
      expect(declaration(tag).events!.map((entry) => entry.name)).toContain(
        errorEvent,
      );
    });

    it("covers the four zero states, status, and the error event", () => {
      for (const state of [
        /Loading Micah 6:8\./,
        /can't be reached/,
        /isn't a reference/,
        /No `sref` and no `data`/,
      ]) {
        expect(page).toMatch(state);
      }
      for (const status of ["empty", "loading", "ready", "error"]) {
        expect(page).toContain(`\`${status}\``);
      }
      expect(page).toContain(`\`${errorEvent}\``);
    });

    it("links troubleshooting and the supplied-data page", () => {
      expect(page).toContain("(/help/troubleshoot-a-page.md)");
      expect(page).toContain(
        "(/data-and-text-tools/give-components-your-own-data.md)",
      );
    });

    it("embeds only snippets that exist, through LiveEditor", () => {
      const imports = [
        ...page.matchAll(/examples\/site-snippets\/([\w-]+\.html)\?raw/g),
      ].map((match) => match[1]);
      expect(imports.length).toBeGreaterThan(0);
      for (const snippet of imports) {
        expect(() => read(`examples/site-snippets/${snippet}`)).not.toThrow();
      }
      expect(page.match(/<LiveEditor /g)?.length).toBe(imports.length);
      expect(page).not.toMatch(/```html[\s\S]*?<sefaria-/);
    });

    it("follows the example-reference rules", () => {
      expect(page).toContain("Micah 6:8");
      expect(page).not.toContain("Genesis 1:1");
    });
  },
);

it("teaches shared styling and dark-mode setup on the label page", () => {
  const page = read(showTextPages["sefaria-ref-label"].file);
  expect(page).toContain("color-scheme: light dark");
  expect(page).toContain("--sefaria-font-scale");
  expect(page).toContain("(/across-components/match-your-sites-look.md)");
});
