import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindTextSegmentController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createTextSegmentController } from "@arithmomaniac/sefaria-web-components/text-segment";
import payload from "./micah-6-8.js";

const segment = requireElement("#segment");
const edition = requireElement("#edition");
const selection = requireElement("#selection");
const validatedPayload = zCoreV3TextsResponse.parse(payload);
const controller = createTextSegmentController();
bindTextSegmentController(segment, controller);

const editions = {
  hebrew: {
    language: "hebrew",
    versionTitle: "Deterministic example Hebrew",
  },
  english: {
    language: "english",
    versionTitle: "Deterministic example translation",
  },
};
const render = () => {
  const version = editions[edition.value];
  if (!version) throw new Error(`Unknown edition ${edition.value}.`);
  const viewModel = controller.setSuppliedData(
    { tref: "Micah 6:8", version },
    validatedPayload,
  );
  selection.textContent =
    viewModel.state === "data"
      ? `${viewModel.actualLanguage} · ${viewModel.direction}`
      : viewModel.state;
};
edition.addEventListener("change", render);
render();

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
