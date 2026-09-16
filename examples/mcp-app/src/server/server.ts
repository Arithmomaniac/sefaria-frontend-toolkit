import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  createRegisteredMcpServer,
  type McpRegistrationOptions,
} from "./registration.js";
import type { ToolLogicOptions } from "./tool-logic.js";

export interface ServerOptions extends ToolLogicOptions {
  readonly appHtml?: () => Promise<string>;
}

export function createMcpServer(options: ServerOptions = {}): McpServer {
  return createRegisteredMcpServer({
    ...options,
    appHtml: options.appHtml ?? readPackagedApp,
  } satisfies McpRegistrationOptions);
}

async function readPackagedApp(): Promise<string> {
  const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
  return readFile(
    path.resolve(serverDirectory, "..", "app", "mcp-app.html"),
    "utf8",
  );
}
