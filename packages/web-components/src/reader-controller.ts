import {
  related,
  text,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

import type { SefariaAcquisitionCapability } from "./acquisition.js";
import { validateSuppliedComponentData } from "./component-controller.js";
import { createConnectionsQuery } from "./connections-request.js";
import {
  CONNECTIONS_PAGE_SIZE,
  type ConnectionsProjection,
  type ConnectionsRequest,
} from "./connections-panel.js";
import { createReaderViewModel, type ReaderViewModel } from "./reader.js";
import {
  createReaderConnectionsContent,
  createReaderSession,
  createReaderSourceContent,
  getReaderSourceRecord,
  type ReaderConnectionsContent,
  type ReaderEntrySeed,
  type ReaderPresentation,
  type ReaderPresentationPatch,
  type ReaderSession,
  type ReaderSessionOptions,
  type ReaderSourceRecord,
  type ReaderSourceContent,
  type ReaderTransition,
  type ReaderTransitionRejection,
} from "./reader-session.js";
import { serializeSourceCardSelectors } from "./source-card-request.js";
import type {
  SourceCardDataViewModel,
  SourceCardNavigation,
  SourceCardRequest,
} from "./source-card.js";

interface RetainedSourceRoot {
  readonly selectedRef: string;
  readonly selectedPosition: readonly number[];
}

interface ReaderSessionWithRetainedSourceRoot extends ReaderSession {
  replaceRootFromCurrentSource(
    request: SourceCardRequest,
    presentation?: ReaderPresentationPatch,
  ): ReaderTransition<RetainedSourceRoot> | undefined;
}

/** Executes corrected source and connections operations for one reader controller. */
export interface ReaderControllerDataSource {
  /** Loads admitted source content for the exact effective request. */
  loadSource(
    request: SourceCardRequest,
    signal: AbortSignal,
  ): Promise<ReaderSourceContent>;
  /** Loads admitted connections content for the exact request and projection. */
  loadConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<ReaderConnectionsContent>;
}

/** Machine-readable controller failure kind. */
export type ReaderControllerErrorCode =
  | "disposed"
  | "reentrant-action"
  | "request-mismatch"
  | "source-http"
  | "source-transport"
  | "source-unavailable"
  | "stale-action"
  | ReaderTransitionRejection;

/** Public error for initialization and programmer-invalid controller use. */
export class ReaderControllerError extends Error {
  /** Machine-readable failure kind. */
  readonly code: ReaderControllerErrorCode;
  /** Documented HTTP status, when the source endpoint supplied one. */
  readonly status?: 400 | 404;

  constructor(
    code: ReaderControllerErrorCode,
    message: string,
    status?: 400 | 404,
  ) {
    super(message);
    this.name = "ReaderControllerError";
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

/** Controller execution state outside component-owned connections outcomes. */
export type ReaderControllerTask =
  | { readonly state: "idle" }
  | {
      readonly state: "loading-source";
      readonly mode: "root" | "navigation";
      readonly originEntryId: string;
      readonly targetRef: string;
    }
  | {
      readonly state: "loading-connections";
      readonly originEntryId: string;
      readonly request: ConnectionsRequest;
    }
  | {
      readonly state: "error";
      readonly code: ReaderControllerErrorCode;
      readonly message: string;
    };

/** Immutable public projection of one stateful reader controller. */
export interface ReaderControllerSnapshot {
  /** Rendering-only model for `<sefaria-reader>`. */
  readonly reader: ReaderViewModel;
  /** Current entry-specific presentation supplied separately to the element. */
  readonly presentation: ReaderPresentation;
  /** Current controller-owned execution state. */
  readonly task: ReaderControllerTask;
}

/** Initial browser-reader connections behavior. */
export interface ReaderControllerInitialConnections {
  /** Whether connected text should be included. Defaults to true. */
  readonly withText?: boolean;
  /** Initial local connections projection. */
  readonly projection?: ConnectionsProjection;
}

/** Browser async-factory options. */
export interface ReaderControllerLoadOptions extends ReaderSessionOptions {
  /** Aborts initialization and rejects the async factory. */
  readonly signal?: AbortSignal;
  /** Initial display-state overrides. */
  readonly presentation?: ReaderPresentationPatch;
  /** Initial connections request and projection options. */
  readonly connections?: ReaderControllerInitialConnections;
}

/** Suspended element-owned Reader work eligible for lifecycle resumption. */
export type ReaderControllerSuspension =
  | {
      /** Root replacement or initialization source phase. */
      readonly kind: "root";
      /** Requested external root. */
      readonly request: SourceCardRequest;
    }
  | {
      /** Contextual history navigation source phase. */
      readonly kind: "navigation";
      /** Entry that originated navigation. */
      readonly originEntryId: string;
      /** Requested connected source. */
      readonly targetRef: string;
    }
  | {
      /** Connections phase for an already committed source entry. */
      readonly kind: "connections";
      /** Entry whose connections were interrupted. */
      readonly entryId: string;
      /** Exact interrupted links request. */
      readonly request: ConnectionsRequest;
      /** Exact interrupted local projection. */
      readonly projection: ConnectionsProjection;
    };

/** Options for replacing a controller's committed external root. */
export interface ReaderControllerRootOptions {
  /** Fresh-root display-state overrides. */
  readonly presentation?: ReaderPresentationPatch;
  /** Fresh-root connections request and projection options. */
  readonly connections?: ReaderControllerInitialConnections;
}

/** Identified source-selection action emitted by the reader surface. */
export interface ReaderControllerSourceSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Selected source-card position. */
  readonly position: readonly number[];
  /** Exact selected source reference. */
  readonly ref: string;
}

/** Identified connection-selection action emitted by the reader surface. */
export interface ReaderControllerConnectionSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Exact connected source reference. */
  readonly targetRef: string;
}

/** Identified connections category action. */
export interface ReaderControllerCategorySelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Selected category, or null for the overview. */
  readonly category: string | null;
}

