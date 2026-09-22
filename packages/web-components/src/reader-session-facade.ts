import type {
  ConnectionsProjection,
  ConnectionsRequest,
} from "./connections-panel.js";
import {
  createReaderEntrySeedFromRawData,
  type ReaderAdmittedRawSeed,
} from "./reader-controller.js";
import {
  admitReaderConnectionsRecord,
  admitReaderSourceRecord,
} from "./reader-record-admission.js";
import {
  createReaderSession as createInternalReaderSession,
  type ReaderConnectionsRecord,
  type ReaderEntryInfo,
  type ReaderEntrySeed as InternalReaderEntrySeed,
  type ReaderOperationHandle,
  type ReaderPinHandle,
  type ReaderPresentation,
  type ReaderPresentationPatch,
  type ReaderSession as InternalReaderSession,
  type ReaderSessionOptions,
  type ReaderSourceRecord,
  type ReaderTransition as InternalReaderTransition,
  type ReaderTransitionRejection,
} from "./reader-session.js";
import type { ReaderRawSeedData } from "./reader.js";
import type { SourceCardRequest } from "./source-card.js";

/** One raw source record and exact selected position admitted into a session. */
export interface ReaderSessionSourceSeed {
  /** Stable corrected source record. */
  readonly record: ReaderSourceRecord;
  /** Exact selected source position, when established. */
  readonly selectedPosition?: readonly number[];
}

/** One raw connections record admitted into a session. */
export interface ReaderSessionConnectionsSeed {
  /** Stable corrected connections record and local projection. */
  readonly record: ReaderConnectionsRecord;
}

/** Raw-record seed for one semantic Reader entry. */
export interface ReaderSessionSeed {
  /** Optional retained source record. */
  readonly source?: ReaderSessionSourceSeed;
  /** Optional retained connections record. */
  readonly connections?: ReaderSessionConnectionsSeed;
  /** Initial entry-specific presentation. */
  readonly presentation?: ReaderPresentationPatch;
}

/** One breadcrumb in retained semantic Reader history. */
export interface ReaderBreadcrumb {
  /** Stable retained entry identity. */
  readonly entryId: string;
  /** Human-readable entry label. */
  readonly label: string;
  /** Whether this breadcrumb is current. */
  readonly current: boolean;
}

/** Public semantic diagnostics and bounded-retention state. */
export interface ReaderSessionState {
  /** Retained semantic entries from oldest to current. */
  readonly entries: readonly ReaderEntryInfo[];
  /** Current retained entry identity. */
  readonly currentEntryId: string;
  /** Current retained entry diagnostics. */
  readonly current: ReaderEntryInfo;
  /** Retained semantic breadcrumbs. */
  readonly breadcrumbs: readonly ReaderBreadcrumb[];
  /** Whether older history was evicted. */
  readonly historyTruncated: boolean;
  /** Aggregate bytes across uniquely retained corrected payloads. */
  readonly retainedCaptureBytes: number;
  /** Configured maximum retained entry count. */
  readonly maxEntries: number;
  /** Configured maximum retained capture bytes. */
  readonly maxCaptureBytes: number;
}

/** Result of one immutable public Reader session transition. */
export type ReaderTransition<T = undefined> =
  | {
      /** Successful transition discriminator. */
      readonly state: "applied";
      /** New immutable public session. */
      readonly session: ReaderSession;
      /** Transition-specific identity or value. */
      readonly value: T;
    }
  | {
      /** Rejected transition discriminator. */
      readonly state: "rejected";
      /** Session after terminal cleanup with committed entries preserved. */
      readonly session: ReaderSession;
      /** Machine-readable rejection reason. */
      readonly reason: ReaderTransitionRejection;
      /** Human-readable rejection detail. */
      readonly message: string;
    };

/** Supported DOM-free semantic Reader history and raw-record facade. */
export interface ReaderSession {
  /** Current semantic history and bounded-retention diagnostics. */
  readonly state: ReaderSessionState;
  /** Returns semantic information for one retained entry or the current entry. */
  entryInfo(entryId?: string): ReaderEntryInfo;
  /** Returns the stable retained source record for one entry. */
  sourceRecord(entryId?: string): ReaderSourceRecord | undefined;
  /** Returns the stable retained connections record for one entry. */
  connectionsRecord(entryId?: string): ReaderConnectionsRecord | undefined;
  /** Begins host-owned contextual source navigation. */
  beginSourceNavigation(
    originEntryId: string,
    request: SourceCardRequest,
  ): ReaderTransition<ReaderOperationHandle>;
  /** Commits a qualified raw source seed for an eligible operation. */
  completeSourceNavigation(
    operationId: string,
    seed: ReaderSessionSeed | ReaderRawSeedData,
  ): ReaderTransition;
  /** Begins host-owned connections work for one retained entry. */
  beginConnections(
    entryId: string,
    request: ConnectionsRequest,
    projection?: ConnectionsProjection,
    message?: string,
  ): ReaderTransition<ReaderOperationHandle>;
  /** Commits a corrected raw connections record for an eligible operation. */
  completeConnections(
    operationId: string,
    record: ReaderConnectionsRecord,
  ): ReaderTransition;
  /** Finishes connections work without a captured payload. */
  failConnections(operationId: string, message: string): ReaderTransition;
  /** Cancels an operation and interrupts its loading slot when applicable. */
  cancelOperation(operationId: string, message?: string): ReaderTransition;
  /** Reprojects current connections from their retained raw record. */
  projectConnections(
    entryId: string,
    projection: ConnectionsProjection,
  ): ReaderTransition;
  /** Updates the selected source position on the current entry. */
  selectSourcePosition(
    entryId: string,
    position: readonly number[],
  ): ReaderTransition;
  /** Updates presentation on the current entry. */
  setPresentation(
    entryId: string,
    patch: ReaderPresentationPatch,
  ): ReaderTransition;
  /** Replaces all semantic history with one raw-record root. */
  replaceRoot(seed: ReaderSessionSeed | ReaderRawSeedData): ReaderTransition;
  /** Removes the current entry and restores its retained predecessor. */
  back(): ReaderTransition;
  /** Activates an earlier breadcrumb and discards later entries. */
  activate(entryId: string): ReaderTransition;
  /** Pins a retained entry for a live consumer. */
  pin(entryId: string): ReaderTransition<ReaderPinHandle>;
  /** Releases a live-consumer pin. */
  release(pinId: string): ReaderTransition;
}

