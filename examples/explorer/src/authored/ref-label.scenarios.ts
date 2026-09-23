export interface RefLabelScenario {
  readonly id: "data" | "loading" | "empty" | "error";
  readonly title: string;
  readonly expectedStatus: "empty" | "ready" | "loading" | "error";
}
export const refLabelDataScenario = {
  id: "data",
  title: "Reference label data",
  expectedStatus: "ready",
} as const;
export const refLabelLoadingScenario = {
  id: "loading",
  title: "Reference label loading",
  expectedStatus: "loading",
} as const;
export const refLabelEmptyScenario = {
  id: "empty",
  title: "Reference label empty",
  expectedStatus: "empty",
} as const;
export const refLabelErrorScenario = {
  id: "error",
  title: "Reference label error",
  expectedStatus: "error",
} as const;
export const refLabelScenarios: readonly RefLabelScenario[] = [
  refLabelDataScenario,
  refLabelLoadingScenario,
  refLabelEmptyScenario,
  refLabelErrorScenario,
];
