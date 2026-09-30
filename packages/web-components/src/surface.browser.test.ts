import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test } from "vitest";

import "./index.js";

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const CREAM = "rgb(255, 253, 248)";

function background(tag: string): string {
  const element = document.querySelector(tag);
  if (!element) throw new Error(`Missing ${tag}.`);
  return getComputedStyle(element).backgroundColor;
}

test("text segment is transparent by default", async () => {
  render(html`<sefaria-text-segment></sefaria-text-segment>`);
  await customElements.whenDefined("sefaria-text-segment");
  expect(background("sefaria-text-segment")).toBe(TRANSPARENT);
});

test("text segment applies an explicit --sefaria-surface", () => {
  render(
    html`<sefaria-text-segment
      style="--sefaria-surface: rgb(1, 2, 3)"
    ></sefaria-text-segment>`,
  );
  expect(background("sefaria-text-segment")).toBe("rgb(1, 2, 3)");
});

test("text segment inherits an ancestor --sefaria-surface", () => {
  render(
    html`<div style="--sefaria-surface: rgb(4, 5, 6)">
      <sefaria-text-segment></sefaria-text-segment>
    </div>`,
  );
  expect(background("sefaria-text-segment")).toBe("rgb(4, 5, 6)");
});

test.each([
  "sefaria-bilingual-segment",
  "sefaria-source-card",
  "sefaria-connections-panel",
  "sefaria-reader",
])("%s keeps the tinted default surface", (tag) => {
  const element = document.createElement(tag);
  element.setAttribute("style", "color-scheme: light");
  document.body.append(element);
  try {
    expect(background(tag)).toBe(CREAM);
  } finally {
    element.remove();
  }
});
