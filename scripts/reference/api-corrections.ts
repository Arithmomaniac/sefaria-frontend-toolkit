import {
  applyFormalOverlay,
  collectApiOperations,
  loadCommittedInputs,
  type ApiOperationMetadata,
  type JsonObject,
  type OverlayAction,
  type OverlayPrecondition,
} from "../../packages/client/scripts/generate-openapi.js";
import { releaseSection, renderPage } from "./release.js";

export const API_CORRECTIONS_PAGE = new URL(
  "../../docs/reference/api-corrections.md",
  import.meta.url,
);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function collectRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.$ref === "string") refs.add(value.$ref);
  for (const child of Object.values(value)) collectRefs(child, refs);
}

const SCHEMA_PREFIX = "#/components/schemas/";
const keyOf = (operation: ApiOperationMetadata) =>
  `${operation.method.toUpperCase()} ${operation.path}`;

function operationSchemas(
  document: JsonObject,
  operation: ApiOperationMetadata,
): ReadonlySet<string> {
  const paths = document.paths as Record<string, Record<string, unknown>>;
  const { schemas } = document.components as {
    schemas: Record<string, unknown>;
  };
  const initial = new Set<string>();
  collectRefs(paths[operation.path]?.[operation.method], initial);
  collectRefs(paths[operation.path]?.parameters, initial);
  const found = new Set<string>();
  const queue = [...initial];
  while (queue.length > 0) {
    const ref = queue.pop()!;
    if (!ref.startsWith(SCHEMA_PREFIX)) continue;
    const name = ref.slice(SCHEMA_PREFIX.length);
    if (found.has(name)) continue;
    found.add(name);
    const refs = new Set<string>();
    collectRefs(schemas[name], refs);
    queue.push(...refs);
  }
  return found;
}

const PATH_TARGET = /^\$\.paths\['([^']+)'\](?:\.(get|post)\b)?/u;
const SCHEMA_TARGET = /^\$\.components\.schemas\.([A-Za-z0-9_]+)/u;

const ROOTS = new Set(["$.paths", "$.components.schemas"]);

function initialTargets(action: OverlayAction): readonly string[] {
  if (!ROOTS.has(action.target) || !isRecord(action.update)) {
    return [action.target];
  }
  return Object.keys(action.update).map((key) =>
    action.target === "$.paths"
      ? `$.paths['${key}']`
      : `$.components.schemas.${key}`,
  );
}

/**
 * A change reaches every later copy of the value it changed, so an action's
 * effective targets include the destinations of later copies of its target.
 */
function effectiveTargets(
  index: number,
  actions: readonly OverlayAction[],
): readonly string[] {
  const targets = [...initialTargets(actions[index]!)];
  for (const later of actions.slice(index + 1)) {
    if (later.copy === undefined) continue;
    for (const target of [...targets]) {
      if (target.startsWith(later.copy)) {
        targets.push(later.target + target.slice(later.copy.length));
      } else if (later.copy.startsWith(target)) {
        targets.push(later.target);
      }
    }
  }
  return targets;
}

function actionOperations(
  targets: readonly string[],
  operations: readonly ApiOperationMetadata[],
  schemasByOperation: ReadonlyMap<string, ReadonlySet<string>>,
): readonly string[] {
  const touchedPaths = new Map<string, string | undefined>();
  const touchedSchemas = new Set<string>();
  for (const target of targets) {
    const path = PATH_TARGET.exec(target);
    if (path) touchedPaths.set(path[1]!, path[2]);
    const schema = SCHEMA_TARGET.exec(target);
    if (schema) touchedSchemas.add(schema[1]!);
  }
  return operations
    .filter((operation) => {
      const method = touchedPaths.get(operation.path);
      return (
        (touchedPaths.has(operation.path) &&
          (method === undefined || method === operation.method)) ||
        [...touchedSchemas].some((name) =>
          schemasByOperation.get(keyOf(operation))?.has(name),
        )
      );
    })
    .map(keyOf);
}

const code = (value: string) =>
  value.includes("`") ? `\`\` ${value} \`\`` : `\`${value}\``;
const cell = (value: string) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/gu, " ").trim();

function describeExpected(precondition: OverlayPrecondition): string {
  const expected = precondition.expected;
  if ("absent" in expected) return "is absent";
  if ("sha256" in expected) {
    return `is unchanged (SHA-256 starting ${code(expected.sha256.slice(0, 12))})`;
  }
  return `equals ${code(JSON.stringify(expected.value))}`;
}

function describeAction(action: OverlayAction): string {
  if (action.remove) return "Remove";
  if (action.copy !== undefined) return `Copy from ${code(action.copy)}`;
  return "Update";
}

