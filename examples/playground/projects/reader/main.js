import {
  zCoreLinkResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindReaderController } from "@arithmomaniac/sefaria-web-components/bindings";
import {
  createReaderController,
  ReaderControllerError,
} from "@arithmomaniac/sefaria-web-components/reader-controller";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
} from "@arithmomaniac/sefaria-web-components/reader-session";
import sourcePayload from "./micah-6-8.js";
import linksPayload from "./links.js";

const reader = requireElement("#reader");
const vocalization = requireElement("#vocalization");
const status = requireElement("#host-status");
const sourceRequest = Object.freeze({ tref: "Micah 6:8" });
const linksRequest = Object.freeze({ tref: "Micah 6:8", withText: true });
const source = zCoreV3TextsResponse.parse(sourcePayload);
const links = zCoreLinkResponse.parse(linksPayload);
const sourceContent = createReaderSourceContent(source, sourceRequest);
const connectionsContent = createReaderConnectionsContent(links, linksRequest, {
  category: "Quoting Commentary",
});
const dataSource = {
  loadSource: async (request) => {
    if (sameRequest(request, sourceRequest)) {
      return createReaderSourceContent(source, request);
    }
    throw new ReaderControllerError(
      "source-unavailable",
      `This supplied project does not cover ${request.tref}.`,
    );
  },
  loadConnections: async (request, projection) => {
    if (request.tref === linksRequest.tref && request.withText !== false) {
      return createReaderConnectionsContent(links, request, projection);
    }
    throw new Error(
      `This supplied project does not cover connections for ${request.tref}.`,
    );
  },
};
const controller = createReaderController(
  {
    source: sourceContent,
    connections: connectionsContent,
    selectedPosition: [],
  },
  dataSource,
);
bindReaderController(reader, controller);
controller.subscribe((snapshot) => {
  status.textContent =
    snapshot.task.state === "error"
      ? `${snapshot.task.code}: ${snapshot.task.message}`
      : "This finite project covers Micah 6:8 source and connections only.";
});
vocalization.addEventListener("change", () => {
  controller.setPresentation({
    originEntryId: controller.snapshot.reader.currentEntryId,
    patch: { vocalizationMode: vocalization.value },
  });
});

function sameRequest(left, right) {
  return (
    left.tref === right.tref &&
    left.primary === right.primary &&
    left.translation === right.translation
  );
}

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
