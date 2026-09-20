import type {
  BilingualSegmentViewModel,
  TextSegmentDataViewModel,
} from "@arithmomaniac/sefaria-web-components";

export interface BilingualSegmentScenario {
  readonly id: "data" | "loading" | "partial" | "empty" | "error";
  readonly title: string;
  readonly viewModel: BilingualSegmentViewModel;
}

export const primarySide = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  bodyHtml:
    '<b>בְּרֵאשִׁית</b> בָּרָא אֱלֹהִים<span data-sefaria-note="0"></span>',
  notes: [
    {
      key: 0,
      markerHtml: "*",
      contentHtml: "Static note supplied by the view model.",
    },
  ],
} satisfies TextSegmentDataViewModel;

export const translationSide = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  bodyHtml:
    "When God began to create heaven and earth, the earth being unformed and void.",
  notes: [],
} satisfies TextSegmentDataViewModel;

export const bilingualSegmentDataScenario = {
  id: "data",
  title: "Data",
  viewModel: {
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    primary: primarySide,
    translation: translationSide,
  },
} satisfies BilingualSegmentScenario;

export const bilingualSegmentLoadingScenario = {
  id: "loading",
  title: "Loading",
  viewModel: {
    state: "loading",
    message: "Loading Genesis 1:1.",
  },
} satisfies BilingualSegmentScenario;

export const bilingualSegmentPartialScenario = {
  id: "partial",
  title: "Partial",
  viewModel: {
    state: "partial",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    present: { side: "primary", view: primarySide },
    absent: {
      side: "translation",
      message: "No translation version is available.",
    },
  },
} satisfies BilingualSegmentScenario;

export const bilingualSegmentEmptyScenario = {
  id: "empty",
  title: "Empty",
  viewModel: {
    state: "empty",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    absent: [
      { side: "primary", message: "No primary version is available." },
      { side: "translation", message: "No translation version is available." },
    ],
  },
} satisfies BilingualSegmentScenario;

export const bilingualSegmentErrorScenario = {
  id: "error",
  title: "Error",
  viewModel: {
    state: "error",
    errorKind: "projection",
    message: "This response contains a section, not one text segment.",
  },
} satisfies BilingualSegmentScenario;

export const bilingualSegmentScenarios: readonly BilingualSegmentScenario[] = [
  bilingualSegmentDataScenario,
  bilingualSegmentLoadingScenario,
  bilingualSegmentPartialScenario,
  bilingualSegmentEmptyScenario,
  bilingualSegmentErrorScenario,
];
