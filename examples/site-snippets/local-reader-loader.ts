import { SefariaReader } from "@arithmomaniac/sefaria-web-components";
import type { SefariaDataLoader } from "@arithmomaniac/sefaria-web-components";

// A saved Micah 6:8 response. The Reader asks for the chapter too, so serve both refs.
const stored: unknown = await (await fetch("/data/micah-6-8.json")).json();

const localTexts = new Map<string, unknown>([
  ["Micah 6:8", stored],
  ["Micah 6", stored],
]);

const loader: SefariaDataLoader = {
  getText: async ({ sref }) => {
    if (!localTexts.has(sref)) {
      throw new Error(`No local text for ${sref}.`);
    }
    return { payload: localTexts.get(sref), status: 200 };
  },
  getLinks: async ({ sref }) => {
    if (!localTexts.has(sref)) {
      throw new Error(`No local links for ${sref}.`);
    }
    return { payload: [], status: 200 };
  },
};

const reader = document.querySelector("sefaria-reader");
if (reader instanceof SefariaReader) {
  reader.source = { kind: "custom", loader };
  reader.sref = "Micah 6:8";
}
