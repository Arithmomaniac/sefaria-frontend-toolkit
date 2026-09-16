import {
  AppBridge,
  getToolUiResourceUri,
  PostMessageTransport,
  RESOURCE_MIME_TYPE,
  type McpUiSandboxProxyReadyNotification,
} from "@modelcontextprotocol/ext-apps/app-bridge";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import { createRegisteredMcpServer } from "../server/registration.js";
import { RESOURCE_URI, type FetchLike } from "../server/tool-logic.js";

const UI_EXTENSION_ID = "io.modelcontextprotocol/ui";
const DEFAULT_TIMEOUT_MS = 8_000;
const INNER_SANDBOX = "allow-scripts allow-forms";
const FIXED_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const implementation = {
  name: "Sefaria static live reference host",
  version: "0.0.0",
};

export interface LiveHostState {
  calls: Array<{ readonly name: string; readonly arguments: unknown }>;
  requests: string[];
  tools: string[];
  resourceUri?: string;
  resourceMatchesPackagedApp: boolean;
  ready: boolean;
  error?: string;
}

export interface LiveHostOptions {
  readonly startButton: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly frame: HTMLIFrameElement;
  readonly loadAppHtml: () => Promise<string>;
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
  readonly reference?: string;
}

export interface LiveHost {
  readonly state: LiveHostState;
  close(): Promise<void>;
}

interface ActiveSession {
  readonly bridge: AppBridge;
  readonly client: Client;
  readonly server: ReturnType<typeof createRegisteredMcpServer>;
}

export function createLiveHost(options: LiveHostOptions): LiveHost {
  const state: LiveHostState = {
    calls: [],
    requests: [],
    tools: [],
    resourceMatchesPackagedApp: false,
    ready: false,
  };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let active: ActiveSession | undefined;
  let closed = false;
  let generation = 0;

  const start = async (): Promise<void> => {
    if (closed) return;
    const startGeneration = ++generation;
    options.startButton.disabled = true;
    options.status.setAttribute("role", "status");
    options.status.textContent = "Starting the live MCP demo.";
    delete state.error;
    let startup:
      | {
          readonly client: Client;
          readonly server: ReturnType<typeof createRegisteredMcpServer>;
        }
      | undefined;
    let startupBridge: AppBridge | undefined;
    try {
      await closeActive();
      requireCurrentStart(startGeneration);
      const appHtml = await options.loadAppHtml();
      requireCurrentStart(startGeneration);
      if (!appHtml.includes("<!doctype html")) {
        throw new Error(
          "The packaged MCP App is not a complete HTML document.",
        );
      }
      const fetchImpl: FetchLike = async (input, init) => {
        const requestUrl =
          input instanceof Request
            ? input.url
            : input instanceof URL
              ? input.href
              : input;
        state.requests.push(requestUrl);
        return (options.fetch ?? globalThis.fetch)(input, init);
      };
      const server = createRegisteredMcpServer({
        appHtml: async () => appHtml,
        fetch: fetchImpl,
      });
      const client = new Client(implementation, {
        capabilities: {
          extensions: {
            [UI_EXTENSION_ID]: { mimeTypes: [RESOURCE_MIME_TYPE] },
          },
        },
      });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      startup = { client, server };
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);
      requireCurrentStart(startGeneration);
      const tools = await client.listTools();
      requireCurrentStart(startGeneration);
      state.tools = tools.tools.map((tool) => tool.name);
      const tool = requireTool(tools.tools, "get_text");
      const resourceUri = getToolUiResourceUri(tool);
      if (resourceUri !== RESOURCE_URI) {
        throw new Error(
          "The text tool did not identify the packaged App resource.",
        );
      }
      state.resourceUri = resourceUri;
      const resource = await client.readResource({ uri: resourceUri });
      requireCurrentStart(startGeneration);
      const resourceHtml = requireResourceHtml(resource.contents);
      state.resourceMatchesPackagedApp = resourceHtml === appHtml;

      const bridge = await connectBridge(
        client,
        options.frame,
        resourceHtml,
        timeoutMs,
      );
      startupBridge = bridge;
      requireCurrentStart(startGeneration);
      active = { bridge, client, server };
      startupBridge = undefined;
      startup = undefined;
      const args = {
        reference: options.reference ?? "Micah 6:8",
        version_language: "both",
      } as const;
      state.calls.push({ name: tool.name, arguments: args });
      bridge.sendToolInput({ arguments: args });
      const result = (await client.callTool({
        name: tool.name,
        arguments: args,
      })) as CallToolResult;
      requireCurrentStart(startGeneration);
      bridge.sendToolResult(result);
      state.ready = true;
      options.status.textContent =
        "Live MCP demo started through the packaged App.";
    } catch (error) {
      await closeActive();
      if (startupBridge) {
        await startupBridge.close().catch(() => undefined);
      }
      if (startup) {
        await Promise.allSettled([
          startup.client.close(),
          startup.server.close(),
        ]);
      }
      options.frame.removeAttribute("src");
      if (closed || startGeneration !== generation) return;
      state.error = errorMessage(error);
      options.status.setAttribute("role", "alert");
      options.status.textContent = `Unable to start the live MCP demo: ${state.error}`;
      options.startButton.disabled = false;
    }
  };

  options.startButton.addEventListener("click", start);

  const closeActive = async (): Promise<void> => {
    const session = active;
    active = undefined;
    if (!session) return;
    await session.bridge
      .teardownResource({}, { timeout: Math.min(timeoutMs, 1_000) })
      .catch(() => undefined);
    await Promise.allSettled([
      session.bridge.close(),
      session.client.close(),
      session.server.close(),
    ]);
  };

  return {
    state,
    close: async () => {
      if (closed) return;
      closed = true;
      generation += 1;
      options.startButton.removeEventListener("click", start);
      await closeActive();
      options.frame.removeAttribute("src");
    },
  };

  function requireCurrentStart(startGeneration: number): void {
    if (closed || startGeneration !== generation) {
      throw new DOMException(
        "The live MCP startup was cancelled.",
        "AbortError",
      );
    }
  }
}

