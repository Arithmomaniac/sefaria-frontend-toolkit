import type { SefariaClient } from "@arithmomaniac/sefaria-client";

import type {
  ConnectionsProjection,
  ConnectionsRequest,
} from "./connections-panel.js";
import {
  createSefariaReaderDataSource as createInternalSefariaReaderDataSource,
  resolveReaderSource as resolveInternalReaderSource,
  type ReaderControllerDataSource,
} from "./reader-controller.js";
import {
  getReaderConnectionsRecord,
  getReaderSourceRecord,
  type ReaderConnectionsRecord,
  type ReaderSourceRecord,
} from "./reader-session.js";
import {
  admitReaderConnectionsRecord,
  admitReaderSourceRecord,
} from "./reader-record-admission.js";
import type { SourceCardRequest } from "./source-card.js";

/** DOM-free raw Reader operations used by shared qualification and hosts. */
export interface ReaderDataSource {
  /** Loads one validated source record for an exact source request. */
  loadSource(
    request: SourceCardRequest,
    signal: AbortSignal,
  ): Promise<ReaderSourceRecord>;
  /** Loads one validated connections record for an exact links request. */
  loadConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<ReaderConnectionsRecord>;
}

/** Qualified semantic Reader source without prepared rendering content. */
export interface ReaderResolvedSource {
  /** Stable library-owned corrected source record. */
  readonly record: ReaderSourceRecord;
  /** Exact effective request covered by the retained record. */
  readonly effectiveRequest: SourceCardRequest;
  /** Exact canonical selected reference. */
  readonly selectedRef: string;
  /** Exact selected source position. */
  readonly selectedPosition: readonly number[];
}

/** Creates a client-backed raw Reader data source with standard selectors. */
export function createSefariaReaderDataSource(
  client: SefariaClient,
): ReaderDataSource {
  return publicDataSource(createInternalSefariaReaderDataSource(client));
}

/** Resolves and qualifies one source using at most two source operations. */
export async function resolveReaderSource(
  request: SourceCardRequest,
  dataSource: ReaderDataSource,
  signal: AbortSignal = new AbortController().signal,
): Promise<ReaderResolvedSource> {
  const resolved = await resolveInternalReaderSource(
    request,
    internalDataSource(dataSource),
    signal,
  );
  return Object.freeze({
    record: resolved.record,
    effectiveRequest: resolved.record.effectiveRequest,
    selectedRef: resolved.selectedRef,
    selectedPosition: resolved.selectedPosition,
  });
}

function publicDataSource(
  dataSource: ReaderControllerDataSource,
): ReaderDataSource {
  return Object.freeze({
    loadSource: async (request: SourceCardRequest, signal: AbortSignal) =>
      getReaderSourceRecord(await dataSource.loadSource(request, signal)),
    loadConnections: async (
      request: ConnectionsRequest,
      projection: ConnectionsProjection,
      signal: AbortSignal,
    ) =>
      getReaderConnectionsRecord(
        await dataSource.loadConnections(request, projection, signal),
      ),
  });
}

function internalDataSource(
  dataSource: ReaderDataSource,
): ReaderControllerDataSource {
  return {
    loadSource: async (request, signal) =>
      admitReaderSourceRecord(await dataSource.loadSource(request, signal)),
    loadConnections: async (request, projection, signal) =>
      admitReaderConnectionsRecord(
        await dataSource.loadConnections(request, projection, signal),
      ),
  };
}
