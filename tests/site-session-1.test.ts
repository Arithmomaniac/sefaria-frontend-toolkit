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
