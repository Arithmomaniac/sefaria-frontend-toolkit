export interface ReaderScenario {
  readonly id:
    | "paired"
    | "source-only"
    | "connections-only"
    | "connections-loading"
    | "connections-unavailable"
    | "truncated-history";
  readonly title: string;
  readonly activePane?: "source" | "connections";
  readonly chatExport?: boolean;
}
export const readerPairedScenario = {
  id: "paired",
  title: "Paired text and connections",
  chatExport: true,
} as const;
export const readerSourceOnlyScenario = {
  id: "source-only",
  title: "Source only",
} as const;
export const readerConnectionsOnlyScenario = {
  id: "connections-only",
  title: "Connections only",
  activePane: "connections",
} as const;
export const readerConnectionsLoadingScenario = {
  id: "connections-loading",
  title: "Connections loading",
} as const;
export const readerConnectionsUnavailableScenario = {
  id: "connections-unavailable",
  title: "Connections interrupted",
} as const;
export const readerTruncatedHistoryScenario = {
  id: "truncated-history",
  title: "Truncated retained history",
} as const;
export const readerScenarios: readonly ReaderScenario[] = [
  readerPairedScenario,
  readerSourceOnlyScenario,
  readerConnectionsOnlyScenario,
  readerConnectionsLoadingScenario,
  readerConnectionsUnavailableScenario,
  readerTruncatedHistoryScenario,
];
