import {
  createSefariaClient,
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createSourceCardController } from "@arithmomaniac/sefaria-web-components/source-card";
import payload from "./micah-6-8.json";
import "./style.css";

const status = requireElement<HTMLElement>("#status");
const loadButton = requireElement<HTMLButtonElement>("#load-live");
const card = requireElement<SefariaSourceCard>("sefaria-source-card");

const validatedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;
let requestCount = 0;
const client = createSefariaClient({
  cache: false,
  fetch: async (input, init) => {
    requestCount += 1;
    updateStatus(status.textContent ?? "");
    return fetch(input, init);
  },
});
const controller = createSourceCardController(client);
const unbind = bindSourceCardController(card, controller);

controller.setSuppliedData(
  {
    tref: "Micah 6:8",
  },
  validatedPayload,
);
card.selectable = true;
updateStatus("Rendered supplied Micah 6:8 data with zero requests.");

loadButton.addEventListener("click", () => {
  void loadLive();
});

async function loadLive(): Promise<void> {
  loadButton.disabled = true;
  updateStatus("Loading live Micah 6:8 data from Sefaria.");
  try {
    await controller.load({ tref: "Micah 6:8" });
    updateStatus("Loaded live Micah 6:8 data from Sefaria.");
  } catch (error) {
    updateStatus(error instanceof Error ? error.message : String(error));
  } finally {
    loadButton.disabled = false;
  }
}

window.addEventListener(
  "pagehide",
  () => {
    unbind();
    controller.dispose();
  },
  { once: true },
);

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
