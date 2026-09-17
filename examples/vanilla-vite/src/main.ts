import {
  createSefariaClient,
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import {
  createSourceCardViewModel,
  loadSourceCardViewModel,
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
const loadButton = requireElement<HTMLButtonElement>("#load-live");
const card = requireElement<SefariaSourceCard>("sefaria-source-card");

const validatedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;
let requestCount = 0;
let activeController: AbortController | undefined;
let activeOperation = 0;

card.viewModel = createSourceCardViewModel(validatedPayload, {
  tref: "Micah 6:8",
});
card.selectable = true;
updateStatus("Rendered supplied Micah 6:8 data with zero requests.");

if (embeddedPreview) {
  loadButton.remove();
} else {
  loadButton.addEventListener("click", () => {
    void loadLive();
  });
}

async function loadLive(): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const operation = ++activeOperation;
  const previousViewModel = card.viewModel;
  loadButton.disabled = true;
  card.viewModel = {
    state: "loading",
    message: "Loading live Micah 6:8 data.",
  };
  updateStatus("Loading live Micah 6:8 data from Sefaria.");
  try {
    const viewModel = await loadSourceCardViewModel(
      { tref: "Micah 6:8" },
      createSefariaClient({
        cache: false,
        fetch: async (input, init) => {
          requestCount += 1;
          updateStatus(status.textContent ?? "");
          return fetch(input, init);
        },
      }),
      controller.signal,
    );
    if (operation !== activeOperation || controller.signal.aborted) {
      return;
    }
    card.viewModel = viewModel;
    updateStatus("Loaded live Micah 6:8 data from Sefaria.");
  } catch (error) {
    if (operation !== activeOperation || controller.signal.aborted) {
      return;
    }
    card.viewModel = previousViewModel;
    updateStatus(error instanceof Error ? error.message : String(error));
  } finally {
    if (operation === activeOperation) {
      loadButton.disabled = false;
    }
  }
}

function updateStatus(message: string): void {
  status.textContent = message;
  status.dataset.requestCount = String(requestCount);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The vanilla example requires ${selector}.`);
  }
  return element;
}
