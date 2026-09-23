import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import payload from "./micah-6-8.js";

const anchor = requireElement("#anchor");
const popup = requireElement("#popup");
const state = requireElement("#state");
popup.data = zCoreV3TextsResponse.parse(payload);
popup.anchor = anchor;

anchor.addEventListener("click", () => {
  popup.setAttribute("open", "");
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
