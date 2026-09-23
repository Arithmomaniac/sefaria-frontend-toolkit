import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

const cases = [
  {
    file: "examples/playground/projects/source-card/main.js",
    forbidden: ["card.selectable =", "card.vocalizationMode ="],
    required: ['card.setAttribute("selectable", "")'],
  },
  {
    file: "examples/playground/projects/bilingual-segment/main.js",
    forbidden: ["segment.layout =", "segment.sideOrder ="],
    required: ['segment.setAttribute("layout", "side-by-side")'],
  },
  {
    file: "examples/playground/projects/ref-label/main.js",
    forbidden: ["label.sref =", "label.linked ="],
    required: ['label.setAttribute("sref", "Micah 6:8")'],
  },
  {
    file: "examples/playground/projects/connections-panel/main.js",
    forbidden: ["panel.sref =", "panel.withText =", "panel.category ="],
    required: ['panel.setAttribute("sref", "Micah 6:8")'],
  },
  {
    file: "examples/playground/projects/reader/main.js",
    forbidden: ["reader.vocalizationMode ="],
    required: ['reader.setAttribute("vocalization-mode", vocalization.value)'],
  },
  {
    file: "examples/vanilla-vite/src/main.ts",
    forbidden: [
      "card.sref =",
      "card.selectable =",
      "card.contentLanguage =",
      "card.layout =",
      "card.sideOrder =",
      "card.vocalizationMode =",
    ],
    required: ['card.setAttribute("sref", sref)'],
  },
  {
    file: "examples/alpine-vite/src/source-card-example.ts",
    forbidden: [
      "element.sref =",
      "element.contentLanguage =",
      "element.layout =",
      "element.sideOrder =",
      "element.vocalizationMode =",
      "element.selectable =",
      "card.sref =",
    ],
    required: [
      'sref: ""',
      'card.setAttribute("sref", normalized)',
      "this.sref = normalized",
    ],
  },
  {
    file: "examples/alpine-vite/index.html",
    forbidden: ["syncPresentation($el, contentLanguage", 'x-effect="syncCard('],
    required: [
      ':sref="sref"',
      ':layout="layout"',
      ':vocalization-mode="vocalizationMode"',
    ],
  },
  {
    file: "examples/reader/src/controlled-app.ts",
    forbidden: ["reader.sref = normalized", "reader.vocalizationMode ="],
    required: ['reader.setAttribute("sref", normalized)'],
  },
  {
    file: "examples/linked-article/src/app.ts",
    forbidden: ["popup.sref =", "popup.open ="],
    required: ['popup.setAttribute("sref", tref)'],
  },
  {
    file: "examples/explorer/src/source-card/app.ts",
    forbidden: [
      "result.contentLanguage =",
      "result.layout =",
      "result.sideOrder =",
      "result.vocalizationMode =",
      "result.selectable =",
    ],
    required: ['result.setAttribute("selectable", "")'],
  },
  {
    file: "examples/explorer/src/bilingual-segment/app.ts",
    forbidden: [
      "result.contentLanguage =",
      "result.layout =",
      "result.sideOrder =",
      "result.vocalizationMode =",
    ],
    required: ['"content-language",'],
  },
  {
    file: "examples/explorer/src/connections/app.ts",
    forbidden: [
      "reader.contentLanguage =",
      "reader.layout =",
      "reader.sideOrder =",
      "reader.vocalizationMode =",
      "connections.vocalizationMode =",
      "reader.selectable =",
      "connections.sref = ",
      "connections.category = ",
      "connections.page = ",
      "sourceProbe.sref = ",
      "reader.sref = ",
    ],
    required: ['connections.setAttribute("vocalization-mode", mode)'],
  },
  {
    file: "examples/explorer/src/authored/development-status.ts",
    forbidden: [
      ".sref=${sourceCardSref(id)}",
      ".category=${connectionsCategory(id)}",
      ".activePane=${",
      ".chatExport=${",
    ],
    required: [
      "sref=${sourceCardSref(id)}",
      "active-pane=${activePane}",
      "?chat-export=${chatExport}",
    ],
  },
  {
    file: "examples/explorer/src/text-segment/app.ts",
    forbidden: [
      "result.sref = ",
      "result.versionLanguage = ",
      "result.versionTitle = ",
    ],
    required: ['result.setAttribute("sref", request.tref)'],
  },
  {
    file: "examples/explorer/src/ref-label/app.ts",
    forbidden: [
      "result.sref = ",
      "result.labelLanguage = ",
      "result.linked = ",
    ],
    required: ['result.setAttribute("sref", request.tref)'],
  },
  {
    file: "examples/reader/src/app.ts",
    forbidden: [
      "source.contentLanguage = ",
      "source.layout = ",
      "source.sideOrder = ",
      "source.vocalizationMode = ",
      "source.selectable = ",
      "connections.category = ",
      "connections.page = ",
      "connections.vocalizationMode = ",
    ],
    required: ['source.setAttribute("selectable", "")'],
  },
  {
    file: "examples/mcp-app/src/app.ts",
    forbidden: ["reader.chatExport = "],
    required: ['reader.toggleAttribute("chat-export"'],
  },
  {
    file: "examples/playground/projects/text-segment/main.js",
    forbidden: ["segment.versionLanguage = ", "segment.versionTitle = "],
    required: ['segment.setAttribute("version-language"'],
  },
  {
    file: "examples/playground/projects/popup/main.js",
    forbidden: ["popup.open = "],
    required: ['popup.setAttribute("open", "")'],
  },
] as const;

describe("example custom-element attributes", () => {
  it.each(cases)(
    "uses attributes for scalar inputs in $file",
    async ({ file, forbidden, required }) => {
      const source = await readFile(path.join(repository, file), "utf8");

      for (const stale of forbidden) {
        expect(source, `${file} contains ${stale}`).not.toContain(stale);
      }
      for (const current of required) {
        expect(source, `${file} is missing ${current}`).toContain(current);
      }
    },
  );
});

const documentationCases = [
  {
    file: "docs/learn/01-web-components.md",
    current: '<sefaria-source-card sref="Micah 6:8" selectable>',
  },
  {
    file: "docs/learn/03-live-data.md",
    current: 'card.setAttribute("sref", next)',
  },
  {
    file: "docs/learn/04-reader.md",
    current: 'reader.setAttribute("sref", "Micah 6:8")',
  },
  {
    file: "docs/guides/data-flow.md",
    current: 'card.setAttribute("sref", "Micah 6:8")',
  },
  {
    file: "packages/web-components/README.md",
    current: 'card.setAttribute("sref", "Micah 6:8")',
  },
] as const;

describe("custom-element input documentation", () => {
  it.each(documentationCases)(
    "teaches scalar attributes in $file",
    async ({ file, current }) => {
      const source = await readFile(path.join(repository, file), "utf8");

      expect(source).not.toMatch(/\b(?:card|reader)\.sref\s*=/u);
      expect(source).toContain(current);
    },
  );
});
