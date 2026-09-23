export interface BilingualSegmentScenario {
  readonly id: "data" | "loading" | "partial" | "empty" | "error";
  readonly title: string;
  readonly expectedStatus: "empty" | "ready" | "loading" | "error";
}
export const bilingualSegmentDataScenario = {
  id: "data",
  title: "Data",
  expectedStatus: "ready",
} as const;
export const bilingualSegmentLoadingScenario = {
  id: "loading",
  title: "Loading",
  expectedStatus: "loading",
} as const;
export const bilingualSegmentPartialScenario = {
  id: "partial",
  title: "Partial",
  expectedStatus: "ready",
} as const;
export const bilingualSegmentEmptyScenario = {
  id: "empty",
  title: "Empty",
  expectedStatus: "empty",
} as const;
export const bilingualSegmentErrorScenario = {
  id: "error",
  title: "Error",
  expectedStatus: "error",
} as const;
export const bilingualSegmentScenarios: readonly BilingualSegmentScenario[] = [
  bilingualSegmentDataScenario,
  bilingualSegmentLoadingScenario,
  bilingualSegmentPartialScenario,
  bilingualSegmentEmptyScenario,
  bilingualSegmentErrorScenario,
];
