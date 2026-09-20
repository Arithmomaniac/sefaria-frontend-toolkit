import {
  text,
  type CoreLinkObject,
  type CoreV3TextsResponse,
  type CoreV3Version,
  type GetV3TextsData,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import {
  normalizeText,
  type CommentaryReference,
  type NormalizedFootnote,
} from "@arithmomaniac/sefaria-text-transform";
import {
  ComponentControllerEngine,
  validateSuppliedComponentData,
  type ComponentControllerAttempt,
  type ComponentControllerSnapshot,
} from "./component-controller.js";

/** Selects one language or exact version for a text-segment request. */
export interface TextSegmentVersionSelection {
  /** Full English language-family name accepted by the v3 texts API. */
  readonly language: string;
  /** Exact Sefaria version title, when a specific edition is required. */
  readonly versionTitle?: string;
}

/** Input owned by the non-DOM text-segment factories. */
export interface TextSegmentRequest {
  /** Segment reference passed to the v3 texts endpoint. */
  readonly tref: GetV3TextsData["path"]["tref"];
  /** Version selection serialized into one v3 `version` query parameter. */
  readonly version: TextSegmentVersionSelection;
}

/** Optional request-free evidence used while projecting safe text metadata. */
export interface TextSegmentProjectionContext {
  /** Exact commentary candidates already scoped by the host or a projection helper. */
  readonly commentaryReferences?: readonly CommentaryReference[];
}

/** Host-supplied state displayed while a text-segment request is pending. */
export interface TextSegmentLoadingViewModel {
  /** State discriminator. */
  readonly state: "loading";
  /** Status announcement supplied by the host. */
  readonly message: string;
}

/** Safe, render-ready data for one text segment. */
export interface TextSegmentDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Selected version language code. */
  readonly language: string;
  /** Selected version's actual language identifier. */
  readonly actualLanguage: string;
  /** Payload-provided text direction. */
  readonly direction: "ltr" | "rtl";
  /** Complete safe HTML with local key-only footnote placeholders. */
  readonly bodyHtml: string;
  /** Ordered static footnotes referenced by body placeholders. */
  readonly notes: readonly NormalizedFootnote[];
}

/** Valid response with no renderable text for the requested selection. */
export interface TextSegmentEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Normalized English reference label from the payload. */
  readonly ref: string;
  /** Hebrew reference label from the payload. */
  readonly heRef: string;
  /** Human-readable empty-state message. */
  readonly message: string;
  /** Server warning messages retained from the response. */
  readonly warnings: readonly string[];
}

/** Projection failure for a valid payload that cannot represent one segment. */
export interface TextSegmentProjectionErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "projection";
  /** Human-readable projection failure. */
  readonly message: string;
}

/** Documented v3 texts HTTP failure. */
export interface TextSegmentHttpErrorViewModel {
  /** State discriminator. */
  readonly state: "error";
  /** Error classification. */
  readonly errorKind: "http";
  /** Documented response status. */
  readonly status: 400 | 404;
  /** Validated API error message. */
  readonly message: string;
}

/** Complete state union accepted by `<sefaria-text-segment>`. */
export type TextSegmentViewModel =
  | TextSegmentLoadingViewModel
  | TextSegmentDataViewModel
  | TextSegmentEmptyViewModel
  | TextSegmentProjectionErrorViewModel
  | TextSegmentHttpErrorViewModel;

/** Terminal text-segment state committed by a headless controller. */
export type TextSegmentTerminalViewModel = Exclude<
  TextSegmentViewModel,
  TextSegmentLoadingViewModel
>;

/** One committed text-segment request and terminal rendering result. */
export interface TextSegmentControllerResult {
  /** Effective request used for the committed result. */
  readonly request: TextSegmentRequest;
  /** Terminal component view model. */
  readonly viewModel: TextSegmentTerminalViewModel;
}

/** Current text-segment controller attempt. */
export type TextSegmentControllerAttempt = ComponentControllerAttempt<
  TextSegmentRequest,
  TextSegmentLoadingViewModel
>;

/** Immutable text-segment controller publication. */
export type TextSegmentControllerSnapshot = ComponentControllerSnapshot<
  TextSegmentControllerResult,
  TextSegmentRequest,
  TextSegmentLoadingViewModel
>;

