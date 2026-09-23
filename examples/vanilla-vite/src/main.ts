import {
  createSefariaClient,
  text,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaAcquisition,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";

import payload from "./micah-6-8.json";
import "./style.css";

const embeddedPreview = new URLSearchParams(globalThis.location.search).has(
  "embed",
);
document.documentElement.toggleAttribute(
  "data-embedded-preview",
  embeddedPreview,
);

const status = requireElement<HTMLElement>("#status");
const attempts = requireElement<HTMLElement>("#request-count");
const form = requireElement<HTMLFormElement>("#reference-form");
const input = requireElement<HTMLInputElement>('input[name="tref"]');
const card = requireElement<SefariaSourceCard>("sefaria-source-card");
const contentLanguage = requireElement<HTMLSelectElement>("#content-language");
const layout = requireElement<HTMLSelectElement>("#layout");
const sideOrder = requireElement<HTMLSelectElement>("#side-order");
const vocalizationMode =
  requireElement<HTMLSelectElement>("#vocalization-mode");
const selectedRef = requireElement<HTMLElement>("#selected-ref");

const validatedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;
let networkRequestCount = 0;
let loadAttempts = 0;
let selectedPosition: readonly number[] | undefined;
let selectedMetadataRef: string | undefined;
status.dataset.requestCount = "0";
const client = createSefariaClient({
  cache: false,
  fetch: async (requestInput, init) => {
    networkRequestCount += 1;
    status.dataset.requestCount = String(networkRequestCount);
    return fetch(requestInput, init);
  },
});
const acquisition = createSourceCardAcquisition(client, (ref) => {
  selectedMetadataRef = ref;
});

card.acquisition = acquisition;
card.setAttribute("sref", "");
card.data = validatedPayload;
card.setAttribute("selectable", "");
syncPresentation();
const cardObserver = new MutationObserver(synchronizeCommittedReference);
cardObserver.observe(card.shadowRoot!, {
  childList: true,
  subtree: true,
  characterData: true,
});
synchronizeCommittedReference();

if (embeddedPreview) {
  form.remove();
} else {
  form.addEventListener("submit", onSubmit);
}
contentLanguage.addEventListener("change", syncPresentation);
layout.addEventListener("change", syncPresentation);
sideOrder.addEventListener("change", syncPresentation);
vocalizationMode.addEventListener("change", syncPresentation);
card.addEventListener("sefaria-source-select", onSourceSelection);
window.addEventListener("pagehide", dispose, { once: true });

function onSubmit(event: SubmitEvent): void {
  event.preventDefault();
  const sref = input.value.trim();
  if (sref.length === 0) {
    status.textContent = "Enter a non-blank Sefaria reference.";
    return;
  }
  loadAttempts += 1;
  attempts.textContent = `Live load attempts: ${loadAttempts}`;
  status.textContent = `Activated ${sref}. The Source Card reports loading and results inline.`;
  selectedPosition = undefined;
  card.selectedPosition = undefined;
  selectedRef.textContent =
    "Select the rendered segment to send its canonical component event to the host.";
  card.data = undefined;
  card.setAttribute("sref", sref);
  selectedMetadataRef = undefined;
}

function onSourceSelection(event: Event): void {
  const detail = (
    event as CustomEvent<{
      readonly position: readonly number[];
      readonly ref: string;
    }>
  ).detail;
  selectedPosition = [...detail.position];
  card.selectedPosition = [...selectedPosition];
  selectedRef.textContent = `Host received selection: ${detail.ref}.`;
}

function syncPresentation(): void {
  card.setAttribute(
    "content-language",
    readContentLanguage(contentLanguage.value),
  );
  card.setAttribute("layout", readLayout(layout.value));
  card.setAttribute("side-order", readSideOrder(sideOrder.value));
  card.setAttribute(
    "vocalization-mode",
    readVocalizationMode(vocalizationMode.value),
  );
}

function synchronizeCommittedReference(): void {
  if (
    card.status !== "ready" ||
    selectedMetadataRef === undefined ||
    loadAttempts === 0
  ) {
    return;
  }
  status.textContent = `Committed canonical reference ${selectedMetadataRef}.`;
}

function dispose(): void {
  form.removeEventListener("submit", onSubmit);
  contentLanguage.removeEventListener("change", syncPresentation);
  layout.removeEventListener("change", syncPresentation);
  sideOrder.removeEventListener("change", syncPresentation);
  vocalizationMode.removeEventListener("change", syncPresentation);
  card.removeEventListener("sefaria-source-select", onSourceSelection);
  cardObserver.disconnect();
  card.data = undefined;
  card.setAttribute("sref", "");
  card.acquisition = { kind: "disabled" };
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

function readContentLanguage(
  value: string,
): SefariaSourceCard["contentLanguage"] {
  return value === "primary" || value === "translation" ? value : "both";
}

function readLayout(value: string): SefariaSourceCard["layout"] {
  return value === "side-by-side" || value === "stacked" ? value : "auto";
}

function readSideOrder(value: string): SefariaSourceCard["sideOrder"] {
  return value === "translation-first" ? value : "primary-first";
}

function readVocalizationMode(
  value: string,
): SefariaSourceCard["vocalizationMode"] {
  return value === "nikkud" || value === "none" ? value : "taamim_and_nikkud";
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The vanilla example requires ${selector}.`);
  }
  return element;
}