/** Identified connections page action. */
export interface ReaderControllerPageSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Zero-based requested page. */
  readonly page: number;
}

/** Identified reader-entry action. */
export interface ReaderControllerEntryAction {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
}

/** Identified breadcrumb activation action. */
export interface ReaderControllerHistoryAction extends ReaderControllerEntryAction {
  /** Retained entry to activate. */
  readonly entryId: string;
}

/** Identified presentation update. */
export interface ReaderControllerPresentationAction extends ReaderControllerEntryAction {
  /** Presentation values to replace on the current entry. */
  readonly patch: ReaderPresentationPatch;
}

/** Stateful DOM-free reader coordination contract. */
export interface ReaderController {
  /** Current immutable render and task projection. */
  readonly snapshot: ReaderControllerSnapshot;
  /** Subscribes immediately and after every committed snapshot replacement. */
  subscribe(listener: (snapshot: ReaderControllerSnapshot) => void): () => void;
  /** Replaces all committed history after qualifying one external root. */
  replaceRoot(
    request: SourceCardRequest,
    options?: ReaderControllerRootOptions,
  ): Promise<void>;
  /** Selects a source row and replaces its connections. */
  selectSource(action: ReaderControllerSourceSelection): Promise<void>;
  /** Opens a connected source as a new reader-history entry. */
  openConnection(action: ReaderControllerConnectionSelection): Promise<void>;
  /** Reprojects the current captured connections category without I/O. */
  setConnectionsCategory(action: ReaderControllerCategorySelection): void;
  /** Reprojects the current captured connections page without I/O. */
  setConnectionsPage(action: ReaderControllerPageSelection): void;
  /** Loads preview text only when the retained capture lacks it. */
  requestConnectionPreviews(action: ReaderControllerEntryAction): Promise<void>;
  /** Applies entry-specific display settings. */
  setPresentation(action: ReaderControllerPresentationAction): void;
  /** Restores the retained predecessor without I/O. */
  back(action: ReaderControllerEntryAction): void;
  /** Activates a retained breadcrumb and discards later history. */
  activateHistory(action: ReaderControllerHistoryAction): void;
  /** Continues one admitted source seed with its initial connections request. */
  loadInitialConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<void>;
  /** Interrupts active element-owned work while retaining committed state. */
  suspend(): ReaderControllerSuspension | undefined;
  /** Resumes one still-eligible lifecycle interruption. */
  resume(suspension: ReaderControllerSuspension): Promise<void>;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

/** Validated admitted content derived from one transactional raw Reader seed. */
export interface ReaderAdmittedRawSeed {
  /** Branded immutable entry seed accepted by the Reader session. */
  readonly seed: ReaderEntrySeed;
  /** Canonical selected reference when source content is present. */
  readonly selectedRef?: string;
  /** Exact effective source request when source content is present. */
  readonly sourceRequest?: SourceCardRequest;
  /** Whether source admission requires one links continuation. */
  readonly continueConnections: boolean;
}

/** Qualified Reader source shared by ordinary and spatial coordination. */
export interface ReaderResolvedSource {
  /** Admitted source content used by existing session transitions. */
  readonly content: ReaderSourceContent;
  /** Stable raw corrected-payload record for advanced consumers. */
  readonly record: ReaderSourceRecord;
  /** Exact selected source position. */
  readonly selectedPosition: readonly number[];
  /** Exact canonical selected reference. */
  readonly selectedRef: string;
}

interface ActiveOperation {
  readonly generation: number;
  readonly controller: AbortController;
}

type Listener = (snapshot: ReaderControllerSnapshot) => void;

/** Creates a client-backed reader data source with component request defaults. */
export function createSefariaReaderDataSource(
  client: SefariaClient,
): ReaderControllerDataSource {
  return {
    loadSource: async (request, signal) => {
      const result = await text.getV3Texts({
        client,
        path: { tref: request.tref },
        query: {
          version: serializeSourceCardSelectors(request),
          return_format: "default",
        },
        signal,
      });
      if (result.data !== undefined) {
        return createReaderSourceContent(result.data, request);
      }
      const status = result.response?.status;
      if (result.error !== undefined && (status === 400 || status === 404)) {
        throw new ReaderControllerError(
          "source-http",
          result.error.error,
          status,
        );
      }
      throw new Error("The source request returned no documented response.");
    },
    loadConnections: async (request, projection, signal) => {
      const result = await related.getLinks({
        client,
        path: { tref: request.tref },
        query: createConnectionsQuery(request),
        signal,
      });
      if (result.data !== undefined) {
        return createReaderConnectionsContent(result.data, request, projection);
      }
      if (result.error !== undefined && result.response.status === 400) {
        return createReaderConnectionsContent(
          result.error,
          request,
          projection,
          400,
        );
      }
      throw new Error("The links request returned no documented response.");
    },
  };
}

/** Creates a host-capability Reader data source without browser fallback. */
export function createCapabilityReaderDataSource(
  capability: SefariaAcquisitionCapability,
): ReaderControllerDataSource {
  return {
    loadSource: async (request, signal) => {
      if (capability.getText === undefined) {
        throw new Error(
          "The selected acquisition source does not support text.",
        );
      }

      const response = await capability.getText(
        {
          sref: request.tref,
          versions: serializeSourceCardSelectors(request),
          returnFormat: "default",
        },
        signal,
      );
      if (response.status === 200) {
        const payload = validateSuppliedComponentData<CoreV3TextsResponse>(
          { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
          response.payload,
        );
        return createReaderSourceContent(payload, request);
      }
      if (response.status === 400 || response.status === 404) {
        const payload = validateSuppliedComponentData<{
          readonly error: string;
        }>(
          {
            method: "GET",
            path: "/api/v3/texts/{tref}",
            status: response.status,
          },
          response.payload,
        );
        throw new ReaderControllerError(
          "source-http",
          payload.error,
          response.status,
        );
      }
      throw new Error(`Unsupported Reader source status ${response.status}.`);
    },
    loadConnections: async (request, projection, signal) => {
      if (capability.getLinks === undefined) {
        throw new Error(
          "The selected acquisition source does not support links.",
        );
      }
      const response = await capability.getLinks(
        {
          sref: request.tref,
          withText: request.withText !== false,
        },
        signal,
      );
      if (response.status !== 200 && response.status !== 400) {
        throw new Error(
          `Unsupported Reader connections status ${response.status}.`,
        );
      }
      const payload = validateSuppliedComponentData<CoreLinkResponse>(
        {
          method: "GET",
          path: "/api/links/{tref}",
          status: response.status,
        },
        response.payload,
      );
      return createReaderConnectionsContent(
        payload,
        request,
        projection,
        response.status,
      );
    },
  };
}

/** Validates and admits one unknown transactional raw Reader seed. */
export function createReaderEntrySeedFromRawData(
  value: unknown,
): ReaderAdmittedRawSeed {
  const input = rawRecord(value, "/");
  const sourceInput =
    input.source === undefined ? undefined : rawRecord(input.source, "/source");
  const connectionsInput =
    input.connections === undefined
      ? undefined
      : rawRecord(input.connections, "/connections");
  if (sourceInput === undefined && connectionsInput === undefined) {
    throw new TypeError("Reader data requires source or connections.");
  }

  const presentation =
    input.presentation === undefined
      ? undefined
      : parsePresentation(input.presentation);
  const requestedSelectedRef =
    input.selectedRef === undefined
      ? undefined
      : rawNonblankString(input.selectedRef, "/selectedRef");

  let source: ReaderSourceContent | undefined;
  let selectedRef: string | undefined;
  let selectedPosition: readonly number[] | undefined;
  if (sourceInput !== undefined) {
    const request = parseSourceRequest(
      sourceInput.effectiveRequest,
      "/source/effectiveRequest",
    );
    const status = rawNumber(sourceInput.status, "/source/status");
    if (status !== 200) {
      if (status === 400 || status === 404) {
        const failure = validateSuppliedComponentData<{
          readonly error: string;
        }>(
          { method: "GET", path: "/api/v3/texts/{tref}", status },
          sourceInput.payload,
        );
        throw new ReaderControllerError("source-http", failure.error, status);
      }
      throw new RangeError("/source/status must be 200.");
    }
    const payload = validateSuppliedComponentData<CoreV3TextsResponse>(
      { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
      sourceInput.payload,
    );
    source = createReaderSourceContent(payload, request);
    const navigable = requireNavigable(source, request.tref);
    const available = requireAvailable(navigable.navigation, request.tref);
    const candidates =
      requestedSelectedRef === undefined
        ? navigable.viewModel.items.filter((item) => item.ref === request.tref)
        : navigable.viewModel.items.filter(
            (item) => item.ref === requestedSelectedRef,
          );
    if (candidates.length > 1) {
      throw new ReaderControllerError(
        "invalid-selection",
        `Reader selected reference matched ${candidates.length} source items.`,
      );
    }
    let selected = candidates[0];
    if (selected === undefined && requestedSelectedRef === undefined) {
      const firstCandidates = navigable.viewModel.items.filter(
        (item) => item.ref === available.firstRef,
      );
      if (firstCandidates.length !== 1) {
        throw new ReaderControllerError(
          "invalid-selection",
          `Reader first target ${available.firstRef} must match exactly one source item.`,
        );
      }
      selected = firstCandidates[0];
    }
    if (selected?.ref === undefined) {
      throw new ReaderControllerError(
        "invalid-selection",
        `${
          requestedSelectedRef ?? request.tref
        } must match exactly one canonical source item.`,
      );
    }
    selectedRef = selected.ref;
    selectedPosition = selected.position;
  } else if (requestedSelectedRef !== undefined) {
    throw new TypeError(
      "/selectedRef requires source data for exact selection.",
    );
  }

  let connections: ReaderConnectionsContent | undefined;
  if (connectionsInput !== undefined) {
    const request = parseConnectionsRequest(
      connectionsInput.effectiveRequest,
      "/connections/effectiveRequest",
    );
    const status = rawNumber(connectionsInput.status, "/connections/status");
    if (status !== 200 && status !== 400) {
      throw new RangeError("/connections/status must be 200 or 400.");
    }
    const payload = validateSuppliedComponentData<CoreLinkResponse>(
      { method: "GET", path: "/api/links/{tref}", status },
      connectionsInput.payload,
    );
    const projection =
      connectionsInput.projection === undefined
        ? {}
        : parseProjection(
            connectionsInput.projection,
            "/connections/projection",
          );
    if (selectedRef !== undefined && request.tref !== selectedRef) {
      throw new TypeError(
        "/connections/effectiveRequest/tref must equal the selected source reference.",
      );
    }
    connections = createReaderConnectionsContent(
      payload,
      request,
      projection,
      status,
    );
  }

  return deepFreeze({
    seed: {
      ...(source === undefined ? {} : { source }),
      ...(connections === undefined ? {} : { connections }),
      ...(selectedPosition === undefined ? {} : { selectedPosition }),
      ...(presentation === undefined ? {} : { presentation }),
    },
    ...(selectedRef === undefined ? {} : { selectedRef }),
    ...(source === undefined ? {} : { sourceRequest: source.request }),
    continueConnections: source !== undefined && connections === undefined,
  });
}

/**
 * Loads Reader source, publishes it, and then continues with connections.
 */
export async function loadReaderControllerProgressively(
  request: SourceCardRequest,
  dataSource: ReaderControllerDataSource,
  onSource: (controller: ReaderController) => void,
  options: ReaderControllerLoadOptions = {},
  retainPublishedOnFailure = false,
): Promise<ReaderController> {
  const normalized = normalizeSourceRequest(request);
  const signal = options.signal ?? new AbortController().signal;
  throwIfAborted(signal);
  let destination: ReaderResolvedSource;
  try {
    destination = await resolveReaderSource(normalized, dataSource, signal);
  } catch (error) {
    throwIfAborted(signal);
    if (error instanceof ReaderControllerError) throw error;
    throw new ReaderControllerError("source-transport", errorMessage(error));
  }
  throwIfAborted(signal);
  const controller = new ReaderControllerImpl(
    {
      source: destination.content,
      selectedPosition: destination.selectedPosition,
      ...(options.presentation === undefined
        ? {}
        : { presentation: options.presentation }),
    },
    dataSource,
    options,
  );
  onSource(controller);
  try {
    await controller.loadInitialConnections(
      {
        tref: destination.selectedRef,
        withText: options.connections?.withText !== false,
      },
      options.connections?.projection ?? {},
      signal,
    );
    throwIfAborted(signal);
    return controller;
  } catch (error) {
    if (!retainPublishedOnFailure) controller.dispose();
    throw error;
  }
}

/** Loads an initial reader position and returns its continuing controller. */
export async function loadReaderController(
  request: SourceCardRequest,
  client: SefariaClient,
  options: ReaderControllerLoadOptions = {},
): Promise<ReaderController> {
  const dataSource = createSefariaReaderDataSource(client);
  return await loadReaderControllerProgressively(
    request,
    dataSource,
    () => undefined,
    options,
  );
}

/** Creates a zero-request controller from already admitted reader content. */
export function createReaderController(
  seed: ReaderEntrySeed,
  dataSource: ReaderControllerDataSource,
  options: ReaderSessionOptions = {},
): ReaderController {
  requireNavigableSeed(seed);
  return new ReaderControllerImpl(seed, dataSource, options);
}

class ReaderControllerImpl implements ReaderController {
  #session: ReaderSession;
  readonly #dataSource: ReaderControllerDataSource;
  #task: ReaderControllerTask = { state: "idle" };
  #snapshot: ReaderControllerSnapshot;
  #reader: ReaderViewModel;
  #listeners = new Set<Listener>();
  #controller: AbortController | undefined;
  #operationId: string | undefined;
  #generation = 0;
  #disposed = false;
  #notifying = false;

  constructor(
    seed: ReaderEntrySeed,
    dataSource: ReaderControllerDataSource,
    options: ReaderSessionOptions,
  ) {
    requireNavigableSeed(seed);
    this.#session = createReaderSession(seed, options);
    this.#dataSource = dataSource;
    this.#reader = createReaderViewModel(this.#session.view);
    this.#snapshot = this.createSnapshot();
  }

  get snapshot(): ReaderControllerSnapshot {
    return this.#snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.assertUsable();
    this.#listeners.add(listener);
    this.notify(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async replaceRoot(
    request: SourceCardRequest,
    options: ReaderControllerRootOptions = {},
  ): Promise<void> {
    const targetRequest = normalizeSourceRequest(request);
    validateRootOptions(options);
    const retained = (
      this.#session as ReaderSessionWithRetainedSourceRoot
    ).replaceRootFromCurrentSource(targetRequest, options.presentation);
    if (retained !== undefined) {
      if (retained.state === "rejected") {
        this.#session = retained.session;
        this.failTask(retained.reason, retained.message);
        return;
      }
      const active = this.startPhysicalOperation();
      this.#session = retained.session;
      this.#task = { state: "idle" };
      this.publish();
      try {
        await this.loadConnections(
          this.#session.view.currentEntryId,
          normalizeConnectionsRequest({
            tref: retained.value.selectedRef,
            withText: options.connections?.withText !== false,
          }),
          options.connections?.projection ?? {},
          active,
        );
      } finally {
        this.finishPhysicalOperation(active);
      }
      return;
    }
    const active = this.startPhysicalOperation();
    this.replaceTask({
      state: "loading-source",
      mode: "root",
      originEntryId: this.#session.view.currentEntryId,
      targetRef: targetRequest.tref,
    });
    try {
      const destination = await resolveReaderSource(
        targetRequest,
        this.#dataSource,
        active.controller.signal,
      );
      if (!this.isActive(active)) return;
      const replaced = this.#session.replaceRoot({
        source: destination.content,
        selectedPosition: destination.selectedPosition,
        ...(options.presentation === undefined
          ? {}
          : { presentation: options.presentation }),
      });
      this.#session = replaced.session;
      if (replaced.state === "rejected") {
        this.failTask(replaced.reason, replaced.message);
        return;
      }
      this.#task = { state: "idle" };
      this.publish();
      await this.loadConnections(
        this.#session.view.currentEntryId,
        normalizeConnectionsRequest({
          tref: destination.selectedRef,
          withText: options.connections?.withText !== false,
        }),
        options.connections?.projection ?? {},
        active,
      );
    } catch (error) {
      if (!this.isActive(active)) return;
      this.failTask(classifySourceError(error), errorMessage(error));
    } finally {
      this.finishPhysicalOperation(active);
    }
  }

  async selectSource(action: ReaderControllerSourceSelection): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const selectedRef = this.requireSourceSelection(action);
    const active = this.startPhysicalOperation();
    const selected = this.apply(
      this.#session.selectSourcePosition(action.originEntryId, action.position),
    );
    if (!selected) {
      this.finishPhysicalOperation(active);
      return;
    }
    await this.loadConnections(
      action.originEntryId,
      normalizeConnectionsRequest({ tref: selectedRef, withText: true }),
      {},
      active,
    );
  }

  async openConnection(
    action: ReaderControllerConnectionSelection,
  ): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const targetRequest = normalizeSourceRequest({
      tref: action.targetRef,
    });
    const active = this.startPhysicalOperation();
    this.replaceTask({
      state: "loading-source",
      mode: "navigation",
      originEntryId: action.originEntryId,
      targetRef: targetRequest.tref,
    });
    let sourceOperationId: string | undefined;
    try {
      const destination = await resolveReaderSource(
        targetRequest,
        this.#dataSource,
        active.controller.signal,
        (effectiveRequest) => {
          if (!this.isActive(active)) return;
          const begun = this.requireApplied(
            this.#session.beginSourceNavigation(
              action.originEntryId,
              effectiveRequest,
            ),
          );
          this.#session = begun.session;
          sourceOperationId = begun.value.operationId;
          this.#operationId = sourceOperationId;
        },
      );
      if (!this.isActive(active)) return;
      if (!sourceOperationId) {
        this.failTask(
          "source-unavailable",
          "Source navigation did not establish an effective request.",
        );
        return;
      }
      const completed = this.#session.completeSourceNavigation(
        sourceOperationId,
        {
          source: destination.content,
          selectedPosition: destination.selectedPosition,
          presentation: this.#session.view.current.presentation,
        },
      );
      this.#session = completed.session;
      if (completed.state === "rejected") {
        this.cancelSessionOperation();
        this.failTask(completed.reason, completed.message);
        return;
      }
      this.#operationId = undefined;
      this.#task = { state: "idle" };
      this.publish();
      await this.loadConnections(
        this.#session.view.currentEntryId,
        normalizeConnectionsRequest({
          tref: destination.selectedRef,
          withText: true,
        }),
        {},
        active,
      );
    } catch (error) {
      if (!this.isActive(active)) return;
      this.cancelSessionOperation();
      this.failTask(classifySourceError(error), errorMessage(error));
    } finally {
      this.finishPhysicalOperation(active);
    }
  }

  setConnectionsCategory(action: ReaderControllerCategorySelection): void {
    this.requireCurrent(action.originEntryId);
    this.apply(
      this.#session.projectConnections(
        action.originEntryId,
        action.category === null ? {} : { category: action.category },
      ),
    );
  }

  setConnectionsPage(action: ReaderControllerPageSelection): void {
    this.requireCurrent(action.originEntryId);
    const current = this.#session.view.current.connections;
    const category =
      current?.state === "view" ? current.projection.category : undefined;
    this.apply(
      this.#session.projectConnections(action.originEntryId, {
        ...(category === undefined ? {} : { category }),
        page: action.page,
      }),
    );
  }

  async requestConnectionPreviews(
    action: ReaderControllerEntryAction,
  ): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const current = this.#session.view.current.connections;
    if (current?.state !== "view") {
      this.failTask(
        "unavailable-capture",
        "Current connections have no completed capture to replace.",
      );
      return;
    }
    if (current.request.withText !== false) return;
    const active = this.startPhysicalOperation();
    await this.loadConnections(
      action.originEntryId,
      normalizeConnectionsRequest({ ...current.request, withText: true }),
      current.projection,
      active,
    );
  }

  setPresentation(action: ReaderControllerPresentationAction): void {
    this.requireCurrent(action.originEntryId);
    this.apply(
      this.#session.setPresentation(action.originEntryId, action.patch),
      false,
    );
  }

  back(action: ReaderControllerEntryAction): void {
    this.requireCurrent(action.originEntryId);
    this.cancelActive(false);
    this.apply(this.#session.back());
  }

  activateHistory(action: ReaderControllerHistoryAction): void {
    this.requireCurrent(action.originEntryId);
    this.cancelActive(false);
    this.apply(this.#session.activate(action.entryId));
  }

  suspend(): ReaderControllerSuspension | undefined {
    this.assertUsable();
    const task = this.#task;
    let suspension: ReaderControllerSuspension | undefined;
    if (task.state === "loading-source") {
      suspension =
        task.mode === "root"
          ? { kind: "root", request: { tref: task.targetRef } }
          : {
              kind: "navigation",
              originEntryId: task.originEntryId,
              targetRef: task.targetRef,
            };
    } else if (task.state === "loading-connections") {
      const connections = this.#session.view.current.connections;
      if (connections?.state === "loading") {
        suspension = {
          kind: "connections",
          entryId: task.originEntryId,
          request: connections.request,
          projection: connections.projection,
        };
      }
    }
    this.cancelActive(true);
    return suspension;
  }

  async resume(suspension: ReaderControllerSuspension): Promise<void> {
    this.assertUsable();
    if (suspension.kind === "root") {
      await this.replaceRoot(suspension.request);
      return;
    }
    if (suspension.kind === "navigation") {
      await this.openConnection({
        originEntryId: suspension.originEntryId,
        targetRef: suspension.targetRef,
      });
      return;
    }
    this.requireCurrent(suspension.entryId);
    const active = this.startPhysicalOperation();
    await this.loadConnections(
      suspension.entryId,
      suspension.request,
      suspension.projection,
      active,
    );
  }

  dispose(): void {
    if (this.#disposed) return;
    this.cancelActive(false);
    this.#disposed = true;
    this.#listeners.clear();
  }

  async loadInitialConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<void> {
    const active = this.startPhysicalOperation();
    const abort = () => active.controller.abort(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    try {
      await this.loadConnections(
        this.#session.view.currentEntryId,
        normalizeConnectionsRequest(request),
        projection,
        active,
      );
      throwIfAborted(signal);
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }

  private async loadConnections(
    entryId: string,
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    active: ActiveOperation,
  ): Promise<void> {
    if (!this.isActive(active)) return;
    const normalizedProjection = normalizeProjection(projection);
    const begun = this.requireApplied(
      this.#session.beginConnections(
        entryId,
        request,
        normalizedProjection,
        `Loading connections for ${request.tref}.`,
      ),
    );
    this.#session = begun.session;
    this.#operationId = begun.value.operationId;
    this.replaceTask({
      state: "loading-connections",
      originEntryId: entryId,
      request,
    });
    try {
      const content = await this.#dataSource.loadConnections(
        request,
        normalizedProjection,
        active.controller.signal,
      );
      if (!this.isActive(active)) return;
      const completed = this.#session.completeConnections(
        begun.value.operationId,
        content,
      );
      this.#session = completed.session;
      if (completed.state === "rejected") {
        this.cancelSessionOperation();
        this.failTask(completed.reason, completed.message);
        return;
      }
      this.#operationId = undefined;
      this.#task = { state: "idle" };
      this.publish();
    } catch (error) {
      if (!this.isActive(active)) return;
      const failed = this.#session.failConnections(
        begun.value.operationId,
        errorMessage(error),
      );
      this.#operationId = undefined;
      this.#session = failed.session;
      if (failed.state === "rejected") {
        this.failTask(failed.reason, failed.message);
      } else {
        this.#task = { state: "idle" };
        this.publish();
      }
    } finally {
      this.finishPhysicalOperation(active);
    }
  }

  private startPhysicalOperation(): ActiveOperation {
    this.assertUsable();
    this.cancelActive(false);
    const controller = new AbortController();
    this.#controller = controller;
    return { generation: this.#generation, controller };
  }

  private cancelActive(publish: boolean): void {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#generation += 1;
    this.cancelSessionOperation();
    this.#task = { state: "idle" };
    if (publish) this.publish();
  }

  private cancelSessionOperation(): void {
    if (!this.#operationId) return;
    const cancelled = this.#session.cancelOperation(this.#operationId);
    this.#session = cancelled.session;
    this.#operationId = undefined;
  }

  private finishPhysicalOperation(active: ActiveOperation): void {
    if (this.#controller === active.controller) {
      this.#controller = undefined;
    }
  }

  private isActive(active: ActiveOperation): boolean {
    return (
      !active.controller.signal.aborted &&
      active.generation === this.#generation &&
      !this.#disposed
    );
  }

  private requireCurrent(originEntryId: string): void {
    this.assertUsable();
    if (originEntryId === this.#session.view.currentEntryId) return;
    throw new ReaderControllerError(
      "stale-action",
      `Reader action originated from stale entry ${originEntryId}.`,
    );
  }

  private requireSourceSelection(
    action: ReaderControllerSourceSelection,
  ): string {
    const source = this.#session.view.current.source?.viewModel;
    const selected =
      source?.state === "data"
        ? source.items.find((item) => sameJson(item.position, action.position))
        : undefined;
    if (selected?.ref === undefined) {
      throw new ReaderControllerError(
        "invalid-selection",
        "Selected position has no addressable source reference.",
      );
    }
    if (selected.ref !== action.ref) {
      throw new ReaderControllerError(
        "invalid-selection",
        `Selected position resolves to ${selected.ref}, not ${action.ref}.`,
      );
    }
    return selected.ref;
  }

  private apply(transition: ReaderTransition, readerChanged = true): boolean {
    this.#session = transition.session;
    if (transition.state === "rejected") {
      this.failTask(transition.reason, transition.message);
      return false;
    }
    this.#task = { state: "idle" };
    this.publish(readerChanged);
    return true;
  }

  private requireApplied<T>(
    transition: ReaderTransition<T>,
  ): Extract<ReaderTransition<T>, { readonly state: "applied" }> {
    this.#session = transition.session;
    if (transition.state === "rejected") {
      throw new ReaderControllerError(transition.reason, transition.message);
    }
    return transition;
  }

  private failTask(code: ReaderControllerErrorCode, message: string): void {
    this.#task = { state: "error", code, message };
    this.publish();
  }

  private replaceTask(task: ReaderControllerTask): void {
    this.#task = task;
    this.publish();
  }

  private publish(readerChanged = true): void {
    if (readerChanged) {
      this.#reader = createReaderViewModel(this.#session.view);
    }
    this.#snapshot = this.createSnapshot();
    for (const listener of [...this.#listeners]) {
      this.notify(listener);
    }
  }

  private createSnapshot(): ReaderControllerSnapshot {
    const view = this.#session.view;
    return deepFreeze({
      reader: this.#reader,
      presentation: view.current.presentation,
      task: { ...this.#task },
    });
  }

  private notify(listener: Listener): void {
    this.#notifying = true;
    try {
      listener(this.#snapshot);
    } catch (error) {
      reportSubscriberError(error);
    } finally {
      this.#notifying = false;
    }
  }

  private assertUsable(): void {
    if (this.#disposed) {
      throw new ReaderControllerError(
        "disposed",
        "Reader controller has been disposed.",
      );
    }
    if (this.#notifying) {
      throw new ReaderControllerError(
        "reentrant-action",
        "Reader actions cannot run during subscriber notification.",
      );
    }
  }
}

/** Resolves and qualifies one source using at most two source operations. */
export async function resolveReaderSource(
  request: SourceCardRequest,
  dataSource: ReaderControllerDataSource,
  signal: AbortSignal,
  onEffectiveRequest?: (request: SourceCardRequest) => void,
): Promise<ReaderResolvedSource> {
  const target = await dataSource.loadSource(request, signal);
  requireMatchingRequest(target.request, request);
  const targetData = requireNavigable(target, request.tref);
  let selectedRef = targetData.viewModel.items.find(
    (item) => item.ref === request.tref,
  )?.ref;
  if (
    selectedRef === undefined &&
    targetData.navigation.state === "available"
  ) {
    selectedRef = targetData.navigation.firstRef;
  }
  let content = target;
  let navigation = targetData.navigation;
  if (navigation.state === "context-required") {
    const effective = withTref(request, navigation.contextRef);
    onEffectiveRequest?.(effective);
    content = await dataSource.loadSource(effective, signal);
    requireMatchingRequest(content.request, effective);
    navigation = requireAvailable(
      requireNavigable(content, effective.tref).navigation,
      effective.tref,
    );
  } else if (targetData.viewModel.header.ref !== navigation.sectionRef) {
    const effective = withTref(request, navigation.sectionRef);
    onEffectiveRequest?.(effective);
    content = await dataSource.loadSource(effective, signal);
    requireMatchingRequest(content.request, effective);
    navigation = requireAvailable(
      requireNavigable(content, effective.tref).navigation,
      effective.tref,
    );
  } else {
    onEffectiveRequest?.(target.request);
  }
  const available = requireAvailable(navigation, request.tref);
  const viewModel = requireNavigable(content, request.tref).viewModel;
  selectedRef ??= available.firstRef;
  const selected = viewModel.items.find((item) => item.ref === selectedRef);
  if (!selected) {
    throw new ReaderControllerError(
      "source-unavailable",
      `${selectedRef} is not selectable in ${viewModel.header.ref}.`,
    );
  }
  return {
    content,
    record: getReaderSourceRecord(content),
    selectedPosition: selected.position,
    selectedRef,
  };
}

function requireNavigable(
  content: ReaderSourceContent,
  label: string,
): {
  readonly viewModel: SourceCardDataViewModel;
  readonly navigation: Exclude<
    SourceCardNavigation,
    { readonly state: "unavailable" }
  >;
} {
  const viewModel = content.viewModel;
  if (viewModel.state !== "data" || !viewModel.navigation) {
    throw new ReaderControllerError(
      "source-unavailable",
      `${label} did not produce selectable source data.`,
    );
  }
  if (viewModel.navigation.state === "unavailable") {
    throw new ReaderControllerError(
      "source-unavailable",
      viewModel.navigation.message,
    );
  }
  return { viewModel, navigation: viewModel.navigation };
}

function requireAvailable(
  navigation: Exclude<SourceCardNavigation, { readonly state: "unavailable" }>,
  label: string,
): Extract<SourceCardNavigation, { readonly state: "available" }> {
  if (navigation.state !== "available") {
    throw new ReaderControllerError(
      "source-unavailable",
      `${label} requires another contextual source request.`,
    );
  }
  return navigation;
}

function requireNavigableSeed(seed: ReaderEntrySeed): void {
  if (!seed.source) return;
  requireNavigable(seed.source, seed.source.request.tref);
}

function requireMatchingRequest(
  actual: SourceCardRequest,
  expected: SourceCardRequest,
): void {
  if (!sameJson(actual, expected)) {
    throw new ReaderControllerError(
      "request-mismatch",
      "Reader data source returned content for a different effective request.",
    );
  }
}

function normalizeSourceRequest(request: SourceCardRequest): SourceCardRequest {
  validateSourceRequest(request);
  return deepFreeze({
    ...request,
    tref: request.tref.trim(),
    ...(request.primary === undefined
      ? {}
      : { primary: { ...request.primary } }),
    ...(request.translation === undefined
      ? {}
      : { translation: { ...request.translation } }),
  });
}

function validateSourceRequest(request: SourceCardRequest): void {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Source reference must not be blank.");
  }
  for (const selection of [request.primary, request.translation]) {
    if (selection !== undefined && selection.versionTitle.trim().length === 0) {
      throw new TypeError("Source version title must not be blank.");
    }
  }
}

function validateRootOptions(options: ReaderControllerRootOptions): void {
  const presentation = options.presentation;
  if (
    (presentation?.contentLanguage !== undefined &&
      !["primary", "translation", "both"].includes(
        presentation.contentLanguage,
      )) ||
    (presentation?.layout !== undefined &&
      !["auto", "stacked", "side-by-side"].includes(presentation.layout)) ||
    (presentation?.sideOrder !== undefined &&
      !["primary-first", "translation-first"].includes(
        presentation.sideOrder,
      )) ||
    (presentation?.vocalizationMode !== undefined &&
      !["taamim_and_nikkud", "nikkud", "none"].includes(
        presentation.vocalizationMode,
      ))
  ) {
    throw new TypeError("Reader presentation contains an unsupported value.");
  }
  const projection = options.connections?.projection;
  const page = projection?.page ?? 0;
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page >= Number.MAX_SAFE_INTEGER / CONNECTIONS_PAGE_SIZE
  ) {
    throw new RangeError(
      "Connections page must be a nonnegative bounded integer.",
    );
  }
  if (
    projection?.category !== undefined &&
    projection.category.trim().length === 0
  ) {
    throw new TypeError("Connections category must not be blank.");
  }
}

function normalizeConnectionsRequest(
  request: ConnectionsRequest,
): ConnectionsRequest {
  return Object.freeze({ ...request, tref: request.tref.trim() });
}

function normalizeProjection(
  projection: ConnectionsProjection,
): ConnectionsProjection {
  return Object.freeze({ ...projection });
}

function parseSourceRequest(value: unknown, path: string): SourceCardRequest {
  const input = rawRecord(value, path);
  const request: SourceCardRequest = {
    tref: rawNonblankString(input.tref, `${path}/tref`),
    ...(input.primary === undefined
      ? {}
      : {
          primary: {
            versionTitle: rawNonblankString(
              rawRecord(input.primary, `${path}/primary`).versionTitle,
              `${path}/primary/versionTitle`,
            ),
          },
        }),
    ...(input.translation === undefined
      ? {}
      : {
          translation: {
            versionTitle: rawNonblankString(
              rawRecord(input.translation, `${path}/translation`).versionTitle,
              `${path}/translation/versionTitle`,
            ),
          },
        }),
  };
  return normalizeSourceRequest(request);
}

function parseConnectionsRequest(
  value: unknown,
  path: string,
): ConnectionsRequest {
  const input = rawRecord(value, path);
  if (input.withText !== undefined && typeof input.withText !== "boolean") {
    throw new TypeError(`${path}/withText must be a boolean.`);
  }
  return normalizeConnectionsRequest({
    tref: rawNonblankString(input.tref, `${path}/tref`),
    ...(input.withText === undefined ? {} : { withText: input.withText }),
  });
}

function parseProjection(value: unknown, path: string): ConnectionsProjection {
  const input = rawRecord(value, path);
  const projection: ConnectionsProjection = {
    ...(input.category === undefined
      ? {}
      : {
          category: rawNonblankString(input.category, `${path}/category`),
        }),
    ...(input.page === undefined
      ? {}
      : { page: rawNumber(input.page, `${path}/page`) }),
  };
  validateRootOptions({ connections: { projection } });
  return normalizeProjection(projection);
}

function parsePresentation(value: unknown): ReaderPresentationPatch {
  const input = rawRecord(value, "/presentation");
  const presentation: ReaderPresentationPatch = {
    ...(input.contentLanguage === undefined
      ? {}
      : {
          contentLanguage: rawString(
            input.contentLanguage,
            "/presentation/contentLanguage",
          ) as NonNullable<ReaderPresentationPatch["contentLanguage"]>,
        }),
    ...(input.layout === undefined
      ? {}
      : {
          layout: rawString(
            input.layout,
            "/presentation/layout",
          ) as NonNullable<ReaderPresentationPatch["layout"]>,
        }),
    ...(input.sideOrder === undefined
      ? {}
      : {
          sideOrder: rawString(
            input.sideOrder,
            "/presentation/sideOrder",
          ) as NonNullable<ReaderPresentationPatch["sideOrder"]>,
        }),
    ...(input.showConnectionPreviews === undefined
      ? {}
      : {
          showConnectionPreviews: rawBoolean(
            input.showConnectionPreviews,
            "/presentation/showConnectionPreviews",
          ),
        }),
    ...(input.vocalizationMode === undefined
      ? {}
      : {
          vocalizationMode: rawString(
            input.vocalizationMode,
            "/presentation/vocalizationMode",
          ) as NonNullable<ReaderPresentationPatch["vocalizationMode"]>,
        }),
  };
  validateRootOptions({ presentation });
  return deepFreeze(presentation);
}

function rawRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function rawString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${path} must be a string.`);
  }
  return value;
}

function rawNonblankString(value: unknown, path: string): string {
  const result = rawString(value, path).trim();
  if (result.length === 0) {
    throw new TypeError(`${path} must not be blank.`);
  }
  return result;
}

function rawBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${path} must be a boolean.`);
  }
  return value;
}

function rawNumber(value: unknown, path: string): number {
  if (typeof value !== "number") {
    throw new TypeError(`${path} must be a number.`);
  }
  return value;
}

function withTref(request: SourceCardRequest, tref: string): SourceCardRequest {
  return deepFreeze({ ...request, tref });
}

function classifySourceError(error: unknown): ReaderControllerErrorCode {
  if (error instanceof ReaderControllerError) return error.code;
  return "source-transport";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason !== undefined) throw signal.reason;
  throw new DOMException("The operation was aborted.", "AbortError");
}

function reportSubscriberError(error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
    return;
  }
  console.error(error);
}

function deepFreeze<Value>(value: Value): Value {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  const pairs: [unknown, unknown][] = [[left, right]];
  while (pairs.length > 0) {
    const pair = pairs.pop();
    if (!pair) break;
    const [first, second] = pair;
    if (first === second) continue;
    if (
      typeof first !== "object" ||
      first === null ||
      typeof second !== "object" ||
      second === null ||
      Array.isArray(first) !== Array.isArray(second)
    ) {
      return false;
    }
    const entries = Object.entries(first);
    const other = new Map(Object.entries(second));
    if (entries.length !== other.size) return false;
    for (const [key, value] of entries) {
      if (!other.has(key)) return false;
      pairs.push([value, other.get(key)]);
    }
  }
  return true;
}
