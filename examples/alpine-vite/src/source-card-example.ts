import {
  createSefariaClient,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import {
  createSourceCardController,
  type SourceCardControllerResult,
  type SourceCardControllerSnapshot,
  type SourceCardTerminalViewModel,
} from "@arithmomaniac/sefaria-web-components/source-card";

import payload from "./micah-6-8.json";

const suppliedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;

interface SourceSelection {
  readonly position: readonly number[];
  readonly ref: string;
}

interface AlpineSourceCardState {
  tref: string;
  contentLanguage: SefariaSourceCard["contentLanguage"];
  layout: SefariaSourceCard["layout"];
  sideOrder: SefariaSourceCard["sideOrder"];
  vocalizationMode: SefariaSourceCard["vocalizationMode"];
  theme: "light" | "dark";
  previewWidth: number;
  selectable: boolean;
  selectedPosition: readonly number[] | undefined;
  selectedRef: string | undefined;
  committedRef: string | undefined;
  loadAttempts: number;
  status: string;
  failure: string | undefined;
  attach(
    element: SefariaSourceCard,
    reactiveState: AlpineSourceCardState,
  ): void;
  syncCard(
    element: SefariaSourceCard,
    contentLanguage: SefariaSourceCard["contentLanguage"],
    layout: SefariaSourceCard["layout"],
    sideOrder: SefariaSourceCard["sideOrder"],
    vocalizationMode: SefariaSourceCard["vocalizationMode"],
    selectable: boolean,
    selectedPosition: readonly number[] | undefined,
  ): void;
  selectSource(event: CustomEvent<SourceSelection>): void;
  loadReference(): Promise<void>;
  destroy(): void;
}

export function createAlpineSourceCardExample(
  suppliedClient?: SefariaClient,
): AlpineSourceCardState {
  const client = suppliedClient ?? createSefariaClient({ cache: false });
  const controller = createSourceCardController(client);
  controller.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
  let unbind: (() => void) | undefined;
  let unsubscribe: (() => void) | undefined;
  let host: AlpineSourceCardState | undefined;
  let previousResult: SourceCardControllerResult | undefined;
  let disposed = false;

  const state: AlpineSourceCardState = {
    tref: "Micah 6:8",
    contentLanguage: "both",
    layout: "auto",
    sideOrder: "primary-first",
    vocalizationMode: "taamim_and_nikkud",
    theme: "light",
    previewWidth: 720,
    selectable: true,
    selectedPosition: undefined,
    selectedRef: undefined,
    committedRef: "Micah 6:8",
    loadAttempts: 0,
    status: "Supplied Micah 6:8 data rendered with zero live loads.",
    failure: undefined,

    attach(element, reactiveState) {
      if (disposed || unbind !== undefined) return;
      host = reactiveState;
      unbind = bindSourceCardController(element, controller);
      unsubscribe = controller.subscribe((snapshot) => {
        if (host === undefined) return;
        applySnapshot(host, snapshot, previousResult);
        previousResult = snapshot.result;
      });
    },

    syncCard(
      element,
      contentLanguage,
      layout,
      sideOrder,
      vocalizationMode,
      selectable,
      selectedPosition,
    ) {
      element.contentLanguage = contentLanguage;
      element.layout = layout;
      element.sideOrder = sideOrder;
      element.vocalizationMode = vocalizationMode;
      element.selectable = selectable;
      element.selectedPosition =
        selectedPosition === undefined ? undefined : [...selectedPosition];
    },

    selectSource(event) {
      this.selectedPosition = [...event.detail.position];
      this.selectedRef = event.detail.ref;
    },

    async loadReference() {
      const normalized = this.tref.trim();
      if (normalized.length === 0) {
        this.failure = "Enter a non-blank Sefaria reference.";
        return;
      }
      this.failure = undefined;
      this.loadAttempts += 1;
      try {
        await controller.load({ tref: normalized });
      } catch {
        // The controller snapshot carries the original failure for the UI.
      }
    },

    destroy() {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      unsubscribe = undefined;
      unbind?.();
      unbind = undefined;
      host = undefined;
      controller.dispose();
    },
  };

  return state;
}

function applySnapshot(
  host: AlpineSourceCardState,
  snapshot: SourceCardControllerSnapshot,
  previousResult: SourceCardControllerResult | undefined,
): void {
  if (
    previousResult !== undefined &&
    snapshot.result !== undefined &&
    snapshot.result !== previousResult
  ) {
    host.selectedPosition = undefined;
    host.selectedRef = undefined;
  }
  const canonicalRef = committedCanonicalRef(snapshot.result?.viewModel);
  host.committedRef = canonicalRef;
  host.selectable =
    (snapshot.attempt.state === "loading"
      ? snapshot.attempt.viewModel
      : snapshot.result?.viewModel
    )?.state === "data";
  if (snapshot.attempt.state === "loading") {
    host.failure = undefined;
    host.status = `Loading ${snapshot.attempt.request.tref} through the public controller.`;
    return;
  }
  if (snapshot.attempt.state === "failed") {
    const message = errorMessage(snapshot.attempt.error);
    host.failure =
      canonicalRef === undefined
        ? message
        : `${message} The prior committed ${canonicalRef} card remains displayed.`;
    host.status =
      canonicalRef === undefined
        ? "The live load failed. No canonical result is committed."
        : `The live load failed. Showing the prior committed ${canonicalRef} result.`;
    return;
  }
  host.failure = undefined;
  host.status =
    host.loadAttempts === 0
      ? canonicalRef === undefined
        ? "Supplied component content rendered with zero live loads."
        : `Supplied ${canonicalRef} data rendered with zero live loads.`
      : canonicalRef === undefined
        ? "The component committed an error result without a canonical reference."
        : `Committed canonical reference ${canonicalRef}.`;
}

function committedCanonicalRef(
  viewModel: SourceCardTerminalViewModel | undefined,
): string | undefined {
  return viewModel?.state === "data" || viewModel?.state === "empty"
    ? viewModel.header.ref
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
