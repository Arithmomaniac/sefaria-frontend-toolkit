import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

import {
  projectTextSegmentVersion,
  type TextSegmentDataViewModel,
} from "./text-segment.js";
import type {
  BilingualPairAbsentSide,
  BilingualPairPresentSide,
  BilingualPairSide,
} from "./bilingual-pair.js";
import {
  ComponentControllerEngine,
  validateSuppliedComponentData,
  type ComponentControllerAttempt,
  type ComponentControllerSnapshot,
} from "./component-controller.js";

/** Payload role rendered on one bilingual side. */
export type BilingualSegmentSide = BilingualPairSide;

/** Exact edition requested for one bilingual side. */
export interface BilingualSegmentEditionSelection {
  /** Exact Sefaria version title. */
  readonly versionTitle: string;
}

/** Input owned by the non-DOM bilingual-segment factories. */
export interface BilingualSegmentRequest {
  /** Segment reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Exact edition for the primary side, when a specific edition is required. */
  readonly primary?: BilingualSegmentEditionSelection;
  /** Exact edition for the translation side, when one is required. */
  readonly translation?: BilingualSegmentEditionSelection;
}

/** Host-supplied state displayed while a bilingual request is pending. */
export interface BilingualSegmentLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** One side that the payload did not supply as renderable text. */
export type BilingualSegmentAbsentSide = BilingualPairAbsentSide;

/** One side that the payload supplied as renderable text. */
export type BilingualSegmentPresentSide = BilingualPairPresentSide;

/** Both sides resolved to renderable text. */
export interface BilingualSegmentDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Render-ready primary-side data. */
  readonly primary: TextSegmentDataViewModel;
  /** Render-ready translation-side data. */
  readonly translation: TextSegmentDataViewModel;
}

/** Exactly one side resolved to renderable text. */
export interface BilingualSegmentPartialViewModel {
  /** State discriminator. */
  readonly state: "partial";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** The side that produced renderable text. */
  readonly present: BilingualSegmentPresentSide;
  /** The side that produced none. */
  readonly absent: BilingualSegmentAbsentSide;
}

/** Neither side resolved to renderable text. */
export interface BilingualSegmentEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Both sides, in primary-then-translation order. */
  readonly absent: readonly [
    BilingualSegmentAbsentSide,
    BilingualSegmentAbsentSide,
  ];
}

