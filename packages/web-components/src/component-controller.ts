import {
  validateExternalResponse,
  type ContractIssue,
  type ResponseSelector,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

/** Private mechanical attempt state reused by typed owner controllers. */
export type ComponentControllerAttempt<TRequest, TLoading> =
  | { readonly state: "idle" }
  | {
      readonly state: "loading";
      readonly id: number;
      readonly request: TRequest;
      readonly viewModel: TLoading;
    }
  | {
      readonly state: "failed";
      readonly id: number;
      readonly request: TRequest;
      readonly error: unknown;
    };

/** Private snapshot shape specialized by each public owner controller. */
export interface ComponentControllerSnapshot<TResult, TRequest, TLoading> {
  /** Last successfully committed owner result, when available. */
  readonly result?: TResult;
  /** Current pending, failed, or idle attempt. */
  readonly attempt: ComponentControllerAttempt<TRequest, TLoading>;
}

/** Owner operations supplied to the private lifecycle engine. */
export interface ComponentControllerAdapter<
  TRequest,
  TLoading,
  TTerminal,
  TStatus extends number,
  TCommitted,
  TPublicResult,
> {
  /** Optional client required only by live loads. */
  readonly client?: SefariaClient;
  cloneRequest(request: TRequest): TRequest;
  createLoading(request: TRequest): TLoading;
  load(
    request: TRequest,
    client: SefariaClient,
    signal: AbortSignal,
  ): Promise<{ readonly payload: unknown; readonly status: TStatus }>;
  project(
    request: TRequest,
    payload: unknown,
    status: TStatus,
  ): {
    readonly committed: TCommitted;
    readonly result: TPublicResult;
    readonly viewModel: TTerminal;
  };
  validateStatus(status: number): asserts status is TStatus;
}

interface ActiveOperation {
  readonly id: number;
  readonly controller: AbortController;
  cleanupExternal(): void;
}

type Listener<TResult, TRequest, TLoading> = (
  snapshot: ComponentControllerSnapshot<TResult, TRequest, TLoading>,
) => void;

/** Private lifecycle engine instantiated only by typed owner modules. */
export class ComponentControllerEngine<
  TRequest,
  TLoading,
  TTerminal,
  TStatus extends number,
  TCommitted,
  TPublicResult,
> {
  readonly #adapter: ComponentControllerAdapter<
    TRequest,
    TLoading,
    TTerminal,
    TStatus,
    TCommitted,
    TPublicResult
  >;
  #committed:
    | {
        readonly value: TCommitted;
        readonly result: TPublicResult;
        readonly viewModel: TTerminal;
      }
    | undefined;
  #attempt: ComponentControllerAttempt<TRequest, TLoading> = {
    state: "idle",
  };
  #snapshot: ComponentControllerSnapshot<TPublicResult, TRequest, TLoading> =
    deepFreeze({ attempt: { state: "idle" } });
  #listeners = new Set<Listener<TPublicResult, TRequest, TLoading>>();
  #active: ActiveOperation | undefined;
  #nextId = 1;
  #notifying = false;
  #disposed = false;

  constructor(
    adapter: ComponentControllerAdapter<
      TRequest,
      TLoading,
      TTerminal,
      TStatus,
      TCommitted,
      TPublicResult
    >,
  ) {
    this.#adapter = adapter;
  }

  get snapshot(): ComponentControllerSnapshot<
    TPublicResult,
    TRequest,
    TLoading
  > {
    return this.#snapshot;
  }

  get committed(): TCommitted | undefined {
    return this.#committed?.value;
  }

  subscribe(listener: Listener<TPublicResult, TRequest, TLoading>): () => void {
    this.#assertUsable();
    this.#listeners.add(listener);
    this.#notify(listener);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.#listeners.delete(listener);
    };
  }

  async load(request: TRequest, signal?: AbortSignal): Promise<TTerminal> {
    this.#assertUsable();
    const client = this.#adapter.client;
    if (client === undefined) {
      throw new Error("This component controller has no supplied client.");
    }
    throwIfAborted(signal);
    const effectiveRequest = deepFreeze(this.#adapter.cloneRequest(request));
    const loading = this.#adapter.createLoading(effectiveRequest);
    const id = this.#nextId++;
    const controller = new AbortController();
    const cleanupExternal = linkAbortSignal(signal, controller);
    const active = { id, controller, cleanupExternal };
    this.#cancelActive(createAbortReason("Superseded component load."), false);
    this.#active = active;
    this.#attempt = deepFreeze({
      state: "loading",
      id,
      request: effectiveRequest,
      viewModel: loading,
    });
    this.#publish();

    const operation = this.#adapter.load(
      effectiveRequest,
      client,
      controller.signal,
    );
    operation.catch(() => undefined);
    try {
      const response = await raceAbort(operation, controller.signal);
      if (this.#active !== active) {
        throw controller.signal.reason;
      }
      const projected = this.#adapter.project(
        effectiveRequest,
        response.payload,
        response.status,
      );
      this.#active = undefined;
      active.cleanupExternal();
      this.#commit(projected);
      return projected.viewModel;
    } catch (error) {
      active.cleanupExternal();
      if (this.#active !== active) {
        throw controller.signal.aborted ? controller.signal.reason : error;
      }
      this.#active = undefined;
      if (controller.signal.aborted) {
        this.#attempt = { state: "idle" };
        this.#publish();
        throw controller.signal.reason;
      }
      this.#attempt = deepFreeze({
        state: "failed",
        id,
        request: effectiveRequest,
        error,
      });
      this.#publish();
      throw error;
    }
  }

  setSuppliedData(
    request: TRequest,
    payload: unknown,
    status: number,
  ): TTerminal {
    this.#assertUsable();
    this.#adapter.validateStatus(status);
    const projected = this.#adapter.project(request, payload, status);
    this.#cancelActive(
      createAbortReason("Superseded by supplied component data."),
      false,
    );
    this.#commit(projected);
    return projected.viewModel;
  }

  replaceCommitted(projected: {
    readonly committed: TCommitted;
    readonly result: TPublicResult;
    readonly viewModel: TTerminal;
  }): TTerminal {
    this.#assertUsable();
    this.#cancelActive(
      createAbortReason("Superseded by local component projection."),
      false,
    );
    this.#commit(projected);
    return projected.viewModel;
  }

  cancel(
    reason: unknown = createAbortReason("Component load cancelled."),
  ): void {
    this.#assertUsable();
    this.#cancelActive(reason, true);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#cancelActive(
      createAbortReason("Component controller disposed."),
      false,
    );
    this.#disposed = true;
    this.#committed = undefined;
    this.#attempt = { state: "idle" };
    this.#listeners.clear();
    this.#snapshot = deepFreeze({ attempt: { state: "idle" } });
  }

  assertUsable(): void {
    this.#assertUsable();
  }

  #commit(projected: {
    readonly committed: TCommitted;
    readonly result: TPublicResult;
    readonly viewModel: TTerminal;
  }): void {
    this.#committed = deepFreeze({
      value: projected.committed,
      result: projected.result,
      viewModel: projected.viewModel,
    });
    this.#attempt = { state: "idle" };
    this.#publish();
  }

  #cancelActive(reason: unknown, publish: boolean): void {
    const active = this.#active;
    if (active === undefined) return;
    this.#active = undefined;
    active.cleanupExternal();
    active.controller.abort(reason);
    this.#attempt = { state: "idle" };
    if (publish) this.#publish();
  }

  #publish(): void {
    this.#snapshot = deepFreeze({
      ...(this.#committed === undefined
        ? {}
        : { result: this.#committed.result }),
      attempt: this.#attempt,
    });
    for (const listener of [...this.#listeners]) this.#notify(listener);
  }

  #notify(listener: Listener<TPublicResult, TRequest, TLoading>): void {
    this.#notifying = true;
    try {
      listener(this.#snapshot);
    } catch (error) {
      reportSubscriberError(error);
    } finally {
      this.#notifying = false;
    }
  }

  #assertUsable(): void {
    if (this.#disposed) {
      throw new Error("Component controller has been disposed.");
    }
    if (this.#notifying) {
      throw new Error(
        "Component controller operations cannot run during subscriber notification.",
      );
    }
  }
}

