import {
  getV3Texts,
  type CoreV3TextsResponse,
  type CoreV3TextValue,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

import type {
  BilingualPairAbsentSide,
  BilingualPairSide,
  BilingualPairViewModel,
} from "./bilingual-pair.js";
import {
  describeAbsentBilingualSide,
  resolveBilingualSides,
  type BilingualSegmentEditionSelection,
  type BilingualSegmentRequest,
} from "./bilingual-segment.js";
import { serializeSourceCardSelectors } from "./source-card-request.js";
import {
  projectTextSegmentValue,
  type TextSegmentDataViewModel,
} from "./text-segment.js";
import { sourceCardAddresses } from "./source-card-addresses.js";
import {
  ComponentControllerEngine,
  validateSuppliedComponentData,
  type ComponentControllerAttempt,
  type ComponentControllerSnapshot,
} from "./component-controller.js";

/** Proven contextual navigation capability, independent of rendered text presence. */
export type SourceCardNavigation =
  | {
      readonly state: "available";
      readonly sectionRef: string;
      readonly firstRef: string;
    }
  | {
      readonly state: "context-required";
      /** First server-provided single-section range used to establish a segment target. */
      readonly contextRef: string;
    }
  | {
      readonly state: "unavailable";
      readonly message: string;
      /** Structured paths for malformed metadata that disabled selection. */
      readonly paths?: readonly (readonly (string | number)[])[];
    };

/** Input owned by the non-DOM source-card factories. */
export interface SourceCardRequest {
  /** Reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Exact edition for the primary side, when required. */
  readonly primary?: BilingualSegmentEditionSelection;
  /** Exact edition for the translation side, when required. */
  readonly translation?: BilingualSegmentEditionSelection;
}

/** Payload-derived source-card heading data. */
export interface SourceCardHeaderViewModel {
  /** Normalized English reference label. */
  readonly ref: string;
  /** Hebrew reference label. */
  readonly heRef: string;
  /** English index title. */
  readonly indexTitle: string;
  /** Hebrew index title. */
  readonly heIndexTitle: string;
  /** Primary Sefaria category. */
  readonly primaryCategory: string;
  /** Full Sefaria category path. */
  readonly categories: readonly string[];
}

/** One selected edition attributed once by a source card. */
export interface SourceCardAttributionViewModel {
  /** Role filled by the selected edition. */
  readonly side: BilingualPairSide;
  /** Exact Sefaria version title. */
  readonly versionTitle: string;
  /** Free-form source text, without URL interpretation. */
  readonly versionSource: string | null;
  /** Validated HTTP(S) source URL, when the source text is a URL. */
  readonly versionSourceUrl?: string | null;
}

/** One positionally identified bilingual item in a source card. */
export interface SourceCardItemViewModel {
  /** Zero-based indexes followed through recursive text arrays. */
  readonly position: readonly number[];
  /** Canonical target derived only for qualified address shapes. */
  readonly ref?: string;
  /** Short final-address label derived with the canonical target. */
  readonly addressLabel?: string;
  /** Ref-free bilingual rendering state for this position. */
  readonly pair: BilingualPairViewModel;
}

/** Host-supplied state displayed while a source-card request is pending. */
export interface SourceCardLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Render-ready source card with one or more text items. */
export interface SourceCardDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Payload-derived reference heading. */
  readonly header: SourceCardHeaderViewModel;
  /** Selected editions attributed once for the complete card. */
  readonly attributions: readonly SourceCardAttributionViewModel[];
  /** Ordered bilingual items. */
  readonly items: readonly SourceCardItemViewModel[];
  /** Context capability; absent on older host-constructed view models. */
  readonly navigation?: SourceCardNavigation;
}

/** Valid payload with no renderable text. */
export interface SourceCardEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Payload-derived reference heading. */
  readonly header: SourceCardHeaderViewModel;
  /** Selected editions attributed once for the complete card. */
  readonly attributions: readonly SourceCardAttributionViewModel[];
  /** Both absent roles, in primary-then-translation order. */
  readonly absent: readonly [BilingualPairAbsentSide, BilingualPairAbsentSide];
  /** Context capability even when the requested first slot has no text. */
  readonly navigation?: SourceCardNavigation;
}