export async function renderApiCorrections(): Promise<string> {
  const { source, upstreamBytes, overlay } = await loadCommittedInputs();
  const guards = overlay["x-sefaria-guards"];
  const guardIds = guards.map((guard) => guard.id);

  const upstream = JSON.parse(
    new TextDecoder().decode(upstreamBytes),
  ) as JsonObject;
  const corrected = await applyFormalOverlay(upstream, overlay);
  const operations = collectApiOperations(corrected);
  const schemasByOperation = new Map(
    operations.map((operation) => [
      keyOf(operation),
      operationSchemas(corrected, operation),
    ]),
  );
  const functionByKey = new Map(
    operations.map((operation) => [
      keyOf(operation),
      `${operation.namespace}.${operation.functionName}`,
    ]),
  );

  const endpointsByCorrection = new Map<string, Set<string>>(
    guardIds.map((id) => [id, new Set<string>()]),
  );
  for (const [index, action] of overlay.actions.entries()) {
    for (const key of actionOperations(
      effectiveTargets(index, overlay.actions),
      operations,
      schemasByOperation,
    )) {
      endpointsByCorrection.get(action["x-correction-id"])!.add(key);
    }
  }
  const correctionsByEndpoint = new Map<string, string[]>();
  for (const [id, endpoints] of endpointsByCorrection) {
    for (const key of endpoints) {
      const list = correctionsByEndpoint.get(key) ?? [];
      list.push(id);
      correctionsByEndpoint.set(key, list);
    }
  }
  const byPath = (a: string, b: string) => {
    const pathA = a.slice(a.indexOf(" ") + 1);
    const pathB = b.slice(b.indexOf(" ") + 1);
    return pathA < pathB ? -1 : pathA > pathB ? 1 : a < b ? -1 : a > b ? 1 : 0;
  };
  const endpointKeys = [...correctionsByEndpoint.keys()].sort(byPath);

  const upstreamLink = `https://github.com/${source.repository}/blob/${source.commit}/${source.path}`;
  const lines: string[] = [
    "The toolkit generates the client from Sefaria's published API description, an OpenAPI file. Where that file doesn't match what Sefaria's server code accepts or returns, the toolkit corrects it first. This page lists each correction and the endpoints it affects. It also lists the source checks that must pass before the correction runs, and the changes it makes.",
    "",
    releaseSection(),
    "",
    "## The pinned source",
    "",
    `The corrections apply to [\`${source.path}\`](${upstreamLink}) in \`${source.repository}\` at commit \`${source.commit}\`. The downloaded file must have the SHA-256 digest \`${source.sha256}\`.`,
    "",
    "Each correction has source checks. The checks inspect the parts of Sefaria's file that the correction uses. They require each part to be absent or unchanged since the correction was written. The checks don't prove that the correction is still needed. If a check fails, client generation stops.",
    "",
    `There are ${guards.length} corrections, with ${overlay.actions.length} changes in total. They affect ${endpointKeys.length} of the client's ${operations.length} endpoints.`,
    "",
    "## Corrections by endpoint",
    "",
    "Each endpoint shows its client function. It then lists the corrections that change the endpoint or a schema it uses.",
    "",
  ];
  for (const key of endpointKeys) {
    lines.push(
      `### ${code(key)}`,
      "",
      `Client function: ${code(functionByKey.get(key)!)}`,
      "",
    );
    for (const id of correctionsByEndpoint.get(key)!) {
      lines.push(
        `- [${guards.find((guard) => guard.id === id)!.title}](#${id})`,
      );
    }
    lines.push("");
  }
  lines.push("## Corrections", "");
  for (const guard of guards) {
    const endpoints = [...endpointsByCorrection.get(guard.id)!].sort(byPath);
    lines.push(
      `<a id="${guard.id}"></a>`,
      "",
      `### ${guard.title}`,
      "",
      `Correction ID: ${code(guard.id)}`,
      "",
      guard.description,
      "",
      `Endpoints: ${endpoints.map(code).join(", ")}.`,
      "",
      `Evidence: [Sefaria source](${guard.evidence}).`,
      "",
      "Source checks:",
      "",
      ...guard.preconditions.map(
        (precondition) =>
          `- ${code(precondition.target)} ${describeExpected(precondition)}.`,
      ),
      "",
      "| Change | Action | Target | Description |",
      "| --- | --- | --- | --- |",
      ...overlay.actions
        .filter((action) => action["x-correction-id"] === guard.id)
        .map(
          (action) =>
            `| ${code(action["x-action-id"])} | ${cell(describeAction(action))} | ${cell(code(action.target))} | ${cell(action.description ?? "—")} |`,
        ),
      "",
    );
    const updates = overlay.actions.filter(
      (action) =>
        action["x-correction-id"] === guard.id && action.update !== undefined,
    );
    if (updates.length > 0) {
      lines.push(
        "<details>",
        "<summary>Values this correction sets</summary>",
        "",
      );
      for (const action of updates) {
        lines.push(
          `${code(action["x-action-id"])}:`,
          "",
          "```json",
          JSON.stringify(action.update, null, 2),
          "```",
          "",
        );
      }
      lines.push("</details>", "");
    }
  }
  lines.push(
    "## Where to go next",
    "",
    "- [The client and Sefaria's API](/concepts/the-client-and-sefarias-api.md) explains why the client is generated from a corrected description.",
    "- [Reference › Client](/reference/client.md) lists the generated functions.",
    "- [Handle errors in your code](/data-and-text-tools/handle-errors-in-your-code.md) shows what happens when a response doesn't match the corrected description.",
    "- [Sefaria's developer documentation](https://developers.sefaria.org/) describes the API itself.",
    "- The corrections are defined in [`packages/client/openapi/overlay.yaml`](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/client/openapi/overlay.yaml).",
  );
  return renderPage({
    title: "Reference › Corrections to Sefaria's API description",
    heading: "Corrections to Sefaria's API description",
    description:
      "Every correction the toolkit applies to Sefaria's API description before generating the client, grouped by endpoint.",
    body: lines.join("\n"),
  });
}
