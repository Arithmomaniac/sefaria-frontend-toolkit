import type {
  CoreLinkResponse,
  CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";

import { validateSuppliedComponentData } from "./component-controller.js";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
  getReaderConnectionsContent,
  getReaderSourceContent,
  type ReaderConnectionsRecord,
  type ReaderSourceRecord,
} from "./reader-session.js";

/** Validates and admits one raw source record into private Reader state. */
export function admitReaderSourceRecord(record: ReaderSourceRecord) {
  const existing = getReaderSourceContent(record);
  if (existing !== undefined) return existing;
  if (record.status !== 200) {
    throw new RangeError("Reader source record status must be 200.");
  }
  const payload = validateSuppliedComponentData<CoreV3TextsResponse>(
    { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
    record.payload,
  );
  return createReaderSourceContent(payload, record.effectiveRequest);
}

/** Validates and admits one raw connections record into private Reader state. */
export function admitReaderConnectionsRecord(record: ReaderConnectionsRecord) {
  const existing = getReaderConnectionsContent(record);
  if (existing !== undefined) return existing;
  if (record.status !== 200 && record.status !== 400) {
    throw new RangeError(
      "Reader connections record status must be 200 or 400.",
    );
  }
  const payload = validateSuppliedComponentData<CoreLinkResponse>(
    {
      method: "GET",
      path: "/api/links/{tref}",
      status: record.status,
    },
    record.payload,
  );
  return createReaderConnectionsContent(
    payload,
    record.effectiveRequest,
    record.projection,
    record.status,
  );
}