/** Valid payload that cannot be projected as an aligned source card. */
export interface SourceCardProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface SourceCardHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-source-card>`. */
export type SourceCardViewModel =
  | SourceCardLoadingViewModel
  | SourceCardDataViewModel
  | SourceCardEmptyViewModel
  | SourceCardProjectionErrorViewModel
  | SourceCardHttpErrorViewModel;

/** Terminal source-card state committed by a headless controller. */
export type SourceCardTerminalViewModel = Exclude<
  SourceCardViewModel,
  SourceCardLoadingViewModel
>;

/** One committed source-card request and terminal rendering result. */
export interface SourceCardControllerResult {
  /** Effective request used for the committed result. */
  readonly request: SourceCardRequest;
  /** Terminal component view model. */
  readonly viewModel: SourceCardTerminalViewModel;
}

/** Current source-card controller attempt. */
export type SourceCardControllerAttempt = ComponentControllerAttempt<
  SourceCardRequest,
  SourceCardLoadingViewModel
>;

/** Immutable source-card controller publication. */
export type SourceCardControllerSnapshot = ComponentControllerSnapshot<
  SourceCardControllerResult,
  SourceCardRequest,
  SourceCardLoadingViewModel
>;

/** Stateful DOM-free source-card loading lifecycle. */
export interface SourceCardController {
  /** Current committed result and pending or failed attempt. */
  readonly snapshot: SourceCardControllerSnapshot;
  /** Subscribes immediately and after each snapshot replacement. */
  subscribe(
    listener: (snapshot: SourceCardControllerSnapshot) => void,
  ): () => void;
  /** Loads and commits one source-card request. */
  load(
    request: SourceCardRequest,
    signal?: AbortSignal,
  ): Promise<SourceCardTerminalViewModel>;
  /** Validates and commits supplied corrected response data with zero I/O. */
  setSuppliedData(
    request: SourceCardRequest,
    payload: unknown,
    status?: 200 | 400 | 404,
  ): SourceCardTerminalViewModel;
  /** Cancels active work without disposing committed content. */
  cancel(reason?: unknown): void;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

const SIDES: readonly BilingualPairSide[] = ["primary", "translation"];

/**
 * Projects one validated v3 texts response into a source card.
 */
export function createSourceCardViewModel(
  payload: CoreV3TextsResponse,
  request: SourceCardRequest,
): SourceCardViewModel {
  serializeSourceCardSelectors(request);
  const bilingualRequest: BilingualSegmentRequest = request;
  const resolved = resolveBilingualSides(payload.versions, bilingualRequest);
  if (resolved.ambiguousSide !== undefined) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Source card requires at most one ${resolved.ambiguousSide} version; the payload supplies more.`,
    };
  }

  const projected = projectAlignedItems(
    payload,
    bilingualRequest,
    resolved.versions,
  );
  if ("message" in projected) {
    return {
      state: "error",
      errorKind: "projection",
      message: projected.message,
    };
  }

  const header = createHeader(payload);
  const attributions = createAttributions(resolved.versions);
  const addresses = sourceCardAddresses(
    payload,
    SIDES.map((side) => resolved.versions[side]?.text),
  );
  if (projected.items.length === 0) {
    return {
      state: "empty",
      header,
      attributions,
      navigation: addresses.navigation,
      absent: [
        absentForSide(
          payload,
          bilingualRequest,
          "primary",
          resolved.versions.primary,
        ),
        absentForSide(
          payload,
          bilingualRequest,
          "translation",
          resolved.versions.translation,
        ),
      ],
    };
  }

  return {
    state: "data",
    header,
    attributions,
    navigation: addresses.navigation,
    items: projected.items.map((item) => {
      const ref = addresses.refAt(item.position);
      const addressLabel = addresses.labelAt(item.position);
      return ref === undefined || addressLabel === undefined
        ? item
        : { ...item, ref, addressLabel };
    }),
  };
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadSourceCardViewModel(
  request: SourceCardRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<SourceCardViewModel> {
  const response = await requestSourceCardResponse(request, client, signal);
  return projectSourceCardResponse(request, response.payload, response.status);
}

/** Creates a zero-request source-card controller with an optional live client. */
export function createSourceCardController(
  client?: SefariaClient,
): SourceCardController {
  const engine = new ComponentControllerEngine({
    ...(client === undefined ? {} : { client }),
    createLoading: (request: SourceCardRequest) => ({
      state: "loading" as const,
      message: `Loading ${request.tref}.`,
    }),
    load: requestSourceCardResponse,
    project: (request, payload, status) => {
      const viewModel = projectSourceCardResponse(request, payload, status);
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
    validateStatus: assertSourceCardStatus,
  });
  return {
    get snapshot() {
      return engine.snapshot;
    },
    subscribe: (listener) => engine.subscribe(listener),
    load: (request, signal) => {
      validateSourceCardRequest(request);
      return engine.load(request, signal);
    },
    setSuppliedData: (request, payload, status = 200) => {
      validateSourceCardRequest(request);
      return engine.setSuppliedData(request, payload, status);
    },
    cancel: (reason) => engine.cancel(reason),
    dispose: () => engine.dispose(),
  };
}

function validateSourceCardRequest(request: SourceCardRequest): void {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Source card reference must not be blank.");
  }
  serializeSourceCardSelectors(request);
}

async function requestSourceCardResponse(
  request: SourceCardRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<{
  readonly payload: CoreV3TextsResponse | { readonly error: string };
  readonly status: 200 | 400 | 404;
}> {
  const version = serializeSourceCardSelectors(request);
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

function projectSourceCardResponse(
  request: SourceCardRequest,
  payload: unknown,
  status: 200 | 400 | 404,
): SourceCardTerminalViewModel {
  const validated = validateSuppliedComponentData<
    CoreV3TextsResponse | { readonly error: string }
  >(
    {
      method: "GET",
      path: "/api/v3/texts/{tref}",
      status,
    },
    payload,
  );
  return status === 200
    ? (createSourceCardViewModel(
        validated as CoreV3TextsResponse,
        request,
      ) as SourceCardTerminalViewModel)
    : {
        state: "error",
        errorKind: "http",
        status,
        message: (validated as { readonly error: string }).error,
      };
}

function assertSourceCardStatus(
  status: number,
): asserts status is 200 | 400 | 404 {
  if (status !== 200 && status !== 400 && status !== 404) {
    throw new RangeError("Source-card status must be 200, 400, or 404.");
  }
}

function projectAlignedItems(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
):
  | { readonly items: readonly SourceCardItemViewModel[] }
  | { readonly message: string } {
  const items: SourceCardItemViewModel[] = [];
  const failure = visitAlignedText(
    payload,
    request,
    versions,
    versions.primary?.text,
    versions.translation?.text,
    [],
    items,
  );
  return failure === undefined ? { items } : { message: failure };
}

function visitAlignedText(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
  primary: CoreV3TextValue | undefined,
  translation: CoreV3TextValue | undefined,
  position: readonly number[],
  items: SourceCardItemViewModel[],
): string | undefined {
  const primaryArray = Array.isArray(primary);
  const translationArray = Array.isArray(translation);

  if (
    (primaryArray && translation !== undefined && !translationArray) ||
    (translationArray && primary !== undefined && !primaryArray)
  ) {
    return `Source-card sides disagree structurally at position ${formatPosition(position)}.`;
  }

  if (primaryArray || translationArray) {
    const primaryItems = primaryArray ? primary : [];
    const translationItems = translationArray ? translation : [];
    const length = Math.max(primaryItems.length, translationItems.length);
    for (let index = 0; index < length; index += 1) {
      const failure = visitAlignedText(
        payload,
        request,
        versions,
        primaryItems[index],
        translationItems[index],
        [...position, index],
        items,
      );
      if (failure !== undefined) {
        return failure;
      }
    }
    return undefined;
  }

  const primaryResult = projectLeaf(
    payload,
    request,
    "primary",
    versions.primary,
    primary,
  );
  const translationResult = projectLeaf(
    payload,
    request,
    "translation",
    versions.translation,
    translation,
  );
  const pair = createPair(primaryResult, translationResult);
  if (pair !== undefined) {
    items.push({ position: [...position], pair });
  }
  return undefined;
}

type ProjectedLeaf =
  | { readonly state: "data"; readonly view: TextSegmentDataViewModel }
  | { readonly state: "empty"; readonly absent: BilingualPairAbsentSide };

function projectLeaf(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualPairSide,
  version: CoreV3Version | undefined,
  text: string | null | undefined,
): ProjectedLeaf {
  if (version === undefined) {
    return {
      state: "empty",
      absent: describeAbsentBilingualSide(payload, request, side),
    };
  }

  const projected = projectTextSegmentValue(payload, version, text ?? null);
  return projected.state === "data"
    ? { state: "data", view: projected }
    : { state: "empty", absent: { side, message: projected.message } };
}

function createPair(
  primary: ProjectedLeaf,
  translation: ProjectedLeaf,
): BilingualPairViewModel | undefined {
  if (primary.state === "data" && translation.state === "data") {
    return {
      state: "data",
      primary: primary.view,
      translation: translation.view,
    };
  }
  if (primary.state === "data" && translation.state === "empty") {
    return {
      state: "partial",
      present: { side: "primary", view: primary.view },
      absent: translation.absent,
    };
  }
  if (translation.state === "data" && primary.state === "empty") {
    return {
      state: "partial",
      present: { side: "translation", view: translation.view },
      absent: primary.absent,
    };
  }
  return undefined;
}

function absentForSide(
  payload: CoreV3TextsResponse,
  request: BilingualSegmentRequest,
  side: BilingualPairSide,
  version: CoreV3Version | undefined,
): BilingualPairAbsentSide {
  if (version === undefined) {
    return describeAbsentBilingualSide(payload, request, side);
  }
  const projected = projectTextSegmentValue(payload, version, null);
  if (projected.state !== "empty") {
    throw new Error("Null text unexpectedly produced renderable data.");
  }
  return { side, message: projected.message };
}

function createHeader(payload: CoreV3TextsResponse): SourceCardHeaderViewModel {
  return {
    ref: payload.ref,
    heRef: payload.heRef,
    indexTitle: payload.indexTitle,
    heIndexTitle: payload.heIndexTitle,
    primaryCategory: payload.primary_category,
    categories: [...payload.categories],
  };
}

function createAttributions(
  versions: Partial<Record<BilingualPairSide, CoreV3Version>>,
): SourceCardAttributionViewModel[] {
  return SIDES.flatMap((side) => {
    const version = versions[side];
    return version === undefined
      ? []
      : [
          {
            side,
            versionTitle: version.versionTitle,
            versionSource: version.versionSource,
            versionSourceUrl: parseVersionSourceUrl(version.versionSource),
          },
        ];
  });
}

function parseVersionSourceUrl(source: string | null): string | null {
  if (source === null) {
    return null;
  }
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function formatPosition(position: readonly number[]): string {
  return position.length === 0 ? "the root" : `[${position.join(", ")}]`;
}
