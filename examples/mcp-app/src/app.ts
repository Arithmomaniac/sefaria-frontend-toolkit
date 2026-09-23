import {
  type ContractIssue,
  validateExternalResponse,
} from "@arithmomaniac/sefaria-client";
import {
  type SefariaAcquisition,
  SefariaReader,
  type ReaderRawSeedData,
} from "@arithmomaniac/sefaria-web-components";
import { type ConnectionsRequest } from "@arithmomaniac/sefaria-web-components/connections-panel";
import type { SourceCardRequest } from "@arithmomaniac/sefaria-web-components/source-card";

const SOURCE_CARD_META_KEY = "sefaria/source-card";
const CONNECTIONS_META_KEY = "sefaria/connections";
const V3_TEXTS_PATH = "/api/v3/texts/{tref}";
const LINKS_PATH = "/api/links/{tref}";
const SOURCE_CARD_STATUSES = new Set([200, 400, 404]);
const CONNECTIONS_STATUSES = new Set([200, 400]);
const MAX_LINKS = 10_000;
const MAX_LINKS_PAYLOAD_BYTES = 5 * 1024 * 1024;

interface ToolResultLike {
  readonly content?: readonly unknown[] | undefined;
  readonly isError?: boolean | undefined;
  readonly structuredContent?: unknown;
  readonly _meta?: Record<string, unknown> | undefined;
}

/** Host-proxied server-tool boundary used by the stateful MCP reader. */
export interface McpReaderToolHost {
  callServerTool(
    params: {
      readonly name: string;
      readonly arguments?: Readonly<Record<string, unknown>>;
    },
    options?: { readonly signal?: AbortSignal },
  ): Promise<ToolResultLike>;
}

interface SourceCardMetadata {
  readonly kind: "source-card";
  readonly operation: "getV3Texts";
  readonly method: "GET";
  readonly path: typeof V3_TEXTS_PATH;
  readonly status: 200 | 400 | 404;
  readonly request: {
    readonly tref: string;
  };
}

interface ConnectionsMetadata {
  readonly kind: "connections";
  readonly operation: "getLinks";
  readonly method: "GET";
  readonly path: typeof LINKS_PATH;
  readonly status: 200 | 400;
  readonly request: ConnectionsRequest;
}

type ResultMetadata = SourceCardMetadata | ConnectionsMetadata;
type MetadataResult =
  | { readonly valid: true; readonly data: ResultMetadata }
  | { readonly valid: false; readonly issues: readonly ContractIssue[] };

/** Host interaction used only after explicit user activation. */
export interface ConnectionsInteraction {
  sendMessage(
    text: string,
  ): Promise<{ readonly isError?: boolean | undefined }>;
}

interface MessageHost {
  sendMessage(params: {
    role: "user";
    content: Array<{ type: "text"; text: string }>;
  }): Promise<{ readonly isError?: boolean | undefined }>;
}

/** Adapts the MCP Apps message API to the connections interaction boundary. */
export function createConnectionsInteraction(
  host: MessageHost,
): ConnectionsInteraction {
  return {
    sendMessage: async (text) =>
      host.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      }),
  };
}

/** Waits for the App connection without allowing cancelled work to continue. */
export async function waitForMcpConnection(
  connected: Promise<unknown>,
  signal?: AbortSignal,
): Promise<void> {
  await connected;
  signal?.throwIfAborted();
}

/** Creates a Reader acquisition capability backed only by host-proxied tools. */
export function createMcpReaderAcquisition(
  host: McpReaderToolHost,
): SefariaAcquisition {
  return {
    kind: "capability",
    capability: {
      getText: async (request, signal) => {
        requireSupportedTextRequest(request);
        const effectiveRequest = { tref: request.sref };
        const result = await host.callServerTool(
          {
            name: "get_text",
            arguments: {
              reference: request.sref,
              version_language: "both",
            },
          },
          { signal },
        );
        return admitSourceResponse(result, effectiveRequest);
      },
      getLinks: async (request, signal) => {
        const effectiveRequest = {
          tref: request.sref,
          withText: request.withText,
        };
        const result = await host.callServerTool(
          {
            name: "get_links_between_texts",
            arguments: {
              reference: request.sref,
              with_text: request.withText ? "1" : "0",
            },
          },
          { signal },
        );
        return admitConnectionsResponse(result, effectiveRequest);
      },
    },
  };
}