const facades = new WeakMap<InternalReaderSession, ReaderSession>();

/** Creates a supported semantic Reader session from raw records or raw seed data. */
export function createReaderSession(
  seed: ReaderSessionSeed | ReaderRawSeedData,
  options: ReaderSessionOptions = {},
): ReaderSession {
  return facade(createInternalReaderSession(internalSeed(seed), options));
}

function facade(session: InternalReaderSession): ReaderSession {
  const existing = facades.get(session);
  if (existing !== undefined) return existing;
  const result: ReaderSession = {
    get state() {
      const view = session.view;
      const entries = view.entries.map((entry) => session.entryInfo(entry.id));
      return Object.freeze({
        entries,
        currentEntryId: view.currentEntryId,
        current: entries.at(-1)!,
        breadcrumbs: view.breadcrumbs,
        historyTruncated: view.historyTruncated,
        retainedCaptureBytes: view.retainedCaptureBytes,
        maxEntries: view.maxEntries,
        maxCaptureBytes: view.maxCaptureBytes,
      });
    },
    entryInfo: (entryId) => session.entryInfo(entryId),
    sourceRecord: (entryId) => session.sourceRecord(entryId),
    connectionsRecord: (entryId) => session.connectionsRecord(entryId),
    beginSourceNavigation: (originEntryId, request) =>
      transition(session.beginSourceNavigation(originEntryId, request)),
    completeSourceNavigation: (operationId, seed) =>
      transition(
        session.completeSourceNavigation(operationId, internalSeed(seed)),
      ),
    beginConnections: (entryId, request, projection, message) =>
      transition(
        session.beginConnections(entryId, request, projection, message),
      ),
    completeConnections: (operationId, record) =>
      transition(
        session.completeConnections(
          operationId,
          admitReaderConnectionsRecord(record),
        ),
      ),
    failConnections: (operationId, message) =>
      transition(session.failConnections(operationId, message)),
    cancelOperation: (operationId, message) =>
      transition(session.cancelOperation(operationId, message)),
    projectConnections: (entryId, projection) =>
      transition(session.projectConnections(entryId, projection)),
    selectSourcePosition: (entryId, position) =>
      transition(session.selectSourcePosition(entryId, position)),
    setPresentation: (entryId, patch) =>
      transition(session.setPresentation(entryId, patch)),
    replaceRoot: (seed) => transition(session.replaceRoot(internalSeed(seed))),
    back: () => transition(session.back()),
    activate: (entryId) => transition(session.activate(entryId)),
    pin: (entryId) => transition(session.pin(entryId)),
    release: (pinId) => transition(session.release(pinId)),
  };
  facades.set(session, result);
  return Object.freeze(result);
}

function transition<T>(
  result: InternalReaderTransition<T>,
): ReaderTransition<T> {
  return result.state === "applied"
    ? Object.freeze({
        state: "applied",
        session: facade(result.session),
        value: result.value,
      })
    : Object.freeze({
        state: "rejected",
        session: facade(result.session),
        reason: result.reason,
        message: result.message,
      });
}

function internalSeed(
  seed: ReaderSessionSeed | ReaderRawSeedData,
): InternalReaderEntrySeed {
  if (!isSessionSeed(seed)) {
    return rawSeed(seed).seed;
  }
  const source =
    seed.source === undefined
      ? undefined
      : admitReaderSourceRecord(seed.source.record);
  const connections =
    seed.connections === undefined
      ? undefined
      : admitReaderConnectionsRecord(seed.connections.record);
  return {
    ...(source === undefined ? {} : { source }),
    ...(connections === undefined ? {} : { connections }),
    ...(seed.source?.selectedPosition === undefined
      ? {}
      : { selectedPosition: seed.source.selectedPosition }),
    ...(seed.presentation === undefined
      ? {}
      : { presentation: seed.presentation }),
  };
}

function rawSeed(seed: ReaderRawSeedData): ReaderAdmittedRawSeed {
  return createReaderEntrySeedFromRawData(seed);
}

function isSessionSeed(
  seed: ReaderSessionSeed | ReaderRawSeedData,
): seed is ReaderSessionSeed {
  const source = seed.source;
  const connections = seed.connections;
  return (
    (source !== undefined && "record" in source) ||
    (connections !== undefined && "record" in connections)
  );
}

export type {
  ReaderConnectionsRecord,
  ReaderEntryInfo,
  ReaderOperationHandle,
  ReaderPinHandle,
  ReaderPresentation,
  ReaderPresentationPatch,
  ReaderSessionOptions,
  ReaderSourceRecord,
  ReaderTransitionRejection,
};
