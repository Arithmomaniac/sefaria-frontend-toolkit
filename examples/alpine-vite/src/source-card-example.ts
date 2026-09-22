import {
  createSefariaClient,
  text,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import type {
  SefariaAcquisition,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";

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
  committedRef: string;
  loadAttempts: number;
  status: string;
  inputFailure: string | undefined;
  attach(
    element: SefariaSourceCard,
    reactiveState: AlpineSourceCardState,
  ): void;
  syncPresentation(
    element: SefariaSourceCard,
    contentLanguage: SefariaSourceCard["contentLanguage"],
    layout: SefariaSourceCard["layout"],
    sideOrder: SefariaSourceCard["sideOrder"],
    vocalizationMode: SefariaSourceCard["vocalizationMode"],
    selectable: boolean,
    selectedPosition: readonly number[] | undefined,
  ): void;
  selectSource(event: CustomEvent<SourceSelection>): void;
  loadReference(): void;
  destroy(): void;
}

export function createAlpineSourceCardExample(
  suppliedClient?: SefariaClient,
): AlpineSourceCardState {
  const client = suppliedClient ?? createSefariaClient({ cache: false });
  let card: SefariaSourceCard | undefined;
  let observer: MutationObserver | undefined;
  let host: AlpineSourceCardState | undefined;
  let selectedMetadataRef: string | undefined;
  let disposed = false;
  const acquisition = createSourceCardAcquisition(client, (ref) => {
    selectedMetadataRef = ref;
  });

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
    inputFailure: undefined,

    attach(element, reactiveState) {
      if (disposed || card !== undefined) return;
      card = element;
      host = reactiveState;
      element.acquisition = acquisition;
      element.sref = "";
      element.data = suppliedPayload;
      const synchronizeCommittedReference = (): void => {
        if (
          element.status !== "ready" ||
          selectedMetadataRef === undefined ||
          host === undefined ||
          host.loadAttempts === 0
        ) {
          return;
        }
        host.committedRef = selectedMetadataRef;
        host.status = `Committed canonical reference ${selectedMetadataRef}.`;
      };
      observer = new MutationObserver(synchronizeCommittedReference);
      observer.observe(element.shadowRoot!, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      synchronizeCommittedReference();
    },

    syncPresentation(
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

    loadReference() {
      const normalized = this.tref.trim();
      if (normalized.length === 0) {
        this.inputFailure = "Enter a non-blank Sefaria reference.";
        return;
      }
      if (card === undefined || disposed) return;
      this.inputFailure = undefined;
      this.selectedPosition = undefined;
      this.selectedRef = undefined;
      this.loadAttempts += 1;
      this.status = `Activated ${normalized}. The Source Card reports loading and results inline.`;
      selectedMetadataRef = undefined;
      card.data = undefined;
      card.sref = normalized;
    },

    destroy() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      observer = undefined;
      if (card !== undefined) {
        card.data = undefined;
        card.sref = "";
        card.acquisition = { kind: "disabled" };
      }
      card = undefined;
      host = undefined;
    },
  };

  return state;
}

function createSourceCardAcquisition(
  client: SefariaClient,
  selectMetadata: (ref: string) => void,
): SefariaAcquisition {
  return {
    kind: "capability",
    capability: {
      getText: async (request, signal) => {
        const result = await text.getV3Texts({
          client,
          path: { tref: request.sref },
          query: {
            version: [...request.versions],
            return_format: request.returnFormat,
          },
          signal,
        });
        if (result.data !== undefined) {
          selectMetadata(result.data.ref);
          return { payload: result.data, status: 200 };
        }
        if (result.error !== undefined && result.response !== undefined) {
          return {
            payload: result.error,
            status: result.response.status,
          };
        }
        throw new Error("The source-card request returned no result.");
      },
    },
  };
}
