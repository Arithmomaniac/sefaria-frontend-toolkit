import { describe, expect, it } from "vitest";

import { verifyElementTemplateContract } from "../scripts/custom-element-template-contract.mjs";

const declaration = {
  tagName: "sefaria-reader",
  slots: [
    {
      name: "toolbar-actions",
      description: "Host-owned Reader toolbar actions.",
    },
  ],
  cssParts: [
    { name: "toolbar", description: "Reader toolbar." },
    { name: "history", description: "Reader history controls." },
  ],
};

describe("custom-element template contract", () => {
  it("accepts declared literal slots and space-separated parts", () => {
    expect(() =>
      verifyElementTemplateContract({
        declaration,
        sourcePath: "reader-element.ts",
        source: `
          import { html } from "lit";
          const label = "part=not-an-attribute";
          // <slot name="not-template"></slot>
          html\`<div aria-label="a > b" part="toolbar history">
            <slot name="toolbar-actions"></slot>
          </div>\`;
        `,
      }),
    ).not.toThrow();
  });

  it.each([
    {
      name: "named alias",
      source: `
        import { html as h } from "lit";
        h\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
    },
    {
      name: "namespace alias",
      source: `
        import * as lit from "lit";
        lit.html\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
    },
    {
      name: "SVG alias",
      source: `
        import { svg as template } from "lit";
        template\`<g part="toolbar history"><slot name="toolbar-actions"></slot></g>\`;
      `,
    },
    {
      name: "parenthesized tag",
      source: `
        import { html } from "lit";
        (html)\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
    },
    {
      name: "non-null tag",
      source: `
        import { html } from "lit";
        html!\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
    },
    {
      name: "cast tag",
      source: `
        import { html } from "lit";
        (html as typeof html)\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
    },
  ])("recognizes Lit templates through a $name", ({ source }) => {
    expect(() =>
      verifyElementTemplateContract({
        declaration,
        sourcePath: "reader-element.ts",
        source,
      }),
    ).not.toThrow();
  });

  it("accepts unquoted literal slot and part values", () => {
    expect(() =>
      verifyElementTemplateContract({
        declaration,
        sourcePath: "reader-element.ts",
        source: template(
          "<div part=toolbar><div part=history></div><slot name=toolbar-actions></slot></div>",
        ),
      }),
    ).not.toThrow();
  });

  it("rejects duplicate source declarations", () => {
    expect(() =>
      verifyElementTemplateContract({
        declaration: {
          ...declaration,
          slots: [...declaration.slots, declaration.slots[0]],
        },
        sourcePath: "reader-element.ts",
        source: template(
          '<div part="toolbar history"></div><slot name="toolbar-actions"></slot>',
        ),
      }),
    ).toThrow(/duplicate slots.*toolbar-actions/u);
  });

  it.each([
    {
      name: "undeclared template part",
      source: template(
        '<div part="toolbar source-pane"></div><slot name="toolbar-actions"></slot>',
      ),
      message: /template CSS parts.*source-pane/u,
    },
    {
      name: "declared part absent from the template",
      source: template(
        '<div part="toolbar"></div><slot name="toolbar-actions"></slot>',
      ),
      message: /declared CSS parts.*history/u,
    },
    {
      name: "undeclared template slot",
      source: template(
        '<div part="toolbar history"></div><slot name="extra"></slot>',
      ),
      message: /template slots.*extra/u,
    },
    {
      name: "declared slot absent from the template",
      source: template('<div part="toolbar history"></div>'),
      message: /declared slots.*toolbar-actions/u,
    },
    {
      name: "undeclared exportparts forwarding",
      source: template(
        '<child-element part="toolbar history" exportparts="label:outer-label"></child-element><slot name="toolbar-actions"></slot>',
      ),
      message: /exportparts.*outer-label/u,
    },
    {
      name: "dynamic part binding",
      source: template(
        '<div part=${partName}></div><slot name="toolbar-actions"></slot>',
      ),
      message: /dynamic part/u,
    },
    {
      name: "dynamic slot name",
      source: template(
        '<div part="toolbar history"></div><slot name=${slotName}></slot>',
      ),
      message: /dynamic slot/u,
    },
    {
      name: "dynamic exportparts binding",
      source: template(
        '<child-element part="toolbar history" exportparts=${forwarded}></child-element><slot name="toolbar-actions"></slot>',
      ),
      message: /dynamic exportparts/u,
    },
    {
      name: "unresolved bare markup tag",
      source:
        'html`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>`;',
      message: /unresolved markup template tag.*html/u,
    },
    {
      name: "unresolved imported markup alias",
      source: `
        import { html as h } from "./templating.js";
        h\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
      message: /unresolved markup template tag.*h/u,
    },
    {
      name: "unresolved namespace markup tag",
      source: `
        import * as local from "./templating.js";
        local.html\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
      message: /unresolved markup template tag.*local\.html/u,
    },
    {
      name: "unresolved computed markup tag",
      source: `
        import * as lit from "lit";
        lit["html"]\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
      message: /unresolved markup template tag.*lit\["html"\]/u,
    },
    {
      name: "dynamic Lit namespace markup tag",
      source: `
        import * as lit from "lit";
        const key = "html";
        lit[key]\`<div part="toolbar history"><slot name="toolbar-actions"></slot></div>\`;
      `,
      message: /unresolved markup template tag.*lit\[key\]/u,
    },
  ])("rejects $name", ({ source, message }) => {
    expect(() =>
      verifyElementTemplateContract({
        declaration,
        sourcePath: "reader-element.ts",
        source,
      }),
    ).toThrow(message);
  });
});

function template(value: string): string {
  return `import { html } from "lit"; html\`${value}\`;`;
}
