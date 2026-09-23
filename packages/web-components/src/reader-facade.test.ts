import {
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { expect, test, vi } from "vitest";

import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createReaderSourceContent,
  getReaderSourceRecord,
} from "./reader-session.js";
import { resolveReaderSource, type ReaderDataSource } from "./reader-facade.js";

function sourceRecord(tref: string) {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 text fixture.");
  }
  const payload = structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
  return getReaderSourceRecord(createReaderSourceContent(payload, { tref }));
}

test("qualifies a stable raw source record without exposing prepared content", async () => {
  const records: ReturnType<typeof sourceRecord>[] = [];
  const loadSource = vi.fn(async (request: { readonly tref: string }) => {
    const record = sourceRecord(request.tref);
    records.push(record);
    return record;
  });
  const dataSource: ReaderDataSource = {
    loadSource,
    loadConnections: vi.fn(),
  };

  const resolved = await resolveReaderSource(
    { tref: "Genesis 1:1" },
    dataSource,
  );

  expect(resolved.record).toBe(records.at(-1));
  expect(resolved.effectiveRequest).toBe(resolved.record.effectiveRequest);
  expect(resolved.selectedRef).toBe("Genesis 1:1");
  expect(resolved.selectedPosition).toEqual(expect.any(Array));
  expect(loadSource).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(resolved)).not.toMatch(/viewModel|content/u);
});
