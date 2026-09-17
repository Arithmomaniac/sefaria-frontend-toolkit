import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindPopupController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createPopupController } from "@arithmomaniac/sefaria-web-components/popup";
import payload from "./micah-6-8.js";

const anchor = requireElement("#anchor");
const popup = requireElement("#popup");
const state = requireElement("#state");
const controller = createPopupController();
bindPopupController(popup, controller);
controller.setSuppliedData(
  { tref: "Micah 6:8" },
  zCoreV3TextsResponse.parse(payload),
);
popup.anchor = anchor;

anchor.addEventListener("click", () => {
  popup.open = true;
  state.textContent = "Popup open. Press Escape to close.";
});
popup.addEventListener("sefaria-popup-close", () => {
  state.textContent = "Popup closed and focus restored.";
});

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
