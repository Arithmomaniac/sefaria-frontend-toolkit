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
  bodyHtml:
    '<span data-sefaria-overlay="Vilna Pages">הִגִּ֥יד׀</span><br><span data-sefaria-ref="Micah 6:8">אָדָ֛ם׃</span><span data-sefaria-note="0"></span><span data-sefaria-note="1"></span>',
  notes: [
    { key: 0, markerHtml: "א֑", contentHtml: null },
    { key: 1, markerHtml: "ב֑", contentHtml: "" },
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
    expect(display.notes).toEqual([
      { key: 0, markerHtml: "א", contentHtml: null },
      { key: 1, markerHtml: "ב", contentHtml: "" },
    ]);
    expect(display.bodyHtml).toBe(
      '<span data-sefaria-overlay="Vilna Pages">הגיד׀</span><br><span data-sefaria-ref="Micah 6:8">אדם</span><span data-sefaria-note="0"></span><span data-sefaria-note="1"></span>',
    );
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