/** @deprecated Use createMcpReaderAcquisition. */
export function createMcpReaderDataSource(
  host: McpReaderToolHost,
): SefariaAcquisition {
  return createMcpReaderAcquisition(host);
}

function requireSupportedTextRequest(request: {
  readonly versions: readonly string[];
  readonly returnFormat: string;
}): void {
  if (
    request.returnFormat !== "default" ||
    request.versions.length !== 2 ||
    request.versions[0] !== "primary" ||
    request.versions[1] !== "translation"
  ) {
    throw new Error(
      "The MCP reader supports the default primary and translation selectors only.",
    );
  }
}

/** Renders one validated tool result as a continuing stateful MCP reader. */
export function renderReaderToolResult(
  root: HTMLElement,
  result: ToolResultLike,
  acquisition: SefariaAcquisition,
  interaction?: ConnectionsInteraction,
): () => void {
  if (result.isError === true) {
    renderToolError(root, result.content);
    return noCleanup;
  }

  const metadata = validateMetadata(result._meta);
  if (!metadata.valid) {
    renderIntegrationError(root, metadata.issues);
    return noCleanup;
  }

  let seed: ReaderRawSeedData;
  try {
    if (metadata.data.kind === "source-card") {
      if (metadata.data.status !== 200) {
        renderSourceCardResult(root, result, metadata.data);
        return noCleanup;
      }
      const source = admitSourceResponse(
        result,
        metadata.data.request,
        metadata.data,
      );
      seed = {
        source: { ...source, status: 200 },
        selectedRef: metadata.data.request.tref,
      };
    } else {
      seed = {
        connections: admitConnectionsResponse(
          result,
          metadata.data.request,
          metadata.data,
        ),
      };
    }
  } catch (error) {
    if (error instanceof IntegrationBoundaryError) {
      renderIntegrationError(root, error.issues);
    } else {
      renderToolError(root, [{ type: "text", text: errorMessage(error) }]);
    }
    return noCleanup;
  }

  const section = document.createElement("section");
  const reader = new SefariaReader();
  reader.acquisition = acquisition;
  reader.data = seed;
  reader.toggleAttribute("chat-export", interaction !== undefined);
  const status = document.createElement("p");
  status.hidden = true;
  section.append(reader, status);
  root.replaceChildren(section);

  let disposed = false;
  let pendingChatExport = false;
  const onReaderError = (event: Event): void => {
    const detail = customDetail(event);
    const error = detail?.error;
    status.hidden = false;
    status.setAttribute("role", "alert");
    status.textContent = errorMessage(error);
  };
  reader.addEventListener("sefaria-reader-error", onReaderError);
  const onChatExport = (event: Event): void => {
    if (disposed || pendingChatExport || interaction === undefined) return;
    const detail = customDetail(event);
    if (
      detail === undefined ||
      detail.originEntryId !== reader.currentEntryId ||
      typeof detail.targetRef !== "string" ||
      detail.targetRef !== reader.selectedRef
    ) {
      status.hidden = false;
      status.setAttribute("role", "alert");
      status.textContent = "Ignored a stale reader chat export.";
      return;
    }
    pendingChatExport = true;
    status.hidden = false;
    status.setAttribute("role", "status");
    status.textContent = "Sending the selected reference to chat.";
    void interaction
      .sendMessage(sourceFollowUp(detail.targetRef))
      .then((response) => {
        if (disposed) return;
        status.setAttribute(
          "role",
          response.isError === true ? "alert" : "status",
        );
        status.textContent =
          response.isError === true
            ? "The host rejected the chat export."
            : "The selected reference was delivered to chat.";
      })
      .catch(() => {
        if (disposed) return;
        status.setAttribute("role", "alert");
        status.textContent =
          "The chat export could not be confirmed and was not retried.";
      })
      .finally(() => {
        pendingChatExport = false;
      });
  };
  reader.addEventListener("sefaria-reader-chat-export", onChatExport);

  return () => {
    disposed = true;
    reader.removeEventListener("sefaria-reader-chat-export", onChatExport);
    reader.removeEventListener("sefaria-reader-error", onReaderError);
    reader.remove();
  };
}

class IntegrationBoundaryError extends Error {
  readonly issues: readonly ContractIssue[];

