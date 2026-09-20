import type { TextSegmentViewModel } from "@arithmomaniac/sefaria-web-components";

export interface TextSegmentScenario {
  readonly id: "data" | "loading" | "empty" | "error";
  readonly title: string;
  readonly viewModel: TextSegmentViewModel;
}

export const textSegmentDataScenario = {
  id: "data",
  title: "Data",
  viewModel: {
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    language: "he",
    actualLanguage: "he",
    direction: "rtl",
    bodyHtml:
      '<b>בְּרֵאשִׁית</b> בָּרָא אֱלֹהִים<span data-sefaria-note="0"></span> — In the beginning.',
    notes: [
      {
        key: 0,
        markerHtml: "*",
        contentHtml: "Static note supplied by the view model.",
      },
    ],
  },
} satisfies TextSegmentScenario;

export const textSegmentLoadingScenario = {
  id: "loading",
  title: "Loading",
  viewModel: {
    state: "loading",
    message: "Loading Genesis 1:1.",
  },
} satisfies TextSegmentScenario;

export const textSegmentEmptyScenario = {
  id: "empty",
  title: "Empty",
  viewModel: {
    state: "empty",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    message: "No English version is available.",
    warnings: ["No English version is available."],
  },
} satisfies TextSegmentScenario;

export const textSegmentErrorScenario = {
  id: "error",
  title: "Error",
  viewModel: {
    state: "error",
    errorKind: "projection",
    message: "This response contains a section, not one text segment.",
  },
} satisfies TextSegmentScenario;

export const textSegmentScenarios: readonly TextSegmentScenario[] = [
  textSegmentDataScenario,
  textSegmentLoadingScenario,
  textSegmentEmptyScenario,
  textSegmentErrorScenario,
];