/** Validation failure for unknown supplied component response data. */
export class SuppliedComponentDataError extends Error {
  /** Generated operation and documented status used for validation. */
  readonly selector: ResponseSelector;
  /** Structured generated-contract issues. */
  readonly issues: readonly ContractIssue[];

  constructor(selector: ResponseSelector, issues: readonly ContractIssue[]) {
    super(
      issues
        .map(
          (issue) =>
            `${issue.instancePath || "/"} ${issue.keyword}${
              issue.message ? `: ${issue.message}` : ""
            }`,
        )
        .join("; "),
    );
    this.name = "SuppliedComponentDataError";
    this.selector = selector;
    this.issues = issues;
  }
}

/** Validates unknown data against one fixed generated operation response. */
export function validateSuppliedComponentData<T>(
  selector: ResponseSelector,
  payload: unknown,
): T {
  const result = validateExternalResponse(selector, payload);
  if (!result.valid) {
    throw new SuppliedComponentDataError(selector, result.issues);
  }
  return payload as T;
}

/** Creates the controller-owned abort reason used for cancellation. */
export function createAbortReason(message: string): DOMException {
  return new DOMException(message, "AbortError");
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason;
}

function linkAbortSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (signal === undefined) return () => undefined;
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  return () => signal.removeEventListener("abort", abort);
}

async function raceAbort<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw signal.reason;
  return await new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function reportSubscriberError(error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
    return;
  }
  console.error(error);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}