async function connectBridge(
  client: Client,
  frame: HTMLIFrameElement,
  html: string,
  timeoutMs: number,
): Promise<AppBridge> {
  const proxyReadyMethod: McpUiSandboxProxyReadyNotification["method"] =
    "ui/notifications/sandbox-proxy-ready";
  const ready = waitForWindowMessage(
    frame,
    (data) => data?.method === proxyReadyMethod,
    timeoutMs,
    "The opaque sandbox proxy did not become ready.",
  );
  frame.setAttribute("sandbox", "allow-scripts");
  frame.src = createProxyDataUrl(window.location.origin);
  await ready;

  const bridge = new AppBridge(
    client,
    implementation,
    { serverTools: {}, serverResources: {} },
    {
      hostContext: {
        platform: "web",
        theme: matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
        containerDimensions: {
          width: frame.clientWidth,
          maxHeight: 2_000,
        },
      },
    },
  );
  const initialized = withTimeout(
    new Promise<void>((resolve) => {
      bridge.oninitialized = () => resolve();
    }),
    timeoutMs,
    "The packaged MCP App did not initialize.",
  );
  try {
    await bridge.connect(
      new PostMessageTransport(frame.contentWindow!, frame.contentWindow!),
    );
    await bridge.sendSandboxResourceReady({
      html: injectFixedCsp(html),
      sandbox: INNER_SANDBOX,
      csp: {
        connectDomains: [],
        resourceDomains: [],
        frameDomains: [],
        baseUriDomains: [],
      },
    });
    await initialized;
    return bridge;
  } catch (error) {
    void initialized.catch(() => undefined);
    await bridge.close().catch(() => undefined);
    throw error;
  }
}

function createProxyDataUrl(hostOrigin: string): string {
  const script = `
const hostOrigin = ${JSON.stringify(hostOrigin)};
const parentWindow = window.parent;
let innerWindow;
window.addEventListener("message", (event) => {
  if (event.source === parentWindow) {
    if (event.origin !== hostOrigin) return;
    if (event.data?.method === "ui/notifications/sandbox-resource-ready") {
      if (innerWindow) return;
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", ${JSON.stringify(INNER_SANDBOX)});
      frame.style.cssText = "width:100%;height:100%;border:0";
      frame.srcdoc = event.data.params.html;
      document.body.replaceChildren(frame);
      innerWindow = frame.contentWindow;
      return;
    }
    innerWindow?.postMessage(event.data, "*");
    return;
  }
  if (innerWindow && event.source === innerWindow && event.origin === "null") {
    parentWindow.postMessage(event.data, hostOrigin);
  }
});
parentWindow.postMessage(
  { jsonrpc: "2.0", method: "ui/notifications/sandbox-proxy-ready", params: {} },
  hostOrigin,
);`;
  const document = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FIXED_CSP}"><style>html,body{width:100%;height:100%;margin:0}</style><script>${script}</script>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(document)}`;
}

function injectFixedCsp(html: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${FIXED_CSP}">`;
  const protectedHtml = html.replace(
    /<head(\s[^>]*)?>/i,
    (head) => `${head}${meta}`,
  );
  if (protectedHtml === html) {
    throw new Error("The packaged MCP App has no head for the fixed CSP.");
  }
  return protectedHtml;
}

function waitForWindowMessage(
  frame: HTMLIFrameElement,
  predicate: (data: Record<string, unknown> | undefined) => boolean,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeout);
      window.removeEventListener("message", listener);
    };
    const listener = (event: MessageEvent): void => {
      if (
        event.source === frame.contentWindow &&
        event.origin === "null" &&
        predicate(isRecord(event.data) ? event.data : undefined)
      ) {
        cleanup();
        resolve();
      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    window.addEventListener("message", listener);
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function requireTool(tools: readonly Tool[], name: string): Tool {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`The MCP server did not register ${name}.`);
  return tool;
}

function requireResourceHtml(
  contents: Awaited<ReturnType<Client["readResource"]>>["contents"],
): string {
  if (contents.length !== 1) {
    throw new Error("Expected exactly one packaged MCP App resource.");
  }
  const content = contents[0];
  if (
    !content ||
    content.mimeType !== RESOURCE_MIME_TYPE ||
    !("text" in content) ||
    typeof content.text !== "string"
  ) {
    throw new Error("The MCP App resource has an unsupported representation.");
  }
  return content.text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
