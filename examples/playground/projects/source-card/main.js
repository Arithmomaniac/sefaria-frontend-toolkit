import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createSourceCardController } from "@arithmomaniac/sefaria-web-components/source-card";
import payload from "./micah-6-8.js";

const card = globalThis.document.querySelector("#source-card");
const vocalization = globalThis.document.querySelector("#vocalization");
const selection = globalThis.document.querySelector("#selection");
if (!card) throw new Error("The example requires #source-card.");
if (!vocalization) throw new Error("The example requires #vocalization.");
if (!selection) throw new Error("The example requires #selection.");

const validatedPayload = zCoreV3TextsResponse.parse(payload);
const controller = createSourceCardController();
bindSourceCardController(card, controller);
controller.setSuppliedData(
  {
    tref: "Micah 6:8",
  },
  validatedPayload,
);
card.selectable = true;
vocalization.addEventListener("change", () => {
  card.vocalizationMode = vocalization.value;
});
card.addEventListener("sefaria-source-select", (event) => {
  selection.textContent = `Selected ${event.detail.ref} at position ${event.detail.position.join(".")}.`;
});
