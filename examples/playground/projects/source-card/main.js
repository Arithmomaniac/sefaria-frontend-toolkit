import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { createSourceCardViewModel } from "@arithmomaniac/sefaria-web-components/source-card";
import payload from "./micah-6-8.js";

const card = globalThis.document.querySelector("#source-card");
if (!card) throw new Error("The example requires #source-card.");

const validatedPayload = zCoreV3TextsResponse.parse(payload);
card.viewModel = createSourceCardViewModel(validatedPayload, {
  tref: "Micah 6:8",
});
card.selectable = true;
