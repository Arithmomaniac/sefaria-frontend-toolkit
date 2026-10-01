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
  "sefaria-source-card": {
    file: "docs/use-components/show-an-attributed-passage.md",
    attributes: ["selectable", "hide-attributions", "translation-language"],
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
  "Component page for %s",
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
        expect.arrayContaining(["data", "source", "status"]),
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

it("teaches shared styling and dark-mode setup on the passage page", () => {
  const page = read(showTextPages["sefaria-text-segment"].file);
  expect(page).toContain(
    "These styling rules apply to every toolkit component",
  );
  expect(page).toContain("--sefaria-font-scale");
  expect(page).toContain("(/across-components/match-your-sites-look.md)");
  expect(read("docs/across-components/match-your-sites-look.md")).toContain(
    "color-scheme: light dark",
  );
});

describe("Source Card page", () => {
  const page = read("docs/use-components/show-an-attributed-passage.md");

  it("teaches the selection event and its detail", () => {
    expect(page).toContain("`sefaria-source-select`");
    expect(page).toContain("`{ position, ref }`");
    expect(page).toContain("`selectedPosition`");
  });

  it("states scoped request counts and the attribution boundary", () => {
    expect(page).toMatch(/fresh load makes one request/);
    expect(page).toMatch(/two/);
    expect(page).not.toMatch(/StatusNote/);
    expect(page).toMatch(/licen[cs]e/i);
  });
});

describe("Use with a framework page", () => {
  const page = read("docs/use-components/use-with-a-framework.md");

  it("embeds the three tested owner files, not copies", () => {
    expect(page).toContain(
      'import vanilla from "../../examples/site-snippets/source-card-select.html?raw"',
    );
    expect(page).toContain(
      'import react from "../../examples/react-vite/src/site-source-card.tsx?raw"',
    );
    expect(page).toContain(
      'import alpine from "../../examples/alpine-vite/src/site-source-card.html?raw"',
    );
    expect(page).toMatch(/<LiveEditor :code="vanilla"[^>]*readonly/);
    expect(page).not.toMatch(/```(tsx|jsx|html)/);
    for (const owner of [
      "examples/react-vite/src/site-source-card.browser.test.tsx",
      "examples/alpine-vite/src/site-source-card.browser.test.ts",
    ]) {
      expect(read(owner)).toContain("./site-source-card");
    }
  });

  it("carries the status note and registers through the package root", () => {
    expect(page).toContain("<StatusNote />");
    expect(page).toContain('import "@arithmomaniac/sefaria-web-components";');
    expect(read("examples/react-vite/src/site-source-card.tsx")).toContain(
      'import "@arithmomaniac/sefaria-web-components";',
    );
  });

  it("covers zero states, status, the error event, and required links", () => {
    for (const text of [
      "Loading Micah 6:6-8.",
      "can't be reached",
      "isn't a reference",
      "No `sref` and no `data`",
      "`sefaria-source-card-error`",
      "`status`",
      "(/help/troubleshoot-a-page.md)",
      "(/data-and-text-tools/give-components-your-own-data.md)",
      "(/use-components/show-commentary-and-connected-texts.md)",
      "(/use-components/add-the-complete-reader.md)",
      "(/across-components/make-components-respond-to-each-other.md)",
      "(/reference/components.md)",
      "(/help/install-and-status.md)",
    ]) {
      expect(page).toContain(text);
    }
  });
});

describe.each([
  {
    file: "docs/use-components/show-commentary-and-connected-texts.md",
    tag: "sefaria-connections-panel",
    loading: "Loading connections for Micah 6:8.",
    errorEvent: "sefaria-connections-panel-error",
    required: [
      "`with-text`",
      "`category`",
      "`page`",
      "`show-previews`",
      "fresh load makes one request",
      "(/use-components/add-the-complete-reader.md)",
      "(/across-components/make-components-respond-to-each-other.md)",
      "(/concepts/how-the-toolkit-works.md)",
    ],
  },
  {
    file: "docs/use-components/add-the-complete-reader.md",
    tag: "sefaria-reader",
    loading: "Opening Reader...",
    errorEvent: "sefaria-reader-error",
    listedEvents: [
      "sefaria-reader-source-select",
      "sefaria-reader-connection-select",
      "sefaria-reader-back",
      "sefaria-reader-error",
    ],
    required: [
      "`active-pane`",
      "`layout`",
      'slot="toolbar-actions"',
      "`selectedRef`",
      "(/examples/composed-multi-pane-reader.md)",
      "(/concepts/how-the-toolkit-works.md)",
    ],
  },
])(
  "$tag page",
  ({ file, tag, loading, errorEvent, required, listedEvents }) => {
    const page = read(file);

    it("is written and lists the events readers most need", () => {
      expect(page).not.toMatch(/^stub: true$/m);
      expect(page).not.toContain("<StatusNote");
      const generated = declaration(tag).events!.map((entry) => entry.name);
      for (const event of listedEvents ?? generated) {
        expect(generated).toContain(event);
        expect(page).toContain(`\`${event}\``);
      }
      expect(page).toContain(`\`${errorEvent}\``);
    });

    it("covers zero states, status, links, and the brief's questions", () => {
      for (const text of [
        loading,
        "can't be reached",
        "isn't a reference",
        "`empty`",
        "`loading`",
        "`ready`",
        "`error`",
        "(/help/troubleshoot-a-page.md)",
        "(/data-and-text-tools/give-components-your-own-data.md",
        "(/reference/components.md",
        ...required,
      ]) {
        expect(page).toContain(text);
      }
      expect(page).not.toContain("Genesis 1:1");
    });
  },
);