/** Valid payload that cannot represent one aligned pair. */
export interface BilingualSegmentProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface BilingualSegmentHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-bilingual-segment>`. */
export type BilingualSegmentViewModel =
  | BilingualSegmentLoadingViewModel
  | BilingualSegmentDataViewModel
  | BilingualSegmentPartialViewModel
  | BilingualSegmentEmptyViewModel
  | BilingualSegmentProjectionErrorViewModel
  | BilingualSegmentHttpErrorViewModel;

/** Terminal bilingual state committed by a headless controller. */
export type BilingualSegmentTerminalViewModel = Exclude<
  BilingualSegmentViewModel,
  BilingualSegmentLoadingViewModel
>;

/** One committed bilingual request and terminal rendering result. */
export interface BilingualSegmentControllerResult {
  /** Effective request used for the committed result. */
  readonly request: BilingualSegmentRequest;
  /** Terminal component view model. */
  readonly viewModel: BilingualSegmentTerminalViewModel;
}

/** Current bilingual controller attempt. */
export type BilingualSegmentControllerAttempt = ComponentControllerAttempt<
  BilingualSegmentRequest,
  BilingualSegmentLoadingViewModel
>;

/** Immutable bilingual controller publication. */
export type BilingualSegmentControllerSnapshot = ComponentControllerSnapshot<
  BilingualSegmentControllerResult,
  BilingualSegmentRequest,
  BilingualSegmentLoadingViewModel
>;

/** Stateful DOM-free bilingual-segment loading lifecycle. */
export interface BilingualSegmentController {
  /** Current committed result and pending or failed attempt. */
  readonly snapshot: BilingualSegmentControllerSnapshot;
  /** Subscribes immediately and after each snapshot replacement. */
  subscribe(
    listener: (snapshot: BilingualSegmentControllerSnapshot) => void,
  ): () => void;
  /** Loads and commits one bilingual request. */
  load(
    request: BilingualSegmentRequest,
    signal?: AbortSignal,
  ): Promise<BilingualSegmentTerminalViewModel>;
  /** Validates and commits supplied corrected response data with zero I/O. */
  setSuppliedData(
    request: BilingualSegmentRequest,
    payload: unknown,
    status?: 200 | 400 | 404,
  ): BilingualSegmentTerminalViewModel;
  /** Cancels active work without disposing committed content. */
  cancel(reason?: unknown): void;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

const SIDES: readonly BilingualSegmentSide[] = ["primary", "translation"];

/**
 * Projects one validated v3 texts response into an aligned bilingual pair.
 */
export function createBilingualSegmentViewModel(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
): BilingualSegmentViewModel {
  serializeSelectors(request);

  const resolved = resolveBilingualSides(payload.versions, request);
  if (resolved.ambiguousSide !== undefined) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Bilingual segment requires at most one ${resolved.ambiguousSide} version; the payload supplies more.`,
    };
  }

  const projected: Partial<
    Record<BilingualSegmentSide, TextSegmentDataViewModel>
  > = {};

  for (const side of SIDES) {
    const version = resolved.versions[side];
    if (version === undefined) {
      continue;
    }

    const result = projectTextSegmentVersion(payload, version);
    if (result.state === "error") {
      return {
        state: "error",
        errorKind: "projection",
        message: `The ${side} side could not be projected. ${result.message}`,
      };
    }
    if (result.state === "data") {
      projected[side] = result;
    }
  }

  const primary = projected.primary;
  const translation = projected.translation;

  if (primary !== undefined && translation !== undefined) {
    return {
      state: "data",
      ref: payload.ref,
      heRef: payload.heRef,
      primary,
      translation,
    };
  }

  if (primary !== undefined) {
    return {
      state: "partial",
      ref: payload.ref,
      heRef: payload.heRef,
      present: { side: "primary", view: primary },
      absent: describeAbsentBilingualSide(payload, request, "translation"),
    };
  }

  if (translation !== undefined) {
    return {
      state: "partial",
      ref: payload.ref,
      heRef: payload.heRef,
      present: { side: "translation", view: translation },
      absent: describeAbsentBilingualSide(payload, request, "primary"),
    };
  }

  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    absent: [
      describeAbsentBilingualSide(payload, request, "primary"),
      describeAbsentBilingualSide(payload, request, "translation"),
    ],
  };
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadBilingualSegmentViewModel(
  request: BilingualSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<BilingualSegmentViewModel> {
  const response = await requestBilingualSegmentResponse(
    request,
    client,
    signal,
  );
  return projectBilingualSegmentResponse(
    request,
    response.payload,
    response.status,
  );
}

/** Creates a zero-request bilingual controller with an optional live client. */
export function createBilingualSegmentController(
  client?: SefariaClient,
): BilingualSegmentController {
  const engine = new ComponentControllerEngine({
    ...(client === undefined ? {} : { client }),
    createLoading: (request: BilingualSegmentRequest) => ({
      state: "loading" as const,
      message: `Loading ${request.tref}.`,
    }),
    load: requestBilingualSegmentResponse,
    project: (request, payload, status) => {
      const viewModel = projectBilingualSegmentResponse(
        request,
        payload,
        status,
      );
      const result = {
        request: {
          ...request,
          ...(request.primary === undefined
            ? {}
            : { primary: { ...request.primary } }),
          ...(request.translation === undefined
            ? {}
            : { translation: { ...request.translation } }),
        },
        viewModel,
      };
      return { committed: result, result, viewModel };
    },
    validateStatus: assertBilingualSegmentStatus,
  });
  return {
    get snapshot() {
      return engine.snapshot;
    },
    subscribe: (listener) => engine.subscribe(listener),
    load: (request, signal) => {
      requireNonblankTref(request.tref);
      serializeSelectors(request);
      return engine.load(request, signal);
    },
    setSuppliedData: (request, payload, status = 200) => {
      requireNonblankTref(request.tref);
      serializeSelectors(request);
      return engine.setSuppliedData(request, payload, status);
    },
    cancel: (reason) => engine.cancel(reason),
    dispose: () => engine.dispose(),
  };
}

function requireNonblankTref(tref: string): void {
  if (tref.trim().length === 0) {
    throw new TypeError("Bilingual segment reference must not be blank.");
  }
}

async function requestBilingualSegmentResponse(
  request: BilingualSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<{
  readonly payload: CoreV3TextsResponse | { readonly error: string };
  readonly status: 200 | 400 | 404;
}> {
  const version = serializeSelectors(request);
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: { version, return_format: "default" },
    ...(signal === undefined ? {} : { signal }),
  });

  if (result.data !== undefined) {
    return { payload: result.data, status: 200 };
  }

  const status = result.response?.status;
  if (result.error !== undefined && (status === 400 || status === 404)) {
    return { payload: result.error, status };
  }

  throw new Error("The v3 texts request returned no data or documented error.");
}

