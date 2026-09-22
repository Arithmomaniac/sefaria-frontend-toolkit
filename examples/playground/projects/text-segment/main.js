import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import payload from "./micah-6-8.js";

const segment = requireElement("#segment");
const edition = requireElement("#edition");
const selection = requireElement("#selection");
const validatedPayload = zCoreV3TextsResponse.parse(payload);
segment.data = validatedPayload;

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
const render = async () => {
  const version = editions[edition.value];
  if (!version) throw new Error(`Unknown edition ${edition.value}.`);
  segment.versionLanguage = version.language;
  segment.versionTitle = version.versionTitle;
  await segment.updateComplete;
  selection.textContent = segment.selectedVersion
    ? `${segment.selectedVersion.actualLanguage} · ${segment.selectedVersion.direction}`
    : "unavailable";
};
edition.addEventListener("change", () => void render());
void render();

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
