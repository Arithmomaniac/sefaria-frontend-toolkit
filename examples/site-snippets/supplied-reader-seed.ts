import { SefariaReader } from "@arithmomaniac/sefaria-web-components";
import type { ReaderRawSeedData } from "@arithmomaniac/sefaria-web-components";

// The same saved Micah 6:8 response, used as the Reader's starting point.
const stored: unknown = await (await fetch("/data/micah-6-8.json")).json();

const seed: ReaderRawSeedData = {
  source: {
    payload: stored,
    status: 200,
    effectiveRequest: { tref: "Micah 6:8" },
  },
  selectedRef: "Micah 6:8",
};

// The Reader shows the seeded text at once, then loads the connections
// it wasn't given.
const reader = document.querySelector("sefaria-reader");
if (reader instanceof SefariaReader) {
  reader.data = seed;
}