function projectBilingualSegmentResponse(
  request: BilingualSegmentRequest,
  payload: unknown,
  status: 200 | 400 | 404,
): BilingualSegmentTerminalViewModel {
  const validated = validateSuppliedComponentData<
    CoreV3TextsResponse | { readonly error: string }
  >({ method: "GET", path: "/api/v3/texts/{tref}", status }, payload);
  return status === 200
    ? (createBilingualSegmentViewModel(
        validated as CoreV3TextsResponse,
        request,
      ) as BilingualSegmentTerminalViewModel)
    : {
        state: "error",
        errorKind: "http",
        status,
        message: (validated as { readonly error: string }).error,
      };
}

function assertBilingualSegmentStatus(
  status: number,
): asserts status is 200 | 400 | 404 {
  if (status !== 200 && status !== 400 && status !== 404) {
    throw new RangeError("Bilingual-segment status must be 200, 400, or 404.");
  }
}

/** Resolves primary and translation roles without projecting their text. */
export function resolveBilingualSides(
  versions: readonly CoreV3Version[],
  request: BilingualSegmentRequest,
): {
  readonly versions: Partial<Record<BilingualSegmentSide, CoreV3Version>>;
  readonly ambiguousSide?: BilingualSegmentSide;
} {
  const exactPrimaryMatches = exactSideMatches(versions, request, "primary");
  if (exactPrimaryMatches.length > 1) {
    return { versions: {}, ambiguousSide: "primary" };
  }

  const exactTranslationMatches = exactSideMatches(
    versions,
    request,
    "translation",
  );
  if (exactTranslationMatches.length > 1) {
    return { versions: {}, ambiguousSide: "translation" };
  }

  const exactTranslation = exactTranslationMatches[0];
  let primary = exactPrimaryMatches[0];
  if (primary === undefined && request.primary === undefined) {
    const primaryMatches = versions.filter(
      (version) => version !== exactTranslation && version.isPrimary,
    );
    if (primaryMatches.length > 1) {
      return { versions: {}, ambiguousSide: "primary" };
    }
    primary = primaryMatches[0];
  }

  let translation = exactTranslation;
  if (translation === undefined && request.translation === undefined) {
    const translationMatches = versions.filter(
      (version) => version !== primary && !version.isSource,
    );
    if (translationMatches.length > 1) {
      return { versions: {}, ambiguousSide: "translation" };
    }
    translation = translationMatches[0];
  }

  const resolved: Partial<Record<BilingualSegmentSide, CoreV3Version>> = {};
  if (primary !== undefined) {
    resolved.primary = primary;
  }
  if (translation !== undefined) {
    resolved.translation = translation;
  }
  return { versions: resolved };
}

function exactSideMatches(
  versions: readonly CoreV3Version[],
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): CoreV3Version[] {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return [];
  }
  const normalizedTitle = versionTitle.replaceAll("_", " ");
  return versions.filter(
    (version) =>
      version.versionTitle === normalizedTitle &&
      (side === "primary" ? version.isPrimary : !version.isSource),
  );
}

/** Describes a missing bilingual role using its selector warning when present. */
export function describeAbsentBilingualSide(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): BilingualSegmentAbsentSide {
  const key = warningKeyForSide(request, side);
  for (const warning of payload.warnings) {
    const detail = warning[key];
    if (detail !== undefined) {
      return { side, message: detail.message };
    }
  }
  return { side, message: `No ${side} text is available.` };
}

/**
 * Rebuilds the warning key the API derives from one serialized selector.
 *
 * The API replaces `_` with a space in a piped version title before it keys
 * the warning, so an exact-title selector cannot be matched verbatim.
 */
function warningKeyForSide(
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): string {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return side;
  }
  return `${side}|${versionTitle.replaceAll("_", " ")}`;
}

function serializeSelectors(request: BilingualSegmentRequest): string[] {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Bilingual segment reference must not be blank.");
  }
  return SIDES.map((side) => serializeSideSelector(request, side));
}

function serializeSideSelector(
  request: BilingualSegmentRequest,
  side: BilingualSegmentSide,
): string {
  const versionTitle = request[side]?.versionTitle;
  if (versionTitle === undefined) {
    return side;
  }
  if (versionTitle.trim().length === 0) {
    throw new TypeError(
      `Bilingual segment ${side} version title must not be blank.`,
    );
  }
  return `${side}|${versionTitle}`;
}
