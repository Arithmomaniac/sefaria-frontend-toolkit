import {
  createSefariaClient,
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import {
  createSourceCardController,
  type SourceCardControllerResult,
  type SourceCardControllerSnapshot,
  type SourceCardTerminalViewModel,
} from "@arithmomaniac/sefaria-web-components/source-card";

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
const committed = requireElement<HTMLElement>("#committed-ref");
const failure = requireElement<HTMLElement>("#failure");
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
let previousResult: SourceCardControllerResult | undefined;
const client = createSefariaClient({
  cache: false,
  fetch: async (requestInput, init) => {
    networkRequestCount += 1;
    status.dataset.requestCount = String(networkRequestCount);
    return fetch(requestInput, init);
  },
});
const controller = createSourceCardController(client);
const unbind = bindSourceCardController(card, controller);
const unsubscribe = controller.subscribe(renderSnapshot);

controller.setSuppliedData({ tref: "Micah 6:8" }, validatedPayload);
card.selectable = true;
syncPresentation();

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
  const tref = input.value.trim();
  if (tref.length === 0) {
    showFailure("Enter a non-blank Sefaria reference.");
    return;
  }
  hideFailure();
  loadAttempts += 1;
  attempts.textContent = `Live load attempts: ${loadAttempts}`;
  void controller.load({ tref }).catch(() => undefined);
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

function renderSnapshot(snapshot: SourceCardControllerSnapshot): void {
  if (
    previousResult !== undefined &&
    snapshot.result !== undefined &&
    snapshot.result !== previousResult
  ) {
    selectedPosition = undefined;
    card.selectedPosition = undefined;
    selectedRef.textContent =
      "Select the rendered segment to send its canonical component event to the host.";
  }
  previousResult = snapshot.result;
  const canonicalRef = committedCanonicalRef(snapshot.result?.viewModel);
  committed.textContent =
    canonicalRef === undefined
      ? "Current result has no committed canonical reference."
      : `Current committed reference: ${canonicalRef}.`;
  card.selectable =
    (snapshot.attempt.state === "loading"
      ? snapshot.attempt.viewModel
      : snapshot.result?.viewModel
    )?.state === "data";
  if (snapshot.attempt.state === "loading") {
    hideFailure();
    status.textContent = `Loading ${snapshot.attempt.request.tref} through the public controller.`;
    return;
  }
  if (snapshot.attempt.state === "failed") {
    const message = errorMessage(snapshot.attempt.error);
    showFailure(
      canonicalRef === undefined
        ? message
        : `${message} The prior committed ${canonicalRef} card remains displayed.`,
    );
    status.textContent =
      canonicalRef === undefined
        ? "The live load failed. No canonical result is committed."
        : `The live load failed. Showing the prior committed ${canonicalRef} result.`;
    return;
  }
  hideFailure();
  status.textContent =
    loadAttempts === 0
      ? canonicalRef === undefined
        ? "Supplied component content rendered with zero live loads."
        : `Supplied ${canonicalRef} data rendered with zero live loads.`
      : canonicalRef === undefined
        ? "The component committed an error result without a canonical reference."
        : `Committed canonical reference ${canonicalRef}.`;
  status.dataset.requestCount = String(networkRequestCount);
}

function syncPresentation(): void {
  card.contentLanguage = readContentLanguage(contentLanguage.value);
  card.layout = readLayout(layout.value);
  card.sideOrder = readSideOrder(sideOrder.value);
  card.vocalizationMode = readVocalizationMode(vocalizationMode.value);
}

function showFailure(message: string): void {
  failure.hidden = false;
  failure.textContent = message;
}

function hideFailure(): void {
  failure.hidden = true;
  failure.textContent = "";
}

function dispose(): void {
  form.removeEventListener("submit", onSubmit);
  contentLanguage.removeEventListener("change", syncPresentation);
  layout.removeEventListener("change", syncPresentation);
  sideOrder.removeEventListener("change", syncPresentation);
  vocalizationMode.removeEventListener("change", syncPresentation);
  card.removeEventListener("sefaria-source-select", onSourceSelection);
  unsubscribe();
  unbind();
  controller.dispose();
}

function committedCanonicalRef(
  viewModel: SourceCardTerminalViewModel | undefined,
): string | undefined {
  return viewModel?.state === "data" || viewModel?.state === "empty"
    ? viewModel.header.ref
    : undefined;
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The vanilla example requires ${selector}.`);
  }
  return element;
}