  constructor(issues: readonly ContractIssue[]) {
    super(
      issues
        .map((issue) => `${issue.instancePath}: ${issue.message}`)
        .join("\n"),
    );
    this.name = "IntegrationBoundaryError";
    this.issues = issues;
  }
}

function admitSourceResponse(
  result: ToolResultLike,
  request: SourceCardRequest,
  knownMetadata?: SourceCardMetadata,
): {
  readonly payload: unknown;
  readonly status: 200 | 400 | 404;
  readonly effectiveRequest: SourceCardRequest;
} {
  throwToolFailure(result);
  const metadata = knownMetadata ?? requireSourceMetadata(result);
  if (metadata.request.tref !== request.tref) {
    throw new IntegrationBoundaryError([
      sourceMetadataIssue(
        "/request/tref",
        `Expected ${JSON.stringify(request.tref)}.`,
      ),
    ]);
  }
  const validation = validateExternalResponse(
    {
      method: metadata.method,
      path: metadata.path,
      status: metadata.status,
    },
    result.structuredContent,
  );
  if (!validation.valid) throw new IntegrationBoundaryError(validation.issues);
  return {
    payload: result.structuredContent,
    status: metadata.status,
    effectiveRequest: request,
  };
}

function admitConnectionsResponse(
  result: ToolResultLike,
  request: ConnectionsRequest,
  knownMetadata?: ConnectionsMetadata,
): {
  readonly payload: unknown;
  readonly status: 200 | 400;
  readonly effectiveRequest: ConnectionsRequest;
} {
  throwToolFailure(result);
  const metadata = knownMetadata ?? requireConnectionsMetadata(result);
  if (
    metadata.request.tref !== request.tref ||
    metadata.request.withText !== (request.withText !== false)
  ) {
    throw new IntegrationBoundaryError([
      connectionsMetadataIssue(
        "/request",
        "Expected the exact requested reference and preview coverage.",
      ),
    ]);
  }
  const envelope = validateConnectionsEnvelope(result.structuredContent);
  if (!envelope.valid) throw new IntegrationBoundaryError(envelope.issues);
  const payloadIssue = validateConnectionsPayloadLimit(envelope.payload);
  if (payloadIssue) throw new IntegrationBoundaryError([payloadIssue]);
  const validation = validateExternalResponse(
    {
      method: metadata.method,
      path: metadata.path,
      status: metadata.status,
    },
    envelope.payload,
  );
  if (!validation.valid) {
    throw new IntegrationBoundaryError(
      validation.issues.map((issue) => ({
        ...issue,
        instancePath: `/structuredContent/payload${issue.instancePath}`,
      })),
    );
  }
  return {
    payload: envelope.payload,
    status: metadata.status,
    effectiveRequest: request,
  };
}

function requireSourceMetadata(result: ToolResultLike): SourceCardMetadata {
  const metadata = validateMetadata(result._meta);
  if (!metadata.valid) throw new IntegrationBoundaryError(metadata.issues);
  if (metadata.data.kind !== "source-card") {
    throw new IntegrationBoundaryError([
      integrationIssue(
        "/_meta",
        "Expected source-card result metadata.",
        "invalid-metadata",
      ),
    ]);
  }
  return metadata.data;
}

function requireConnectionsMetadata(
  result: ToolResultLike,
): ConnectionsMetadata {
  const metadata = validateMetadata(result._meta);
  if (!metadata.valid) throw new IntegrationBoundaryError(metadata.issues);
  if (metadata.data.kind !== "connections") {
    throw new IntegrationBoundaryError([
      integrationIssue(
        "/_meta",
        "Expected connections result metadata.",
        "invalid-metadata",
      ),
    ]);
  }
  return metadata.data;
}

function throwToolFailure(result: ToolResultLike): void {
  if (result.isError === true) {
    throw new Error(toolErrorMessage(result.content));
  }
}