/** Stateful DOM-free text-segment loading lifecycle. */
export interface TextSegmentController {
  /** Current committed result and pending or failed attempt. */
  readonly snapshot: TextSegmentControllerSnapshot;
  /** Subscribes immediately and after each snapshot replacement. */
  subscribe(
    listener: (snapshot: TextSegmentControllerSnapshot) => void,
  ): () => void;
  /** Loads and commits one text-segment request. */
  load(
    request: TextSegmentRequest,
    signal?: AbortSignal,
  ): Promise<TextSegmentTerminalViewModel>;
  /** Validates and commits supplied corrected response data with zero I/O. */
  setSuppliedData(
    request: TextSegmentRequest,
    payload: unknown,
    status?: 200 | 400 | 404,
  ): TextSegmentTerminalViewModel;
  /** Cancels active work without disposing committed content. */
  cancel(reason?: unknown): void;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

const RESERVED_VERSION_SELECTORS = new Set([
  "all",
  "primary",
  "source",
  "translation",
]);

/**
 * Projects one validated v3 texts response into render-ready segment data.
 */
export function createTextSegmentViewModel(
  payload: CoreV3TextsResponse,
  request: TextSegmentRequest,
  context: TextSegmentProjectionContext = {},
): TextSegmentViewModel {
  serializeVersionSelection(request.version);
  const language = request.version.language.trim().toLocaleLowerCase("en-US");
  const matches = payload.versions.filter(
    (version) =>
      version.languageFamilyName.toLocaleLowerCase("en-US") === language &&
      (request.version.versionTitle === undefined ||
        version.versionTitle === request.version.versionTitle),
  );

  if (matches.length === 0) {
    return createEmptyViewModel(payload, createRequestEmptyMessage(request));
  }

  if (matches.length > 1) {
    return {
      state: "error",
      errorKind: "projection",
      message: `Text segment requires one matching version; found ${matches.length}.`,
    };
  }

  const version = matches[0];
  if (!version) {
    throw new Error("A single version match was not available.");
  }

  const projected = projectTextSegmentVersion(payload, version, context);
  if (projected.state === "empty") {
    return createEmptyViewModel(payload, createRequestEmptyMessage(request));
  }
  return projected;
}

/**
 * Projects one already-selected version into render-ready segment data.
 */
export function projectTextSegmentVersion(
  payload: CoreV3TextsResponse,
  version: CoreV3Version,
  context: TextSegmentProjectionContext = {},
):
  | TextSegmentDataViewModel
  | TextSegmentEmptyViewModel
  | TextSegmentProjectionErrorViewModel {
  if (Array.isArray(version.text)) {
    return {
      state: "error",
      errorKind: "projection",
      message: "Text segment requires string or null text; received an array.",
    };
  }

  return projectTextSegmentValue(payload, version, version.text, context);
}

/**
 * Projects one resolved recursive-text leaf with its selected version metadata.
 */
export function projectTextSegmentValue(
  payload: CoreV3TextsResponse,
  version: CoreV3Version,
  text: string | null,
  context: TextSegmentProjectionContext = {},
): TextSegmentDataViewModel | TextSegmentEmptyViewModel {
  if (text === null) {
    return createSelectedVersionEmptyViewModel(payload, version);
  }

  const normalized = normalizeText(
    text,
    context.commentaryReferences === undefined
      ? {}
      : { commentaryReferences: context.commentaryReferences },
  );
  if (normalized.bodyHtml.trim().length === 0) {
    return createSelectedVersionEmptyViewModel(payload, version);
  }

  return {
    state: "data",
    ref: payload.ref,
    heRef: payload.heRef,
    language: version.language,
    actualLanguage: version.actualLanguage,
    direction: version.direction,
    bodyHtml: normalized.bodyHtml,
    notes: normalized.notes,
  };
}

/**
 * Projects validated link objects into exact commentary candidates for one
 * base reference and selected edition. Unknown inline metadata is rejected
 * with a structured source path instead of being guessed or silently coerced.
 */
export function createTextSegmentCommentaryReferences(
  links: readonly CoreLinkObject[],
  baseRef: string,
  versionTitle?: string,
): readonly CommentaryReference[] {
  const references: CommentaryReference[] = [];
  for (const [index, link] of links.entries()) {
    if (
      link.anchorRef !== baseRef &&
      !link.anchorRefExpanded.includes(baseRef)
    ) {
      continue;
    }
    if (
      versionTitle !== undefined &&
      link.anchorVersion !== undefined &&
      link.anchorVersion.title !== versionTitle
    ) {
      continue;
    }
    if (link.inline_reference === undefined) {
      continue;
    }

    const commentator = readInlineString(
      link.inline_reference,
      "data-commentator",
      index,
      true,
    );
    const order = readInlineOrder(link.inline_reference, index);
    const label = readInlineString(
      link.inline_reference,
      "data-label",
      index,
      false,
    );
    if (commentator === undefined) {
      continue;
    }
    references.push({
      commentator,
      ...(order === undefined ? {} : { order }),
      ...(label === undefined ? {} : { label }),
      ref: link.sourceRef,
    });
  }
  return references;
}

function readInlineString(
  inlineReference: Readonly<Record<string, unknown>>,
  field: string,
  linkIndex: number,
  required: boolean,
): string | undefined {
  const value = inlineReference[field];
  if (value === undefined) {
    if (required) {
      throw new TypeError(
        `links[${linkIndex}].inline_reference.${field} is required.`,
      );
    }
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError(
      `links[${linkIndex}].inline_reference.${field} must be a string.`,
    );
  }
  if (required && value.trim().length === 0) {
    throw new TypeError(
      `links[${linkIndex}].inline_reference.${field} must not be blank.`,
    );
  }
  return value;
}

function readInlineOrder(
  inlineReference: Readonly<Record<string, unknown>>,
  linkIndex: number,
): string | number | undefined {
  const value = inlineReference["data-order"];
  if (value === undefined || typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  throw new TypeError(
    `links[${linkIndex}].inline_reference.data-order must be a string or safe integer.`,
  );
}

/**
 * Requests one validated v3 payload and projects it with the pure factory.
 */
export async function loadTextSegmentViewModel(
  request: TextSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<TextSegmentViewModel> {
  const response = await requestTextSegmentResponse(request, client, signal);
  return projectTextSegmentResponse(request, response.payload, response.status);
}

/** Creates a zero-request text-segment controller with an optional live client. */
export function createTextSegmentController(
  client?: SefariaClient,
): TextSegmentController {
  const engine = new ComponentControllerEngine({
    ...(client === undefined ? {} : { client }),
    cloneRequest: (request: TextSegmentRequest) => ({
      ...request,
      version: { ...request.version },
    }),
    createLoading: (request: TextSegmentRequest) => ({
      state: "loading" as const,
      message: `Loading ${request.tref}.`,
    }),
    load: requestTextSegmentResponse,
    project: (request, payload, status) => {
      const viewModel = projectTextSegmentResponse(request, payload, status);
      const result = {
        request: { ...request, version: { ...request.version } },
        viewModel,
      };
      return { committed: result, result, viewModel };
    },
    validateStatus: assertTextSegmentStatus,
  });
  return {
    get snapshot() {
      return engine.snapshot;
    },
    subscribe: (listener) => engine.subscribe(listener),
    load: (request, signal) => {
      requireNonblankTref(request.tref);
      serializeVersionSelection(request.version);
      return engine.load(request, signal);
    },
    setSuppliedData: (request, payload, status = 200) => {
      requireNonblankTref(request.tref);
      serializeVersionSelection(request.version);
      return engine.setSuppliedData(request, payload, status);
    },
    cancel: (reason) => engine.cancel(reason),
    dispose: () => engine.dispose(),
  };
}

function requireNonblankTref(tref: string): void {
  if (tref.trim().length === 0) {
    throw new TypeError("Text segment reference must not be blank.");
  }
}

async function requestTextSegmentResponse(
  request: TextSegmentRequest,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<{
  readonly payload: CoreV3TextsResponse | { readonly error: string };
  readonly status: 200 | 400 | 404;
}> {
  const version = serializeVersionSelection(request.version);
  const result = await text.getV3Texts({
    client,
    path: { tref: request.tref },
    query: {
      version: [version],
      return_format: "default",
    },
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

function projectTextSegmentResponse(
  request: TextSegmentRequest,
  payload: unknown,
  status: 200 | 400 | 404,
): TextSegmentTerminalViewModel {
  const validated = validateSuppliedComponentData<
    CoreV3TextsResponse | { readonly error: string }
  >({ method: "GET", path: "/api/v3/texts/{tref}", status }, payload);
  return status === 200
    ? (createTextSegmentViewModel(
        validated as CoreV3TextsResponse,
        request,
      ) as TextSegmentTerminalViewModel)
    : {
        state: "error",
        errorKind: "http",
        status,
        message: (validated as { readonly error: string }).error,
      };
}

function assertTextSegmentStatus(
  status: number,
): asserts status is 200 | 400 | 404 {
  if (status !== 200 && status !== 400 && status !== 404) {
    throw new RangeError("Text-segment status must be 200, 400, or 404.");
  }
}

function createEmptyViewModel(
  payload: CoreV3TextsResponse,
  fallbackMessage: string,
): TextSegmentEmptyViewModel {
  const warnings = payload.warnings.flatMap((warning) =>
    Object.values(warning).map((detail) => detail.message),
  );

  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    message: warnings[0] ?? fallbackMessage,
    warnings,
  };
}

function createRequestEmptyMessage(request: TextSegmentRequest): string {
  const requestedVersion =
    request.version.versionTitle === undefined
      ? request.version.language
      : `${request.version.language} version "${request.version.versionTitle}"`;
  return `No ${requestedVersion} text is available.`;
}

function createSelectedVersionEmptyMessage(version: CoreV3Version): string {
  return `No ${version.languageFamilyName} version "${version.versionTitle}" text is available.`;
}

function createSelectedVersionEmptyViewModel(
  payload: CoreV3TextsResponse,
  version: CoreV3Version,
): TextSegmentEmptyViewModel {
  return {
    state: "empty",
    ref: payload.ref,
    heRef: payload.heRef,
    message: createSelectedVersionEmptyMessage(version),
    warnings: [],
  };
}

function serializeVersionSelection(
  selection: TextSegmentVersionSelection,
): string {
  const language = selection.language.trim();
  if (language.length === 0) {
    throw new TypeError("Text segment language must not be blank.");
  }
  if (RESERVED_VERSION_SELECTORS.has(language.toLocaleLowerCase("en-US"))) {
    throw new TypeError(
      `Text segment does not support the reserved version selector "${language}".`,
    );
  }

  if (selection.versionTitle === undefined) {
    return language;
  }
  if (selection.versionTitle.trim().length === 0) {
    throw new TypeError("Text segment version title must not be blank.");
  }
  return `${language}|${selection.versionTitle}`;
}