describe("Across components pages", () => {
  const look = read("docs/across-components/match-your-sites-look.md");
  const text = read("docs/across-components/choose-what-text-readers-see.md");
  const respond = read(
    "docs/across-components/make-components-respond-to-each-other.md",
  );
  const tokens = [
    ...new Set(
      manifest.modules
        .flatMap((module) => module.declarations ?? [])
        .flatMap(
          (entry) =>
            (entry as { cssProperties?: { name: string }[] }).cssProperties ??
            [],
        )
        .map((property) => property.name),
    ),
  ];

  it("lists every generated token on the styling page", () => {
    expect(tokens.length).toBeGreaterThan(10);
    for (const token of tokens) expect(look).toContain(`\`${token}\``);
  });

  it("says appearance only first and teaches color-scheme setup", () => {
    const body = look.split(/^# .+$/m)[1]!.trim();
    expect(body.split("\n")[0]).toContain(
      "(/across-components/choose-what-text-readers-see.md)",
    );
    expect(look).toContain("color-scheme: light dark");
    expect(look).toMatch(/color-scheme: (light|dark)`/);
  });

  it("gathers text choices with request effects, fallback, and rights", () => {
    for (const snippet of [
      "`translation-language`",
      "`primary-version-title`",
      "`translation-version-title`",
      "`vocalization-mode`",
      "`content-language`",
      "`hide-attributions`",
      "Berakhot 2a:1",
      "isn't always English",
      "`license`",
      "(/help/install-and-status.md#license-and-text-rights)",
      "(/data-and-text-tools/clean-up-stored-sefaria-text.md)",
      "(/reference/text-transform.md)",
      "(/reference/client.md)",
      "(/concepts/sefarias-own-texts-and-tools.md)",
      "(/across-components/match-your-sites-look.md)",
    ]) {
      expect(text).toContain(snippet);
    }
    expect(text).not.toMatch(/consonants only/i);
    expect(text).not.toMatch(/```html/);
  });

  it("shows the coordination loop from tested owner files", () => {
    expect(respond).toContain(
      'import react from "../../examples/react-vite/src/site-source-card-to-connections.tsx?raw"',
    );
    expect(respond).toContain(
      'import plain from "../../examples/site-snippets/source-card-to-connections.html?raw"',
    );
    expect(
      read(
        "examples/react-vite/src/site-source-card-to-connections.browser.test.tsx",
      ),
    ).toContain("./site-source-card-to-connections.js");
    for (const link of [
      "(/use-components/add-the-complete-reader.md)",
      "(/examples/composed-multi-pane-reader.md)",
      "(/concepts/how-the-toolkit-works.md)",
      "(/reference/components.md",
    ]) {
      expect(respond).toContain(link);
    }
    expect(respond).toMatch(/reactive framework/);
  });

  it("carries no status note", () => {
    for (const page of [look, text, respond]) {
      expect(page).not.toContain("<StatusNote");
      expect(page).not.toMatch(/^stub: true$/m);
    }
  });
});

it("removes the Reference Label page and routes citations to a plain link", () => {
  expect(() =>
    read("docs/use-components/show-text/label-a-citation.md"),
  ).toThrow();
  expect(read("docs/.vitepress/config.ts")).not.toContain("label-a-citation");
  const quickstart = read("docs/use-components/start-here.md");
  expect(quickstart).not.toContain("label-a-citation");
  expect(quickstart).toContain('<a href="https://www.sefaria.org/Micah.6.8">');
  expect(read("docs/across-components/match-your-sites-look.md")).toContain(
    "(/use-components/show-text/show-one-passage.md#match-your-sites-colors-and-fonts)",
  );
});
