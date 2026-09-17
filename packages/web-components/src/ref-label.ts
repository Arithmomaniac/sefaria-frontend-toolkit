import {
  getRef,
  type CoreRefResponse,
  type GetRefData,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import {
  ComponentControllerEngine,
  validateSuppliedComponentData,
  type ComponentControllerAttempt,
  type ComponentControllerSnapshot,
} from "./component-controller.js";

const DEFAULT_SITE_ORIGIN = "https://www.sefaria.org";
const PATH_CHARACTER = /^[A-Za-z0-9\-._~!$&'()*+,;=:@]$/u;
const ESCAPED_OCTET = /^%[0-9A-Fa-f]{2}$/u;

/** Typed inputs owned by the non-DOM reference-label factories. */
export interface RefLabelRequest {
  /** Reference passed to `GET /api/ref/{tref}`. */
  readonly tref: GetRefData["path"]["tref"];
}

/** Deterministic options used while projecting a reference label. */
export interface RefLabelFactoryOptions {
  /** HTTP(S) origin used to build the canonical absolute URL. */
  readonly siteOrigin?: string;
}

/** Host-supplied state displayed while a reference-label request is pending. */
export interface RefLabelLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Canonical render-ready identity for one Sefaria reference. */
export interface RefLabelDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Canonical human-readable English reference. */
  readonly normalized: string;
  /** Hebrew reference form supplied by Sefaria. */
  readonly hebrew: string;
  /** Canonical Sefaria path form returned by the API. */
  readonly urlRef: string;
  /** Canonical absolute HTTP(S) link target. */
  readonly url: string;
  /** Canonical owning index title. */
  readonly indexTitle: string;
  /** Sefaria node class that resolved the reference. */
  readonly nodeType: string;
}

/** Valid HTTP 200 result for a string that is not a Sefaria reference. */
export interface RefLabelEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Original reference string that could not be resolved. */
  readonly tref: string;
  /** Human-readable empty-state message. */
  readonly message: string;
}

