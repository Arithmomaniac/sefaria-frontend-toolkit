export interface SourceCardScenario {
  readonly id:
    | "one-item"
    | "many-items"
    | "hidden-addresses"
    | "one-sided"
    | "loading"
    | "empty"
    | "error";
  readonly title: string;
  readonly expectedStatus: "empty" | "ready" | "loading" | "error";
  readonly selectable?: boolean;
  readonly selectedPosition?: readonly number[];
  readonly showAddressLabels?: boolean;
}
export const sourceCardOneItemScenario = {
  id: "one-item",
  title: "One-item source card",
  expectedStatus: "ready",
} as const;
export const sourceCardManyItemsScenario = {
  id: "many-items",
  title: "Multi-item source card",
  expectedStatus: "ready",
  selectable: true,
  selectedPosition: [1],
} as const;
export const sourceCardHiddenAddressesScenario = {
  ...sourceCardManyItemsScenario,
  id: "hidden-addresses",
  title: "Selectable source card without visible labels",
  showAddressLabels: false,
} as const;
export const sourceCardOneSidedScenario = {
  id: "one-sided",
  title: "One-sided source card",
  expectedStatus: "ready",
} as const;
export const sourceCardLoadingScenario = {
  id: "loading",
  title: "Loading source card",
  expectedStatus: "loading",
} as const;
export const sourceCardEmptyScenario = {
  id: "empty",
  title: "Empty source card",
  expectedStatus: "empty",
} as const;
export const sourceCardErrorScenario = {
  id: "error",
  title: "Source-card error",
  expectedStatus: "error",
} as const;
export const sourceCardScenarios: readonly SourceCardScenario[] = [
  sourceCardOneItemScenario,
  sourceCardManyItemsScenario,
  sourceCardHiddenAddressesScenario,
  sourceCardOneSidedScenario,
  sourceCardLoadingScenario,
  sourceCardEmptyScenario,
  sourceCardErrorScenario,
];
