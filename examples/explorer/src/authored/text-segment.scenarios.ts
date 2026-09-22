export interface TextSegmentScenario {
  readonly id: "data" | "loading" | "empty" | "error";
  readonly title: string;
  readonly expectedStatus: "empty" | "ready" | "loading" | "error";
}
export const textSegmentDataScenario = {
  id: "data",
  title: "Data",
  expectedStatus: "ready",
} as const;
export const textSegmentLoadingScenario = {
  id: "loading",
  title: "Loading",
  expectedStatus: "loading",
} as const;
export const textSegmentEmptyScenario = {
  id: "empty",
  title: "Empty",
  expectedStatus: "empty",
} as const;
export const textSegmentErrorScenario = {
  id: "error",
  title: "Error",
  expectedStatus: "error",
} as const;
export const textSegmentScenarios: readonly TextSegmentScenario[] = [
  textSegmentDataScenario,
  textSegmentLoadingScenario,
  textSegmentEmptyScenario,
  textSegmentErrorScenario,
];
