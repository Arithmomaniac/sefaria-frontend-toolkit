export interface ConnectionsPanelScenario {
  readonly id:
    "summary" | "details" | "metadata-only" | "loading" | "empty" | "error";
  readonly title: string;
  readonly expectedStatus: "empty" | "ready" | "loading" | "error";
}
export const connectionsSummaryScenario = {
  id: "summary",
  title: "Category summary",
  expectedStatus: "ready",
} as const;
export const connectionsDetailsScenario = {
  id: "details",
  title: "Detail page with partial preview",
  expectedStatus: "ready",
} as const;
export const connectionsMetadataScenario = {
  id: "metadata-only",
  title: "Labels only",
  expectedStatus: "ready",
} as const;
export const connectionsLoadingScenario = {
  id: "loading",
  title: "Loading connections",
  expectedStatus: "loading",
} as const;
export const connectionsEmptyScenario = {
  id: "empty",
  title: "No text connections",
  expectedStatus: "empty",
} as const;
export const connectionsErrorScenario = {
  id: "error",
  title: "Connections error",
  expectedStatus: "error",
} as const;
export const connectionsPanelScenarios: readonly ConnectionsPanelScenario[] = [
  connectionsSummaryScenario,
  connectionsDetailsScenario,
  connectionsMetadataScenario,
  connectionsLoadingScenario,
  connectionsEmptyScenario,
  connectionsErrorScenario,
];
