import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import payload from "./micah-6-8.js";

const card = globalThis.document.querySelector("#source-card");
const vocalization = globalThis.document.querySelector("#vocalization");
const selection = globalThis.document.querySelector("#selection");
if (!card) throw new Error("The example requires #source-card.");
if (!vocalization) throw new Error("The example requires #vocalization.");
if (!selection) throw new Error("The example requires #selection.");

const validatedPayload = zCoreV3TextsResponse.parse(payload);
card.data = validatedPayload;
card.selectable = true;
vocalization.addEventListener("change", () => {
  card.vocalizationMode = vocalization.value;
});
card.addEventListener("sefaria-source-select", (event) => {
  selection.textContent = `Selected ${event.detail.ref} at position ${event.detail.position.join(".")}.`;
});