function toolErrorMessage(content: readonly unknown[] | undefined): string {
  return (
    content?.find(
      (item): item is { readonly type: "text"; readonly text: string } =>
        isRecord(item) && item.type === "text" && typeof item.text === "string",
    )?.text ?? "The Sefaria MCP tool failed without a text message."
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Renders an integration-owned status message outside component elements. */
export function renderStatus(root: HTMLElement, message: string): void {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = message;
  root.replaceChildren(status);
}

function renderSourceCardResult(
  root: HTMLElement,
  result: ToolResultLike,
  metadata: SourceCardMetadata,
): void {
  if (metadata.status === 200) {
    throw new Error("Source success results must render through the reader.");
  }
  const validation = validateExternalResponse(
    {
      method: metadata.method,
      path: metadata.path,
      status: metadata.status,
    },
    result.structuredContent,
  );
  if (!validation.valid) {
    renderIntegrationError(root, validation.issues);
    return;
  }

  const alert = document.createElement("p");
  alert.setAttribute("role", "alert");
  alert.textContent = (result.structuredContent as { error: string }).error;
  root.replaceChildren(alert);
}

function validateMetadata(
  meta: Record<string, unknown> | undefined,
): MetadataResult {
  const presentKeys = [SOURCE_CARD_META_KEY, CONNECTIONS_META_KEY].filter(
    (key) => meta?.[key] !== undefined,
  );
  if (presentKeys.length !== 1) {
    return invalidMetadata(
      "/_meta",
      "Expected exactly one supported Sefaria result metadata object.",
    );
  }
  return presentKeys[0] === SOURCE_CARD_META_KEY
    ? validateSourceCardMetadata(meta?.[SOURCE_CARD_META_KEY])
    : validateConnectionsMetadata(meta?.[CONNECTIONS_META_KEY]);
}

function validateSourceCardMetadata(value: unknown): MetadataResult {
  const issues: ContractIssue[] = [];
  if (!isRecord(value)) {
    return invalidMetadata(
      `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}`,
      "Expected source-card metadata.",
    );
  }
  if (value.operation !== "getV3Texts")
    issues.push(sourceMetadataIssue("/operation", "Expected getV3Texts."));
  if (value.method !== "GET")
    issues.push(sourceMetadataIssue("/method", "Expected GET."));
  if (value.path !== V3_TEXTS_PATH)
    issues.push(sourceMetadataIssue("/path", `Expected ${V3_TEXTS_PATH}.`));
  if (
    typeof value.status !== "number" ||
    !SOURCE_CARD_STATUSES.has(value.status)
  ) {
    issues.push(
      sourceMetadataIssue("/status", "Expected status 200, 400, or 404."),
    );
  }
  if (
    !isRecord(value.request) ||
    typeof value.request.tref !== "string" ||
    value.request.tref.trim().length === 0
  ) {
    issues.push(
      sourceMetadataIssue("/request/tref", "Expected a non-blank reference."),
    );
  }
  if (issues.length > 0) return { valid: false, issues };
  if (
    !isSourceCardStatus(value.status) ||
    !isRecord(value.request) ||
    typeof value.request.tref !== "string"
  ) {
    throw new Error("Validated source-card metadata lost its type invariants.");
  }
  return {
    valid: true,
    data: {
      kind: "source-card",
      operation: "getV3Texts",
      method: "GET",
      path: V3_TEXTS_PATH,
      status: value.status,
      request: { tref: value.request.tref },
    },
  };
}

function validateConnectionsMetadata(value: unknown): MetadataResult {
  const issues: ContractIssue[] = [];
  if (!isRecord(value)) {
    return invalidMetadata(
      `/_meta/${pointerSegment(CONNECTIONS_META_KEY)}`,
      "Expected connections metadata.",
    );
  }
  if (value.operation !== "getLinks")
    issues.push(connectionsMetadataIssue("/operation", "Expected getLinks."));
  if (value.method !== "GET")
    issues.push(connectionsMetadataIssue("/method", "Expected GET."));
  if (value.path !== LINKS_PATH)
    issues.push(connectionsMetadataIssue("/path", `Expected ${LINKS_PATH}.`));
  if (
    typeof value.status !== "number" ||
    !CONNECTIONS_STATUSES.has(value.status)
  ) {
    issues.push(
      connectionsMetadataIssue("/status", "Expected status 200 or 400."),
    );
  }
  if (!isRecord(value.request)) {
    issues.push(
      connectionsMetadataIssue("/request", "Expected connections request."),
    );
  } else {
    if (
      typeof value.request.tref !== "string" ||
      value.request.tref.trim().length === 0
    ) {
      issues.push(
        connectionsMetadataIssue(
          "/request/tref",
          "Expected a non-blank reference.",
        ),
      );
    }
    if (typeof value.request.withText !== "boolean") {
      issues.push(
        connectionsMetadataIssue(
          "/request/withText",
          "Expected resolved preview inclusion.",
        ),
      );
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  if (
    !isConnectionsStatus(value.status) ||
    !isRecord(value.request) ||
    typeof value.request.tref !== "string" ||
    typeof value.request.withText !== "boolean"
  ) {
    throw new Error("Validated connections metadata lost its type invariants.");
  }
  return {
    valid: true,
    data: {
      kind: "connections",
      operation: "getLinks",
      method: "GET",
      path: LINKS_PATH,
      status: value.status,
      request: {
        tref: value.request.tref,
        withText: value.request.withText,
      },
    },
  };
}

function validateConnectionsEnvelope(
  value: unknown,
):
  | { readonly valid: true; readonly payload: unknown }
  | { readonly valid: false; readonly issues: readonly ContractIssue[] } {
  if (
    !isRecord(value) ||
    !Object.hasOwn(value, "payload") ||
    Object.keys(value).length !== 1
  ) {
    return {
      valid: false,
      issues: [
        integrationIssue(
          "/structuredContent",
          "Expected exactly one payload property.",
          "invalid-envelope",
        ),
      ],
    };
  }
  return { valid: true, payload: value.payload };
}

function validateConnectionsPayloadLimit(
  payload: unknown,
): ContractIssue | undefined {
  if (Array.isArray(payload) && payload.length > MAX_LINKS) {
    return integrationIssue(
      "/structuredContent/payload",
      `Expected no more than ${MAX_LINKS} connections.`,
      "maximum",
    );
  }
  const byteLength = new TextEncoder().encode(JSON.stringify(payload)).length;
  return byteLength > MAX_LINKS_PAYLOAD_BYTES
    ? integrationIssue(
        "/structuredContent/payload",
        `Expected no more than ${MAX_LINKS_PAYLOAD_BYTES} UTF-8 bytes.`,
        "maximum",
      )
    : undefined;
}

function invalidMetadata(path: string, message: string): MetadataResult {
  return {
    valid: false,
    issues: [integrationIssue(path, message, "invalid-metadata")],
  };
}

function sourceMetadataIssue(path: string, message: string): ContractIssue {
  return integrationIssue(
    `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}${path}`,
    message,
    "invalid-metadata",
  );
}

function connectionsMetadataIssue(
  path: string,
  message: string,
): ContractIssue {
  return integrationIssue(
    `/_meta/${pointerSegment(CONNECTIONS_META_KEY)}${path}`,
    message,
    "invalid-metadata",
  );
}

function integrationIssue(
  instancePath: string,
  message: string,
  keyword: string,
): ContractIssue {
  return {
    instancePath,
    schemaPath: "/_meta/sefaria",
    keyword,
    message,
  };
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function customDetail(event: Event): Record<string, unknown> | undefined {
  return event instanceof CustomEvent && isRecord(event.detail)
    ? event.detail
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceCardStatus(value: unknown): value is 200 | 400 | 404 {
  return typeof value === "number" && SOURCE_CARD_STATUSES.has(value);
}

function isConnectionsStatus(value: unknown): value is 200 | 400 {
  return typeof value === "number" && CONNECTIONS_STATUSES.has(value);
}

function sourceFollowUp(targetRef: string): string {
  return `Use get_text with reference ${JSON.stringify(targetRef)} and version_language "both" to show the selected source.`;
}

function renderIntegrationError(
  root: HTMLElement,
  issues: readonly ContractIssue[],
): void {
  const section = document.createElement("section");
  section.setAttribute("role", "alert");
  const heading = document.createElement("strong");
  heading.textContent = "Sefaria MCP App could not render this result.";
  section.append(heading);
  const list = document.createElement("ul");
  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = `${issue.instancePath || "/"}: ${issue.message}`;
    list.append(item);
  }
  section.append(list);
  root.replaceChildren(section);
}

function renderToolError(
  root: HTMLElement,
  content: readonly unknown[] | undefined,
): void {
  const message = content?.find(
    (item): item is { readonly type: "text"; readonly text: string } =>
      isRecord(item) && item.type === "text" && typeof item.text === "string",
  )?.text;
  const alert = document.createElement("p");
  alert.setAttribute("role", "alert");
  alert.textContent =
    message ?? "The Sefaria MCP tool failed without a text message.";
  root.replaceChildren(alert);
}

function noCleanup(): void {}
