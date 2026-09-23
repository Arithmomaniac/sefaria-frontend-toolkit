import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import {
  getPreparedState,
  prepared,
  setPreparedState,
} from "./prepared-state.js";
import { SefariaTextSegment } from "./index.js";
import type {
  TextSegmentDataViewModel,
  TextSegmentViewModel,
} from "./text-segment.js";

const DATA_VIEW_MODEL: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "ltr",
  bodyHtml:
    '<b>בְּרֵאשִׁית</b> — mixed punctuation, English.<span data-sefaria-note="0"></span>',
  notes: [
    {
      key: 0,
      markerHtml: "*",
      contentHtml: "<b>Static</b> footnote body.",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each([
  {
    viewModel: { state: "loading", message: "Loading segment." } as const,
    role: "status",
    text: "Loading segment.",
  },
  {
    viewModel: {
      state: "empty",
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      message: "No English version is available.",
      warnings: ["No English version is available."],
    } as const,
    role: "status",
    text: "No English version is available.",
  },
  {
    viewModel: {
      state: "error",
      errorKind: "projection",
      message: "Text segment requires one matching version; found 2.",
    } as const,
    role: "alert",
    text: "Text segment requires one matching version; found 2.",
  },
])(
  "announces the $viewModel.state state",
  async ({ viewModel, role, text }) => {
    const screen = render(
      html`<sefaria-text-segment
        ${prepared(viewModel satisfies TextSegmentViewModel)}
      ></sefaria-text-segment>`,
    );

    await expect.element(screen.getByRole(role)).toHaveTextContent(text);
  },
);

test("renders payload language and direction with static footnotes", async () => {
  const screen = render(
    html`<sefaria-text-segment
      ${prepared(DATA_VIEW_MODEL)}
    ></sefaria-text-segment>`,
  );

  await expect
    .element(screen.getByText("בְּרֵאשִׁית", { exact: false }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Static", { exact: false }))
    .toBeVisible();
  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  const article = element?.shadowRoot?.querySelector("article");
  const sourceLink = element?.shadowRoot?.querySelector("a");
  expect(article?.lang).toBe("he");
  expect(article?.dir).toBe("ltr");
  expect(element?.selectedVersion).toEqual({
    actualLanguage: "he",
    direction: "ltr",
  });
  expect(
    Number.parseFloat(
      getComputedStyle(
        element!.shadowRoot!.querySelector<HTMLElement>(".body")!,
      ).lineHeight,
    ),
  ).toBeGreaterThan(30);
  expect(sourceLink).toBeNull();
  expect(element?.shadowRoot?.querySelector(".attribution")).toBeNull();
});

test("does not invent a body for a missing static footnote", async () => {
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    notes: [{ key: 0, markerHtml: "1", contentHtml: null }],
  };
  render(
    html`<sefaria-text-segment ${prepared(viewModel)}></sefaria-text-segment>`,
  );

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  expect(element?.shadowRoot?.querySelector(".footnotes")).toBeNull();
});

test("labels each rendered footnote body with its source marker", async () => {
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    bodyHtml:
      '<span data-sefaria-note="0"></span><span data-sefaria-note="1"></span>',
    notes: [
      { key: 0, markerHtml: "*", contentHtml: null },
      { key: 1, markerHtml: "†", contentHtml: "Second note." },
    ],
  };
  render(
    html`<sefaria-text-segment ${prepared(viewModel)}></sefaria-text-segment>`,
  );

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  const footnotes =
    element?.shadowRoot?.querySelector<HTMLOListElement>(".footnotes");
  const renderedNote = footnotes?.querySelector("li");
  expect(footnotes?.children).toHaveLength(1);
  expect(renderedNote?.querySelector(".footnote-label")?.textContent).toBe("†");
  expect(renderedNote?.textContent).toContain("Second note.");
});

test("contains a long unbroken word in a 320 pixel host", async () => {
  const longWord = "word".repeat(200);
  const viewModel: TextSegmentDataViewModel = {
    ...DATA_VIEW_MODEL,
    bodyHtml: longWord,
    notes: [],
  };
  render(html`
    <div style="width: 320px">
      <sefaria-text-segment
        style="width: 100%"
        ${prepared(viewModel)}
      ></sefaria-text-segment>
    </div>
  `);

  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  await element?.updateComplete;
  const body = element?.shadowRoot?.querySelector<HTMLElement>(".body");
  expect(body).not.toBeNull();
  expect(body!.scrollWidth).toBeLessThanOrEqual(body!.clientWidth);
});

test("never calls fetch while rendering", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    throw new Error("Elements must not request.");
  });
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaTextSegment();
  setPreparedState(element, DATA_VIEW_MODEL);
  document.body.append(element);

  await element.updateComplete;

  expect(fetchMock).not.toHaveBeenCalled();
});

test("reverses vocalization locally without changing a shared frozen view model", async () => {
  const viewModel = Object.freeze({
    ...DATA_VIEW_MODEL,
    ref: "Micah 6:8",
    heRef: "מיכה ו׳:ח׳",
    direction: "rtl" as const,
    bodyHtml: "<b>הִגִּ֥יד׀</b> לְךָ֛ אָדָ֖ם׃",
    notes: Object.freeze([]),
  });
  render(html`
    <sefaria-text-segment
      data-copy="changing"
      ${prepared(viewModel)}
    ></sefaria-text-segment>
    <sefaria-text-segment
      data-copy="stable"
      ${prepared(viewModel)}
    ></sefaria-text-segment>
  `);
  const changing = document.querySelector<SefariaTextSegment>(
    '[data-copy="changing"]',
  )!;
  const stable = document.querySelector<SefariaTextSegment>(
    '[data-copy="stable"]',
  )!;
  await Promise.all([changing.updateComplete, stable.updateComplete]);

  expect(changing.shadowRoot?.textContent).toContain("הִגִּ֥יד׀");
  changing.vocalizationMode = "nikkud";
  await changing.updateComplete;
  expect(changing.shadowRoot?.textContent).toContain("הִגִּיד");
  expect(changing.shadowRoot?.textContent).toContain("אָדָם׃");
  changing.vocalizationMode = "none";
  await changing.updateComplete;
  expect(changing.shadowRoot?.textContent).toContain("הגיד");
  expect(changing.shadowRoot?.textContent).toContain("אדם");
  expect(changing.shadowRoot?.textContent).not.toContain("׃");
  changing.vocalizationMode = "taamim_and_nikkud";
  await changing.updateComplete;
  expect(changing.shadowRoot?.textContent).toContain("הִגִּ֥יד׀");
  expect(stable.shadowRoot?.textContent).toContain("הִגִּ֥יד׀");
  expect(getPreparedState<TextSegmentViewModel>(changing)).toBe(viewModel);
  expect(getPreparedState<TextSegmentViewModel>(stable)).toBe(viewModel);
});

test("rejects an invalid vocalization attribute value", async () => {
  const element = new SefariaTextSegment();
  setPreparedState(element, DATA_VIEW_MODEL);
  element.setAttribute("vocalization-mode", "punctuation-free");
  document.body.append(element);

  await expect(element.updateComplete).rejects.toThrow(TypeError);
});
