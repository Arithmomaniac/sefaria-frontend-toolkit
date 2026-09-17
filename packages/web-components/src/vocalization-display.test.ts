import * as transforms from "@arithmomaniac/sefaria-text-transform";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TextSegmentDataViewModel } from "./text-segment.js";
import { deriveTextSegmentDisplay } from "./vocalization-display.js";

const viewModel: TextSegmentDataViewModel = {
  state: "data",
  ref: "Micah 6:8",
  heRef: "מיכה ו׳:ח׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  body: [
    {
      kind: "html",
      html: '<span dir="rtl" data-overlay="Vilna Pages">הִגִּ֥יד׀</span><br><a data-ref="Micah 6:8" href="https://www.sefaria.org/Micah.6.8">אָדָ֛ם׃</a>',
    },
    { kind: "footnote-marker", noteIndex: 0, markerText: "א֑" },
    { kind: "footnote-marker", noteIndex: 1, markerText: "ב֑" },
  ],
  notes: [
    { index: 0, markerText: "א֑", content: null },
    { index: 1, markerText: "ב֑", content: "" },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deriveTextSegmentDisplay", () => {
  it("returns the original safe view model in full mode without transform calls", () => {
    const applyVocalization = vi.spyOn(transforms, "applyVocalization");
    const applyVocalizationToHtml = vi.spyOn(
      transforms,
      "applyVocalizationToHtml",
    );
    expect(deriveTextSegmentDisplay(viewModel, "taamim_and_nikkud")).toBe(
      viewModel,
    );
    expect(applyVocalization).not.toHaveBeenCalled();
    expect(applyVocalizationToHtml).not.toHaveBeenCalled();
  });

  it("derives non-full content without changing structure or null and empty bodies", () => {
    const display = deriveTextSegmentDisplay(viewModel, "none");

    expect(display).not.toBe(viewModel);
    expect(display.body).toHaveLength(viewModel.body.length);
    expect(display.notes).toEqual([
      { index: 0, markerText: "א", content: null },
      { index: 1, markerText: "ב", content: "" },
    ]);
    expect(display.body[0]).toEqual({
      kind: "html",
      html: '<span data-overlay="Vilna Pages" dir="rtl">הגיד׀</span><br><a data-ref="Micah 6:8" href="https://www.sefaria.org/Micah.6.8">אדם</a>',
    });
  });

  it("rejects an unsupported runtime preset", () => {
    expect(() =>
      deriveTextSegmentDisplay(
        viewModel,
        "punctuation-free" as transforms.VocalizationMode,
      ),
    ).toThrow(TypeError);
  });
});
