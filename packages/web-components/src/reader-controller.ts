import {
  related,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

import type { SefariaDataLoader } from "./data-source.js";
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
import {
  acquireSelectedText,
  normalizeTranslationFallback,
  normalizeTranslationLanguage,
  type SelectedTextProgress,
  type TranslationFallback,
} from "./translation-selection.js";
import type {
  SourceCardDataViewModel,
  SourceCardEmptyViewModel,
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
export interface ReaderControllerRecordLoader {
  /** Loads admitted source content for the exact effective request. */
  loadSource(
    request: SourceCardRequest,
    signal: AbortSignal,
    progress?: SelectedTextProgress,
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
      readonly cause?: unknown;
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
  /** Internal in-flight source qualification retained only across disconnection. */
  readonly sourceProgress?: ReaderSourceProgress;
}

/** Private-module progress for one target/context qualification, not a response cache. */
export interface ReaderSourceProgress {
  /** Missing-language decision for the requested target. */
  readonly target: SelectedTextProgress;
  /** Missing-language decision for its containing context. */
  readonly context: SelectedTextProgress;
  /** Already-qualified target retained while its context is interrupted. */
  targetContent?: ReaderSourceContent;
}

function newSourceProgress(): ReaderSourceProgress {
  return { target: { fallback: false }, context: { fallback: false } };
}

/** Suspended element-owned Reader work eligible for lifecycle resumption. */
export type ReaderControllerSuspension =
  | {
      /** Root replacement or initialization source phase. */
      readonly kind: "root";
      /** Requested external root. */
      readonly request: SourceCardRequest;
      /** Interrupted source qualification. */
      readonly sourceProgress: ReaderSourceProgress;
    }
  | {
      /** Contextual history navigation source phase. */
      readonly kind: "navigation";
      /** Entry that originated navigation. */
      readonly originEntryId: string;
      /** Requested connected source. */
      readonly targetRef: string;
      /** Interrupted source qualification. */
      readonly sourceProgress: ReaderSourceProgress;
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

/** Qualified Reader source shared by ordinary and spatial coordination. */
export interface ReaderResolvedSource {
  /** Admitted source content used by existing session transitions. */
  readonly content: ReaderSourceContent;
  /** Stable raw corrected-payload record for advanced consumers. */
  readonly record: ReaderSourceRecord;
  /** Exact selected source position, absent when the source has no renderable selectable text. */
  readonly selectedPosition?: readonly number[];
  /** Exact canonical selected reference, absent when the source has no renderable selectable text. */
  readonly selectedRef?: string;
}

interface ActiveOperation {
  readonly generation: number;
  readonly controller: AbortController;
}

type Listener = (snapshot: ReaderControllerSnapshot) => void;

/** Creates a client-backed reader data source with component request defaults. */
export function createSefariaReaderRecordLoader(
  client: SefariaClient,
): ReaderControllerRecordLoader {
  return {
    loadSource: async (request, signal, progress) => {
      const response = await acquireSelectedText(
        { kind: "client", client },
        request.tref,
        serializeSourceCardSelectors(request),
        request.translationLanguage,
        request.translationFallback ?? "default",
        signal,
        progress,
      );
      if (response.status === 200)
        return createReaderSourceContent(response.payload, request);
      throw new ReaderControllerError(
        "source-http",
        response.payload.error,
        response.status,
      );
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

/** Creates a host-loader Reader data source without browser fallback. */
export function createCustomReaderRecordLoader(
  loader: SefariaDataLoader,
): ReaderControllerRecordLoader {
  return {
    loadSource: async (request, signal, progress) => {
      if (loader.getText === undefined) {
        throw new Error("The selected data source does not support text.");
      }

      const response = await acquireSelectedText(
        { kind: "custom", loader },
        request.tref,
        serializeSourceCardSelectors(request),
        request.translationLanguage,
        request.translationFallback ?? "default",
        signal,
        progress,
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
      if (loader.getLinks === undefined) {
        throw new Error("The selected data source does not support links.");
      }
      const response = await loader.getLinks(
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

/**
 * Loads Reader source, publishes it, and then continues with connections.
 */
export async function loadReaderControllerProgressively(
  request: SourceCardRequest,
  dataSource: ReaderControllerRecordLoader,
  onSource: (controller: ReaderController) => void,
  options: ReaderControllerLoadOptions = {},
  retainPublishedOnFailure = false,
): Promise<ReaderController> {
  const normalized = normalizeSourceRequest(request);
  const signal = options.signal ?? new AbortController().signal;
  throwIfAborted(signal);
  let destination: ReaderResolvedSource;
  try {
    destination = await resolveReaderSource(
      normalized,
      dataSource,
      signal,
      undefined,
      options.sourceProgress,
    );
  } catch (error) {
    throwIfAborted(signal);
    if (error instanceof ReaderControllerError) throw error;
    throw new ReaderControllerError("source-transport", errorMessage(error));
  }
  throwIfAborted(signal);
  const controller = new ReaderControllerImpl(
    {
      source: destination.content,
      ...(destination.selectedPosition === undefined
        ? {}
        : { selectedPosition: destination.selectedPosition }),
      ...(options.presentation === undefined
        ? {}
        : { presentation: options.presentation }),
    },
    dataSource,
    options,
  );
  onSource(controller);
  try {
    if (destination.selectedRef === undefined) return controller;
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
  const dataSource = createSefariaReaderRecordLoader(client);
  return await loadReaderControllerProgressively(
    request,
    dataSource,
    () => undefined,
    options,
  );
}

/** Options for a controller admitted from retained Reader content. */
export interface ReaderControllerSeedOptions extends ReaderSessionOptions {
  /** Preferred family for navigation when the current entry has no source request. */
  readonly translationLanguage?: string;
  /** Missing preferred-translation policy for navigation when the current entry has no source request. */
  readonly translationFallback?: TranslationFallback;
}

/** Creates a zero-request controller from already admitted reader content. */
export function createReaderController(
  seed: ReaderEntrySeed,
  dataSource: ReaderControllerRecordLoader,
  options: ReaderControllerSeedOptions = {},
): ReaderController {
  requireNavigableSeed(seed);
  return new ReaderControllerImpl(seed, dataSource, options);
}

class ReaderControllerImpl implements ReaderController {
  #session: ReaderSession;
  readonly #dataSource: ReaderControllerRecordLoader;
  #task: ReaderControllerTask = { state: "idle" };
  #snapshot: ReaderControllerSnapshot;
  #reader: ReaderViewModel;
  #listeners = new Set<Listener>();
  #controller: AbortController | undefined;
  #operationId: string | undefined;
  #generation = 0;
  #disposed = false;
  #notifying = false;
  #sourceProgress = newSourceProgress();
  #resumeSourceProgress: ReaderSourceProgress | undefined;
  #pendingSourceRequest: SourceCardRequest | undefined;
  readonly #seedTranslationLanguage: string | undefined;
  readonly #seedTranslationFallback: TranslationFallback | undefined;

  constructor(
    seed: ReaderEntrySeed,
    dataSource: ReaderControllerRecordLoader,
    options: ReaderControllerSeedOptions,
  ) {
    requireNavigableSeed(seed);
    this.#session = createReaderSession(seed, options);
    this.#dataSource = dataSource;
    this.#seedTranslationLanguage =
      options.translationLanguage === undefined
        ? undefined
        : normalizeTranslationLanguage(options.translationLanguage);
    this.#seedTranslationFallback =
      options.translationFallback === undefined
        ? undefined
        : normalizeTranslationFallback(options.translationFallback);
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
    this.#pendingSourceRequest = targetRequest;
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
        undefined,
        this.#sourceProgress,
      );
      if (!this.isActive(active)) return;
      const replaced = this.#session.replaceRoot({
        source: destination.content,
        ...(destination.selectedPosition === undefined
          ? {}
          : { selectedPosition: destination.selectedPosition }),
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
      if (destination.selectedRef !== undefined) {
        await this.loadConnections(
          this.#session.view.currentEntryId,
          normalizeConnectionsRequest({
            tref: destination.selectedRef,
            withText: options.connections?.withText !== false,
          }),
          options.connections?.projection ?? {},
          active,
        );
      }
    } catch (error) {
      if (!this.isActive(active)) return;
      this.failTask(classifySourceError(error), errorMessage(error), error);
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
    const source = this.#session.view.current.source;
    const translationLanguage =
      source === undefined
        ? this.#seedTranslationLanguage
        : source.request.translationLanguage;
    const translationFallback =
      source === undefined
        ? this.#seedTranslationFallback
        : source.request.translationFallback;
    const targetRequest = normalizeSourceRequest({
      tref: action.targetRef,
      ...(translationLanguage === undefined ? {} : { translationLanguage }),
      ...(translationFallback === undefined ? {} : { translationFallback }),
    });
    const active = this.startPhysicalOperation();
    this.#pendingSourceRequest = targetRequest;
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
        this.#sourceProgress,
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
          ...(destination.selectedPosition === undefined
            ? {}
            : { selectedPosition: destination.selectedPosition }),
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
      if (destination.selectedRef !== undefined) {
        await this.loadConnections(
          this.#session.view.currentEntryId,
          normalizeConnectionsRequest({
            tref: destination.selectedRef,
            withText: true,
          }),
          {},
          active,
        );
      }
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
          ? {
              kind: "root",
              request: this.#pendingSourceRequest ?? { tref: task.targetRef },
              sourceProgress: this.#sourceProgress,
            }
          : {
              kind: "navigation",
              originEntryId: task.originEntryId,
              targetRef: task.targetRef,
              sourceProgress: this.#sourceProgress,
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
      this.#resumeSourceProgress = suspension.sourceProgress;
      await this.replaceRoot(suspension.request);
      return;
    }
    if (suspension.kind === "navigation") {
      this.#resumeSourceProgress = suspension.sourceProgress;
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
    this.#sourceProgress = this.#resumeSourceProgress ?? newSourceProgress();
    this.#resumeSourceProgress = undefined;
    const controller = new AbortController();
    this.#controller = controller;
    return { generation: this.#generation, controller };
  }

  private cancelActive(publish: boolean): void {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#pendingSourceRequest = undefined;
    this.#sourceProgress = newSourceProgress();
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
      this.#pendingSourceRequest = undefined;
      this.#sourceProgress = newSourceProgress();
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

  private failTask(
    code: ReaderControllerErrorCode,
    message: string,
    cause?: unknown,
  ): void {
    this.#task = {
      state: "error",
      code,
      message,
      ...(cause === undefined ? {} : { cause }),
    };
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
  dataSource: ReaderControllerRecordLoader,
  signal: AbortSignal,
  onEffectiveRequest?: (request: SourceCardRequest) => void,
  progress: ReaderSourceProgress = newSourceProgress(),
): Promise<ReaderResolvedSource> {
  const target =
    progress.targetContent ??
    (await dataSource.loadSource(request, signal, progress.target));
  throwIfAborted(signal);
  requireMatchingRequest(target.request, request);
  const targetData = requireNavigable(target, request.tref);
  progress.targetContent = target;
  let selectedRef =
    targetData.viewModel.state === "data"
      ? targetData.viewModel.items.find((item) => item.ref === request.tref)
          ?.ref
      : undefined;
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
    content = await dataSource.loadSource(effective, signal, progress.context);
    throwIfAborted(signal);
    requireMatchingRequest(content.request, effective);
    navigation = requireAvailable(
      requireNavigable(content, effective.tref).navigation,
      effective.tref,
    );
  } else if (targetData.viewModel.header.ref !== navigation.sectionRef) {
    const effective = withTref(request, navigation.sectionRef);
    onEffectiveRequest?.(effective);
    content = await dataSource.loadSource(effective, signal, progress.context);
    throwIfAborted(signal);
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
  if (viewModel.state === "empty") {
    return {
      content,
      record: getReaderSourceRecord(content),
    };
  }
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
  readonly viewModel: SourceCardDataViewModel | SourceCardEmptyViewModel;
  readonly navigation: Exclude<
    SourceCardNavigation,
    { readonly state: "unavailable" }
  >;
} {
  const viewModel = content.viewModel;
  if (
    (viewModel.state !== "data" && viewModel.state !== "empty") ||
    !viewModel.navigation
  ) {
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
    ...(request.translationLanguage === undefined
      ? {}
      : {
          translationLanguage: normalizeTranslationLanguage(
            request.translationLanguage,
          ),
        }),
    ...(request.translationFallback === undefined
      ? {}
      : {
          translationFallback: normalizeTranslationFallback(
            request.translationFallback,
          ),
        }),
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
  serializeSourceCardSelectors(request);
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
