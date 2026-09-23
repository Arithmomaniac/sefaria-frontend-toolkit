import {
  zCoreV3TextsResponse,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { expect, test } from "vitest";

import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import { createReaderEntrySeedFromRawData } from "./reader-controller.js";
import { getReaderSourceRecord } from "./reader-session.js";

const micahTarget = zCoreV3TextsResponse.parse(
  micahFixture,
) as CoreV3TextsResponse;

function micahContext(): CoreV3TextsResponse {
  const payload = structuredClone(micahTarget);
  payload.ref = payload.sectionRef;
  payload.heRef = payload.heSectionRef;
  payload.sections = payload.sections.slice(0, -1);
  payload.toSections = payload.toSections.slice(0, -1);
  for (const version of payload.versions) {
    if (Array.isArray(version.text)) {
      throw new TypeError("Expected scalar Micah target text.");
    }
    const target = version.text;
    version.text = Array.from({ length: 8 }, (_, index) =>
      index === 7 ? target : `Synthetic Micah 6:${index + 1}.`,
    );
  }
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

test("admits an exact selected reference with stable library-owned raw identity", () => {
  const callerPayload = micahContext();
  const admitted = createReaderEntrySeedFromRawData({
    source: {
      payload: callerPayload,
      status: 200,
      effectiveRequest: { tref: "Micah 6" },
    },
    selectedRef: "Micah 6:8",
  });
  const source = admitted.seed.source!;
  const first = getReaderSourceRecord(source);
  const second = getReaderSourceRecord(source);

  expect(admitted.selectedRef).toBe("Micah 6:8");
  expect(admitted.seed.selectedPosition).toEqual([7]);
  expect(first).toBe(second);
  expect(first.payload).not.toBe(callerPayload);
  expect(Object.isFrozen(first.payload)).toBe(true);
  callerPayload.ref = "Changed by caller";
  expect(first.payload.ref).toBe("Micah 6");
});

test("rejects an absent selected reference instead of choosing another row", () => {
  expect(() =>
    createReaderEntrySeedFromRawData({
      source: {
        payload: micahContext(),
        status: 200,
        effectiveRequest: { tref: "Micah 6" },
      },
      selectedRef: "Micah 6:99",
    }),
  ).toThrow("must match exactly one canonical source item");
});
