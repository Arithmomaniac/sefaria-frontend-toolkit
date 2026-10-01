import {
  zCoreLinkResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import sourcePayload from "./micah-6-8.js";
import linksPayload from "./links.js";

const reader = requireElement("#reader");
const vocalization = requireElement("#vocalization");
const status = requireElement("#host-status");
const fallbackOpen = requireElement("#fallback-open");
const sourceRequest = Object.freeze({ tref: "Micah 6:8" });
const linksRequest = Object.freeze({ tref: "Micah 6:8", withText: true });
const source = zCoreV3TextsResponse.parse(sourcePayload);
const localSource = {
  ...source,
  sectionRef: source.ref,
  heSectionRef: source.heRef,
};
const links = zCoreLinkResponse.parse(linksPayload);
reader.source = {
  kind: "custom",
  loader: {
    getText: async (request) => {
      if (
        (request.sref === sourceRequest.tref || request.sref === "Micah 6") &&
        request.returnFormat === "default" &&
        request.versions.join(",") === "primary,translation"
      ) {
        return { payload: localSource, status: 200 };
      }
      throw new Error(`This supplied project does not cover ${request.sref}.`);
    },
    getLinks: async (request) => {
      if (
        request.sref === linksRequest.tref &&
        request.withText === linksRequest.withText
      ) {
        return { payload: links, status: 200 };
      }
      throw new Error(
        `This supplied project does not cover connections for ${request.sref}.`,
      );
    },
  },
};
reader.sref = sourceRequest.tref;
reader.addEventListener("sefaria-reader-error", () => {
  if (reader.readerError !== undefined) {
    status.textContent = reader.readerError;
  } else {
    status.textContent =
      "This finite project covers Micah 6:8 source and connections only.";
  }
});
fallbackOpen.addEventListener("click", () => {
  status.textContent =
    "This supplied project does not cover additional navigation.";
});

vocalization.addEventListener("change", () => {
  reader.setAttribute("vocalization-mode", vocalization.value);
});

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
