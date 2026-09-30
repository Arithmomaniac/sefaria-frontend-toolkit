import { readFile } from "node:fs/promises";
import {
  applyFormalOverlay,
  collectApiOperations,
  loadCommittedInputs,
  type JsonObject,
} from "../../packages/client/scripts/generate-openapi.js";
import * as namespaces from "../../packages/client/src/generated/namespaces.gen.js";
import { responseContracts } from "../../packages/client/src/generated/response-contracts.gen.js";
import { releaseSection, renderPage } from "./release.js";
import { renderTypeDoc } from "./typedoc.js";

export const CLIENT_PAGE = new URL(
  "../../docs/reference/client.md",
  import.meta.url,
);

const NAMESPACE_ORDER = [
  "text",
  "index",
  "related",
  "calendars",
  "lexicon",
  "topic",
  "term",
  "sheets",
  "collections",
  "misc",
  "ref",
] as const;

const pascal = (name: string) => name[0]!.toUpperCase() + name.slice(1);
const cell = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/gu, " ").trim();

async function exportedTypeNames(): Promise<ReadonlySet<string>> {
  const sources = await Promise.all(
    ["contracts.gen.ts", "types.gen.ts"].map((file) =>
      readFile(
        new URL(`../../packages/client/src/generated/${file}`, import.meta.url),
        "utf8",
      ),
    ),
  );
  const names = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(/^export type (\w+)/gmu)) {
      names.add(match[1]!);
    }
    for (const match of source.matchAll(/\bas (\w+),?$/gmu)) {
      names.add(match[1]!);
    }
  }
  return names;
}

async function namespaceTables(): Promise<{
  readonly markdown: string;
  readonly total: number;
}> {
  const { upstreamBytes, overlay } = await loadCommittedInputs();
  const corrected = await applyFormalOverlay(
    JSON.parse(new TextDecoder().decode(upstreamBytes)) as JsonObject,
    overlay,
  );
  const operations = collectApiOperations(corrected);
  const paths = corrected.paths as Record<
    string,
    Record<string, { summary?: string }>
  >;
  const types = await exportedTypeNames();
  const lines: string[] = [];
  let total = 0;
  for (const namespace of NAMESPACE_ORDER) {
    const functions = Object.keys(namespaces[namespace]);
    lines.push(
      `### \`${namespace}\``,
      "",
      "| Function | Request | Summary | Options type | Responses type | Errors type | Validators |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const name of functions) {
      const contracts = responseContracts.filter(
        (contract) => contract.functionName === name,
      );
      const first = contracts[0];
      if (!first) {
        throw new Error(`No response contract names ${namespace}.${name}.`);
      }
      const operation = operations.find(
        (item) => item.operationId === first.operationId,
      );
      if (!operation) {
        throw new Error(`No operation ${first.operationId} for ${name}.`);
      }
      const summary =
        paths[operation.path]?.[operation.method]?.summary?.trim() ?? "";
      const optionsType = `${pascal(name)}Data`;
      const responsesType = `${pascal(name)}Responses`;
      const errorsType = `${pascal(name)}Errors`;
      const validators = contracts
        .filter((contract) => contract.validatorName)
        .map(
          (contract) => `\`${contract.validatorName}\` (${contract.status})`,
        );
      const blob = contracts
        .filter((contract) => contract.bodyType === "blob")
        .map(
          (contract) =>
            `${contract.status}: binary body (${contract.contentTypes.join(", ")}), no validator`,
        );
      total += 1;
      lines.push(
        `| \`${namespace}.${name}\` | \`${operation.method.toUpperCase()} ${operation.path}\` | ${cell(summary) || "—"} | ${types.has(optionsType) ? `\`${optionsType}\`` : "—"} | ${types.has(responsesType) ? `\`${responsesType}\`` : "—"} | ${types.has(errorsType) ? `\`${errorsType}\`` : "—"} | ${[...validators, ...blob].join("<br>") || "—"} |`,
      );
    }
    lines.push("");
  }
  return { markdown: lines.join("\n"), total };
}

export async function renderClientReference(): Promise<string> {
  const [surface, tables] = await Promise.all([
    renderTypeDoc("client.ts", "@arithmomaniac/sefaria-client", 3),
    namespaceTables(),
  ]);
  const body = [
    "This page describes how to create a client with `@arithmomaniac/sefaria-client` and set its options. It also describes the error for a response that doesn't match its contract, the validation helpers, and the generated API functions.",
    "",
    releaseSection(),
    "",
    "## Client, options, errors and validation",
    "",
    "These names are written by hand. Import them from the package root. You can also import some from subpaths:",
    "",
    "- `createSefariaClient`, `SefariaClient`, `SefariaClientOptions`, and `SefariaCacheOptions` from `@arithmomaniac/sefaria-client/client`.",
    "- `SefariaContractError`, `SefariaContractErrorOptions`, and `ContractIssue` from `/errors`.",
    "- The validation helpers from `/validation`.",
    "",
    surface,
    "",
    "## Generated functions by namespace",
    "",
    `The client has ${tables.total} generated functions, one for each endpoint in the corrected API description. The functions are grouped into namespaces that follow the sections of [Sefaria's API](https://developers.sefaria.org/), and each namespace is exported from the package root. Call a function with a client and its request options, for example \`text.getV3Texts({ client, path: { tref: "Micah 6:8" } })\`.`,
    "",
    "- **Options type** describes the path, query, and body options that the function accepts.",
    "- **Responses type** maps each documented success status to its response body. **Errors type**, where there is one, does the same for documented error statuses.",
    "- **Validators** check a response body for one status. The client runs them on the responses it receives. You can also call them on JSON from elsewhere.",
    "- A binary response has no validator. The client checks only its status and content type.",
    "",
    tables.markdown,
    "## Generated types, schemas and validators",
    "",
    "The package root also exports the generated types, schemas, and validators. This page doesn't list them one by one.",
    "",
    "- **Types**, such as `GetV3TextsData` and `GetV3TextsResponses`, are TypeScript types. The package exports them from the root and from `@arithmomaniac/sefaria-client/contracts`.",
    "- **Zod schemas** have names starting with `z`, such as `zCoreV3TextsResponse`. The package exports them from the root and from `@arithmomaniac/sefaria-client/schemas`.",
    "- **Validators** have names such as `validateGetV3Texts200`, which is the function name plus the status. The package exports them from the root and from `@arithmomaniac/sefaria-client/validators`.",
    "",
    "[Reference › Package imports and exports](/reference/package-imports-and-exports.md) lists every subpath.",
    "",
    "## Where to go next",
    "",
    "- [Data and text tools › Start here](/data-and-text-tools/start-here.md) makes your first request.",
    "- [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) shows how to handle `SefariaContractError` and failed requests.",
    "- [The client and Sefaria's API](/concepts/the-client-and-sefarias-api.md) explains how the client is generated.",
    "- [Corrections to Sefaria's API description](/reference/api-corrections.md) lists where the generated contracts differ from Sefaria's published description.",
  ].join("\n");
  return renderPage({
    title: "Reference › Client",
    heading: "Client reference",
    description:
      "The client API of @arithmomaniac/sefaria-client, and its generated functions grouped by Sefaria's API sections.",
    body,
  });
}
