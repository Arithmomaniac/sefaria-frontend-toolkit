import {
  validateGetV3Texts200,
  zCoreLinkResponse,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { expect, test } from "vitest";

import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
  getReaderConnectionsRecord,
  getReaderSourceRecord,
} from "./reader-session.js";
import {
  createReaderSession,
  type ReaderSession,
} from "./reader-session-facade.js";

function source(tref: string) {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 text fixture.");
  }
  const payload = structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
  payload.ref = tref;
  payload.heRef = tref;
  const content = createReaderSourceContent(payload, { tref });
  const selectedPosition =
    content.viewModel.state === "data"
      ? content.viewModel.items[0]?.position
      : undefined;
  if (selectedPosition === undefined) {
    throw new TypeError("Expected one addressable source item.");
  }
  return {
    record: getReaderSourceRecord(content),
    selectedPosition,
  };
}

function connections(tref: string) {
  const payload = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
  return getReaderConnectionsRecord(
    createReaderConnectionsContent(
      payload,
      { tref, withText: true },
      { category: "Commentary" },
    ),
  );
}

function applied<T>(
  transition:
    | {
        readonly state: "applied";
        readonly session: ReaderSession;
        readonly value: T;
      }
    | {
        readonly state: "rejected";
        readonly reason: string;
        readonly message: string;
      },
) {
  if (transition.state === "rejected") {
    throw new Error(`${transition.reason}: ${transition.message}`);
  }
  return transition;
}

test("exposes semantic history and stable raw records without prepared data", () => {
  const sourceSeed = source("Micah 6:8");
  const connectionsRecord = connections("Micah 6:8");
  const session = createReaderSession({
    source: sourceSeed,
    connections: { record: connectionsRecord },
  });

  expect(session.sourceRecord()).toBe(sourceSeed.record);
  expect(session.connectionsRecord()).toBe(connectionsRecord);
  expect(session.sourceRecord()).toBe(session.sourceRecord());
  expect(session.connectionsRecord()).toBe(session.connectionsRecord());
  expect(session.state.current).toMatchObject({
    sourceAvailable: true,
    connections: "available",
    selectedPosition: sourceSeed.selectedPosition,
  });
  expect(JSON.stringify(session.state)).not.toMatch(
    /viewModel|ReaderSessionView|ReaderEntryView/u,
  );
});

test("preserves transitions, pins, unique capture accounting, and zero-I/O history", () => {
  const seed = source("Micah 6:8");
  let session = createReaderSession({ source: seed }, { maxEntries: 3 });
  const initialBytes = session.state.retainedCaptureBytes;
  const started = applied(
    session.beginSourceNavigation(session.state.currentEntryId, {
      tref: "Micah 6:8",
    }),
  );
  const completed = applied(
    started.session.completeSourceNavigation(started.value.operationId, {
      source: seed,
    }),
  );
  session = completed.session;

  expect(session.state.entries).toHaveLength(2);
  expect(session.state.retainedCaptureBytes).toBe(initialBytes);
  const pinned = applied(session.pin(session.state.currentEntryId));
  const blocked = pinned.session.back();
  expect(blocked).toMatchObject({
    state: "rejected",
    reason: "entry-pinned",
  });
  const released = applied(blocked.session.release(pinned.value.pinId)).session;
  const backed = applied(released.back()).session;
  expect(backed.state.entries).toHaveLength(1);
  expect(backed.sourceRecord()).toBe(seed.record);
});

test("reprojects retained connections with stable payload identity and no I/O", () => {
  const sourceSeed = source("Micah 6:8");
  const initial = connections("Micah 6:8");
  const session = createReaderSession({
    source: sourceSeed,
    connections: { record: initial },
  });
  const projected = applied(
    session.projectConnections(session.state.currentEntryId, {
      category: "Targum",
      page: 1,
    }),
  ).session;
  const record = projected.connectionsRecord();

  expect(record).toBe(projected.connectionsRecord());
  expect(record?.payload).toBe(initial.payload);
  expect(record?.effectiveRequest).toBe(initial.effectiveRequest);
  expect(record?.projection).toEqual({ category: "Targum", page: 1 });
  expect(projected.state.retainedCaptureBytes).toBe(
    session.state.retainedCaptureBytes,
  );
});