/** Documented reference endpoint HTTP failure. */
export interface RefLabelHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-ref-label>`. */
export type RefLabelViewModel =
  | RefLabelLoadingViewModel
  | RefLabelDataViewModel
  | RefLabelEmptyViewModel
  | RefLabelHttpErrorViewModel;

/** Terminal reference-label state committed by a headless controller. */
export type RefLabelTerminalViewModel = Exclude<
  RefLabelViewModel,
  RefLabelLoadingViewModel
>;

/** One committed reference-label request and terminal rendering result. */
export interface RefLabelControllerResult {
  /** Effective request used for the committed result. */
  readonly request: RefLabelRequest;
  /** Terminal component view model. */
  readonly viewModel: RefLabelTerminalViewModel;
}

/** Current reference-label controller attempt. */
export type RefLabelControllerAttempt = ComponentControllerAttempt<
  RefLabelRequest,
  RefLabelLoadingViewModel
>;

/** Immutable reference-label controller publication. */
export type RefLabelControllerSnapshot = ComponentControllerSnapshot<
  RefLabelControllerResult,
  RefLabelRequest,
  RefLabelLoadingViewModel
>;

/** Stateful DOM-free reference-label loading lifecycle. */
export interface RefLabelController {
  /** Current committed result and pending or failed attempt. */
  readonly snapshot: RefLabelControllerSnapshot;
  /** Subscribes immediately and after each snapshot replacement. */
  subscribe(
    listener: (snapshot: RefLabelControllerSnapshot) => void,
  ): () => void;
  /** Loads and commits one reference-label request. */
  load(
    request: RefLabelRequest,
    signal?: AbortSignal,
  ): Promise<RefLabelTerminalViewModel>;
  /** Validates and commits supplied corrected response data with zero I/O. */
  setSuppliedData(
    request: RefLabelRequest,
    payload: unknown,
    status?: 200 | 404,
  ): RefLabelTerminalViewModel;
  /** Cancels active work without disposing committed content. */
  cancel(reason?: unknown): void;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

/** Projects one validated reference response into a render-ready label. */
export function createRefLabelViewModel(
  payload: CoreRefResponse,
  request: RefLabelRequest,
  options: RefLabelFactoryOptions = {},
): RefLabelViewModel {
  const tref = requireTref(request.tref);
  const siteOrigin = requireSiteOrigin(options.siteOrigin);

  if (!payload.is_ref) {
    return {
      state: "empty",
      tref,
      message: `"${tref}" is not a recognized Sefaria reference.`,
    };
  }

  return {
    state: "data",
    normalized: payload.normalized,
    hebrew: payload.hebrew,
    urlRef: payload.url_ref,
    url: createCanonicalUrl(payload.url_ref, siteOrigin),
    indexTitle: payload.index_title,
    nodeType: payload.node_type,
  };
}

/** Requests one validated reference payload and delegates to the pure factory. */
export async function loadRefLabelViewModel(
  request: RefLabelRequest,
  client: SefariaClient,
  signal?: AbortSignal,
  options: RefLabelFactoryOptions = {},
): Promise<RefLabelViewModel> {
  requireSiteOrigin(options.siteOrigin);
  const response = await requestRefLabelResponse(request, client, signal);
  return projectRefLabelResponse(
    request,
    response.payload,
    response.status,
    options,
  );
}

/** Creates a zero-request reference-label controller with deterministic options. */
export function createRefLabelController(
  client?: SefariaClient,
  factoryOptions: RefLabelFactoryOptions = {},
): RefLabelController {
  requireSiteOrigin(factoryOptions.siteOrigin);
  const options = Object.freeze({ ...factoryOptions });
  const engine = new ComponentControllerEngine({
    ...(client === undefined ? {} : { client }),
    createLoading: (request: RefLabelRequest) => ({
      state: "loading" as const,
      message: `Loading ${request.tref}.`,
    }),
    load: requestRefLabelResponse,
    project: (request, payload, status) => {
      const viewModel = projectRefLabelResponse(
        request,
        payload,
        status,
        options,
      );
      const result = { request: { ...request }, viewModel };
      return { committed: result, result, viewModel };
    },
    validateStatus: assertRefLabelStatus,
  });
  return {
    get snapshot() {
      return engine.snapshot;
    },
    subscribe: (listener) => engine.subscribe(listener),
    load: (request, signal) => {
      requireTref(request.tref);
      return engine.load(request, signal);
    },
    setSuppliedData: (request, payload, status = 200) => {
      requireTref(request.tref);
      return engine.setSuppliedData(request, payload, status);
    },
    cancel: (reason) => engine.cancel(reason),
    dispose: () => engine.dispose(),
  };
}

async function requestRefLabelResponse(
  request: RefLabelRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<{
  readonly payload: CoreRefResponse | { readonly error: string };
  readonly status: 200 | 404;
}> {
  const tref = requireTref(request.tref);
  const result = await getRef({
    client,
    path: { tref },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return { payload: result.data, status: 200 };
  }

  if (result.error !== undefined && result.response?.status === 404) {
    return { payload: result.error, status: 404 };
  }

  throw new Error(
    "The reference request returned no data or documented error.",
  );
}

function projectRefLabelResponse(
  request: RefLabelRequest,
  payload: unknown,
  status: 200 | 404,
  options: RefLabelFactoryOptions,
): RefLabelTerminalViewModel {
  const validated = validateSuppliedComponentData<
    CoreRefResponse | { readonly error: string }
  >({ method: "GET", path: "/api/ref/{tref}", status }, payload);
  return status === 200
    ? (createRefLabelViewModel(
        validated as CoreRefResponse,
        request,
        options,
      ) as RefLabelTerminalViewModel)
    : {
        state: "error",
        errorKind: "http",
        status: 404,
        message: (validated as { readonly error: string }).error,
      };
}

function assertRefLabelStatus(status: number): asserts status is 200 | 404 {
  if (status !== 200 && status !== 404) {
    throw new RangeError("Reference-label status must be 200 or 404.");
  }
}

function requireTref(tref: string): string {
  const trimmed = tref.trim();
  if (trimmed.length === 0) {
    throw new TypeError("Reference label tref must not be blank.");
  }
  return trimmed;
}

function requireSiteOrigin(siteOrigin: string | undefined): URL {
  const parsed = new URL(siteOrigin ?? DEFAULT_SITE_ORIGIN);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Reference label site origin must use HTTP or HTTPS.");
  }
  return parsed;
}

function createCanonicalUrl(urlRef: string, siteOrigin: URL): string {
  return new URL(`/${encodeUrlRef(urlRef)}`, siteOrigin.origin).href;
}

function encodeUrlRef(urlRef: string): string {
  return urlRef.replaceAll(/%[0-9A-Fa-f]{2}|./gu, (character) => {
    if (ESCAPED_OCTET.test(character) || PATH_CHARACTER.test(character)) {
      return character;
    }
    return encodeURIComponent(character);
  });
}
