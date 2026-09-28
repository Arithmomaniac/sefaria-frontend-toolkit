import { appendFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluatePreconditions,
  loadCommittedInputs,
  sha256,
  type JsonObject,
  type JsonValue,
  type OpenApiSource,
  type OverlayDocument,
  type PreconditionMismatch,
} from "./generate-openapi.js";
import { pinnedOpenApiUrl } from "./refresh-openapi.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRepositoryApi =
  "https://api.github.com/repos/Sefaria/Sefaria-Project";
const upstreamPath = "docs/openAPI.json";
const commitPattern = /^[0-9a-f]{40}$/;
const maxRenderedValueLength = 300;
const maxRenderedListItems = 100;

/** The label that identifies the single open drift issue. */
export const driftIssueLabel = "openapi-drift";

/** The hidden body marker that identifies an issue written by this detector. */
export const driftIssueMarker = "<!-- sefaria-openapi-drift -->";

/** The repository custom agent that triages a drift issue. */
export const driftTriageAgent = "openapi-drift-triage";

const upstreamCommitMarker = /<!-- upstream-commit: ([0-9a-f]{40}) -->/;

/** The upstream default branch and the latest commit that changed the OpenAPI file on it. */
export interface UpstreamHead {
  /** The upstream repository's default branch name. */
  readonly defaultBranch: string;
  /** The complete SHA of the latest default-branch commit that changed `docs/openAPI.json`. */
  readonly commit: string;
}

/** The upstream document fetched at one exact commit. */
export interface UpstreamDocument extends UpstreamHead {
  /** The exact bytes of `docs/openAPI.json` at {@link UpstreamHead.commit}. */
  readonly bytes: Uint8Array;
}

/** Keys added, removed, or changed between the pinned and upstream maps. */
export interface KeyChanges<TChanged = string> {
  /** Keys present only upstream. */
  readonly added: readonly string[];
  /** Keys present only in the pinned document. */
  readonly removed: readonly string[];
  /** Keys present in both documents whose values differ. */
  readonly changed: readonly TChanged[];
}

/** One OpenAPI path item whose contents changed upstream. */
export interface ChangedPath {
  /** The OpenAPI path template. */
  readonly path: string;
  /** The path-item keys, usually HTTP methods, whose values differ. */
  readonly keys: readonly string[];
}

interface DriftReportBase {
  /** The committed pin. */
  readonly pinned: {
    /** The pinned upstream commit SHA. */
    readonly commit: string;
    /** The committed SHA-256 of the pinned bytes. */
    readonly sha256: string;
  };
  /** The upstream document that was compared. */
  readonly upstream: {
    /** The upstream default branch. */
    readonly defaultBranch: string;
    /** The upstream commit whose file was compared. */
    readonly commit: string;
    /** The SHA-256 of the upstream bytes. */
    readonly sha256: string;
  };
}

/** A comparison whose upstream bytes match the pinned checksum. */
export interface NoDriftReport extends DriftReportBase {
  /** Identifies a comparison without drift. */
  readonly status: "no-drift";
}

/** A comparison whose upstream bytes differ from the pinned checksum. */
export interface DriftDetectedReport extends DriftReportBase {
  /** Identifies a comparison with drift. */
  readonly status: "drift";
  /** Changes to `paths`. */
  readonly paths: KeyChanges<ChangedPath>;
  /** Changes to `components.schemas`. */
  readonly schemas: KeyChanges;
  /** Other top-level document keys whose values differ, excluding `paths` and `components`. */
  readonly otherTopLevelKeys: readonly string[];
  /** Components other than `schemas` whose values differ. */
  readonly otherComponentKeys: readonly string[];
  /** Every overlay precondition that would fail against the upstream document. */
  readonly guardFailures: readonly PreconditionMismatch[];
}

/** The result of one drift comparison. Network and parse failures throw instead. */
export type DriftReport = NoDriftReport | DriftDetectedReport;

/** Inputs for a pure drift comparison. */
export interface CompareOpenApiInput {
  /** The committed pin and its bytes. */
  readonly pinned: {
    /** The committed source record. */
    readonly source: OpenApiSource;
    /** The committed upstream bytes. */
    readonly upstreamBytes: Uint8Array;
  };
  /** The fetched upstream document. */
  readonly upstream: UpstreamDocument;
  /** The committed overlay whose guards are evaluated. */
  readonly overlay: OverlayDocument;
}

/** The subset of Octokit's `request` used by the issue and assignment operations. */
export interface GitHubRequester {
  /** Sends one GitHub REST request and resolves with its response data. */
  request(
    route: string,
    params?: Record<string, unknown>,
  ): Promise<{ readonly data: unknown }>;
}

/** Identifies the repository that owns the drift issue. */
export interface IssueRepository {
  /** The repository owner. */
  readonly owner: string;
  /** The repository name. */
  readonly repo: string;
}

/** The outcome of reconciling the drift issue with a report. */
export type DriftIssueResult =
  | {
      /** No drift, so no issue was touched. */
      readonly action: "none";
      /** Always false without drift. */
      readonly handoff: false;
    }
  | {
      /** Whether the issue was created or updated. */
      readonly action: "created" | "updated";
      /** The drift issue number. */
      readonly issueNumber: number;
      /** Whether this is a new issue or a new upstream commit that should be handed to Copilot. */
      readonly handoff: boolean;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function objectAt(value: unknown, description: string): JsonObject {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new Error(`${description} must be an object.`);
  }
  return value as JsonObject;
}

function differingKeys(left: JsonObject, right: JsonObject): KeyChanges {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return {
    added: rightKeys.filter((key) => !Object.hasOwn(left, key)).sort(),
    removed: leftKeys.filter((key) => !Object.hasOwn(right, key)).sort(),
    changed: leftKeys
      .filter(
        (key) =>
          Object.hasOwn(right, key) &&
          stableJson(left[key]) !== stableJson(right[key]),
      )
      .sort(),
  };
}

function changedKeys(left: JsonObject, right: JsonObject): string[] {
  const changes = differingKeys(left, right);
  return [...changes.added, ...changes.removed, ...changes.changed].sort();
}

function parseDocument(bytes: Uint8Array, description: string): JsonObject {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as JsonValue;
  if (!isRecord(parsed)) {
    throw new Error(`${description} must be a JSON object.`);
  }
  return parsed as JsonObject;
}

/** Compares committed and upstream OpenAPI bytes. It does not access the network. */
export function compareOpenApi(input: CompareOpenApiInput): DriftReport {
  const { source, upstreamBytes } = input.pinned;
  const upstreamSha256 = sha256(input.upstream.bytes);
  const base: DriftReportBase = {
    pinned: { commit: source.commit, sha256: source.sha256 },
    upstream: {
      defaultBranch: input.upstream.defaultBranch,
      commit: input.upstream.commit,
      sha256: upstreamSha256,
    },
  };
  const upstream = parseDocument(
    input.upstream.bytes,
    "Upstream OpenAPI document",
  );
  if (upstreamSha256 === source.sha256) {
    return { status: "no-drift", ...base };
  }

  const pinned = parseDocument(upstreamBytes, "Pinned OpenAPI document");
  const pinnedPaths = objectAt(pinned.paths, "Pinned paths");
  const upstreamPaths = objectAt(upstream.paths, "Upstream paths");
  const pathChanges = differingKeys(pinnedPaths, upstreamPaths);
  const pinnedComponents = objectAt(pinned.components, "Pinned components");
  const upstreamComponents = objectAt(
    upstream.components,
    "Upstream components",
  );

  return {
    status: "drift",
    ...base,
    paths: {
      added: pathChanges.added,
      removed: pathChanges.removed,
      changed: pathChanges.changed.map((path) => ({
        path,
        keys: changedKeys(
          objectAt(pinnedPaths[path], `Pinned path ${path}`),
          objectAt(upstreamPaths[path], `Upstream path ${path}`),
        ),
      })),
    },
    schemas: differingKeys(
      objectAt(pinnedComponents.schemas, "Pinned schemas"),
      objectAt(upstreamComponents.schemas, "Upstream schemas"),
    ),
    otherTopLevelKeys: changedKeys(pinned, upstream).filter(
      (key) => key !== "paths" && key !== "components",
    ),
    otherComponentKeys: changedKeys(
      pinnedComponents,
      upstreamComponents,
    ).filter((key) => key !== "schemas"),
    guardFailures: evaluatePreconditions(
      upstream,
      input.overlay["x-sefaria-guards"],
    ),
  };
}

async function fetchOk(
  fetchImpl: typeof fetch,
  url: string,
  headers: HeadersInit,
  description: string,
): Promise<Response> {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    throw new Error(
      `${description} failed (${response.status} ${response.statusText}): ${url}`,
    );
  }
  return response;
}

/** Resolves the upstream default branch and the latest commit on it that changed `docs/openAPI.json`. */
export async function resolveUpstreamHead(
  fetchImpl: typeof fetch = fetch,
  token?: string,
): Promise<UpstreamHead> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sefaria-frontend-toolkit-openapi-drift",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const repository = (await (
    await fetchOk(
      fetchImpl,
      upstreamRepositoryApi,
      headers,
      "Upstream repository lookup",
    )
  ).json()) as unknown;
  const defaultBranch = isRecord(repository)
    ? repository.default_branch
    : undefined;
  if (typeof defaultBranch !== "string" || defaultBranch.length === 0) {
    throw new Error("Upstream repository lookup returned no default branch.");
  }

  const query = new URLSearchParams({
    sha: defaultBranch,
    path: upstreamPath,
    per_page: "1",
  });
  const commits = (await (
    await fetchOk(
      fetchImpl,
      `${upstreamRepositoryApi}/commits?${query}`,
      headers,
      "Upstream commit lookup",
    )
  ).json()) as unknown;
  const commit =
    Array.isArray(commits) && isRecord(commits[0]) ? commits[0].sha : undefined;
  if (typeof commit !== "string" || !commitPattern.test(commit)) {
    throw new Error(
      `Upstream commit lookup did not return a complete SHA for ${upstreamPath} on ${defaultBranch}.`,
    );
  }
  return { defaultBranch, commit };
}

/** Downloads the upstream OpenAPI document at one exact commit. */
export async function downloadUpstream(
  commit: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const response = await fetchOk(
    fetchImpl,
    pinnedOpenApiUrl(commit),
    {},
    "Upstream OpenAPI download",
  );
  return new Uint8Array(await response.arrayBuffer());
}

/** Options for a complete drift detection run. */
export interface DetectDriftOptions {
  /** The Fetch implementation used for GitHub API and raw file requests. */
  readonly fetchImpl?: typeof fetch;
  /** The client package root that contains the committed pin and overlay. */
  readonly root?: string;
  /** An optional GitHub token that raises the API rate limit. */
  readonly token?: string;
}

/**
 * Fetches upstream and compares it with the committed pin.
 *
 * Any request, status, SHA, or JSON failure rejects; a failure is never reported as no drift.
 */
export async function detectDrift(
  options: DetectDriftOptions = {},
): Promise<DriftReport> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const inputs = await loadCommittedInputs(options.root ?? packageRoot);
  const head = await resolveUpstreamHead(fetchImpl, options.token);
  const bytes = await downloadUpstream(head.commit, fetchImpl);
  return compareOpenApi({
    pinned: { source: inputs.source, upstreamBytes: inputs.upstreamBytes },
    upstream: { ...head, bytes },
    overlay: inputs.overlay,
  });
}

function truncate(value: string): string {
  return value.length > maxRenderedValueLength
    ? `${value.slice(0, maxRenderedValueLength)}… (${value.length} characters)`
    : value;
}

function codeList(items: readonly string[]): string {
  if (items.length === 0) {
    return "none";
  }
  const shown = items
    .slice(0, maxRenderedListItems)
    .map((item) => `\`${item}\``)
    .join(", ");
  return items.length > maxRenderedListItems
    ? `${shown}, and ${items.length - maxRenderedListItems} more`
    : shown;
}

function commitLink(commit: string): string {
  return `[\`${commit}\`](https://github.com/Sefaria/Sefaria-Project/blob/${commit}/${upstreamPath})`;
}

/** Renders a report as the Markdown body used for the console summary and drift issue. */
export function renderDriftMarkdown(report: DriftReport): string {
  const lines = [
    driftIssueMarker,
    `<!-- upstream-commit: ${report.upstream.commit} -->`,
    report.status === "drift"
      ? "## Sefaria OpenAPI drift detected"
      : "## No Sefaria OpenAPI drift",
    "",
    "| | Commit | SHA-256 |",
    "| --- | --- | --- |",
    `| Pinned | ${commitLink(report.pinned.commit)} | \`${report.pinned.sha256}\` |`,
    `| Upstream \`${report.upstream.defaultBranch}\` | ${commitLink(report.upstream.commit)} | \`${report.upstream.sha256}\` |`,
  ];
  if (report.status === "no-drift") {
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "",
    "### Paths",
    "",
    `- Added: ${codeList(report.paths.added)}`,
    `- Removed: ${codeList(report.paths.removed)}`,
    `- Changed: ${codeList(
      report.paths.changed.map(
        (change) => `${change.path} (${change.keys.join(", ")})`,
      ),
    )}`,
    "",
    "### Schemas",
    "",
    `- Added: ${codeList(report.schemas.added)}`,
    `- Removed: ${codeList(report.schemas.removed)}`,
    `- Changed: ${codeList(report.schemas.changed)}`,
    "",
    "### Other changes",
    "",
    `- Top-level keys: ${codeList(report.otherTopLevelKeys)}`,
    `- Components other than schemas: ${codeList(report.otherComponentKeys)}`,
    "",
    "### Overlay guards",
    "",
  );
  if (report.guardFailures.length === 0) {
    lines.push(
      "Every `x-sefaria-guards` precondition still holds against upstream.",
    );
  } else {
    lines.push(
      `${report.guardFailures.length} precondition(s) would fail, so \`pnpm openapi:refresh\` refuses this commit until the overlay is revised:`,
      "",
      "| Guard | Target | Expected | Actual |",
      "| --- | --- | --- | --- |",
      ...report.guardFailures
        .slice(0, maxRenderedListItems)
        .map(
          (failure) =>
            `| \`${failure.guardId}\` | \`${failure.target}\` | ${truncate(
              failure.expected,
            )} | \`${truncate(failure.actual).replaceAll("|", "\\|").replaceAll("`", "'")}\` |`,
        ),
    );
  }
  lines.push(
    "",
    "### Next step",
    "",
    "Drift is a review signal, not a correction authority. Review the upstream route, handler, response builder, and tests for each change, then run:",
    "",
    "```sh",
    `pnpm openapi:refresh --commit ${report.upstream.commit}`,
    "```",
    "",
    "This issue is maintained by the scheduled `OpenAPI drift` workflow. It never refreshes, commits, or merges.",
  );
  return `${lines.join("\n")}\n`;
}

function issueTitle(report: DriftDetectedReport): string {
  return `Sefaria OpenAPI drift: docs/openAPI.json changed at ${report.upstream.commit.slice(0, 7)}`;
}

function errorStatus(error: unknown): unknown {
  return isRecord(error) ? error.status : undefined;
}

async function ensureLabel(
  github: GitHubRequester,
  repository: IssueRepository,
): Promise<void> {
  try {
    await github.request("GET /repos/{owner}/{repo}/labels/{name}", {
      ...repository,
      name: driftIssueLabel,
    });
  } catch (error) {
    if (errorStatus(error) !== 404) {
      throw error;
    }
    await github.request("POST /repos/{owner}/{repo}/labels", {
      ...repository,
      name: driftIssueLabel,
      color: "d93f0b",
      description: "Upstream Sefaria OpenAPI differs from the pinned input",
    });
  }
}

/**
 * Creates or updates the single open drift issue.
 *
 * Without drift it makes no request. An existing issue is found by label and hidden marker.
 * A comment is added, and a handoff requested, only when the upstream commit changed.
 */
export async function upsertDriftIssue(
  github: GitHubRequester,
  repository: IssueRepository,
  report: DriftReport,
): Promise<DriftIssueResult> {
  if (report.status === "no-drift") {
    return { action: "none", handoff: false };
  }
  await ensureLabel(github, repository);
  const { data } = await github.request("GET /repos/{owner}/{repo}/issues", {
    ...repository,
    state: "open",
    labels: driftIssueLabel,
    per_page: 100,
  });
  const existing = (Array.isArray(data) ? data : []).find(
    (issue): issue is { number: number; body: string } =>
      isRecord(issue) &&
      !("pull_request" in issue) &&
      typeof issue.number === "number" &&
      typeof issue.body === "string" &&
      issue.body.includes(driftIssueMarker),
  );
  const body = renderDriftMarkdown(report);
  const title = issueTitle(report);

  if (existing === undefined) {
    const created = await github.request("POST /repos/{owner}/{repo}/issues", {
      ...repository,
      title,
      body,
      labels: [driftIssueLabel],
    });
    const issueNumber = isRecord(created.data)
      ? created.data.number
      : undefined;
    if (typeof issueNumber !== "number") {
      throw new Error("GitHub did not return the created issue number.");
    }
    return { action: "created", issueNumber, handoff: true };
  }

  const previousCommit = upstreamCommitMarker.exec(existing.body)?.[1];
  const handoff = previousCommit !== report.upstream.commit;
  // Comment before replacing the marker so a failed comment is retried with a handoff.
  if (handoff) {
    await github.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        ...repository,
        issue_number: existing.number,
        body: `Upstream \`${upstreamPath}\` moved from \`${previousCommit ?? "unknown"}\` to \`${report.upstream.commit}\`. The issue body now describes the new commit.`,
      },
    );
  }
  await github.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
    ...repository,
    issue_number: existing.number,
    title,
    body,
  });
  return { action: "updated", issueNumber: existing.number, handoff };
}

/**
 * Assigns the drift issue to the Copilot coding agent with the repository triage agent.
 *
 * GitHub requires a user token for this request; the workflow `GITHUB_TOKEN` cannot assign Copilot.
 */
export async function assignCopilot(
  github: GitHubRequester,
  repository: IssueRepository,
  issueNumber: number,
  commit: string,
): Promise<void> {
  if (!commitPattern.test(commit)) {
    throw new Error(
      "Copilot handoff requires a complete 40-character SHA for the upstream commit.",
    );
  }
  await github.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees",
    {
      ...repository,
      issue_number: issueNumber,
      assignees: ["copilot-swe-agent[bot]"],
      agent_assignment: {
        target_repo: `${repository.owner}/${repository.repo}`,
        base_branch: "main",
        custom_agent: driftTriageAgent,
        custom_instructions: `Triage upstream Sefaria commit ${commit} as described in this issue. Open a draft pull request only.`,
      },
    },
  );
}

function argumentValue(
  args: readonly string[],
  flag: string,
): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function repositoryFromEnvironment(): IssueRepository {
  const [owner, repo] = requiredEnvironment("GITHUB_REPOSITORY").split("/");
  if (!owner || !repo) {
    throw new Error("GITHUB_REPOSITORY must be owner/repo.");
  }
  return { owner, repo };
}

async function createGitHub(token: string): Promise<GitHubRequester> {
  const { Octokit } = await import("@octokit/rest");
  return new Octokit({ auth: token }) as unknown as GitHubRequester;
}

async function writeOutputs(
  outputs: Readonly<Record<string, string>>,
): Promise<void> {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) {
    return;
  }
  await appendFile(
    path,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(""),
    "utf8",
  );
}

async function main(args: readonly string[]): Promise<void> {
  const assignIssue = argumentValue(args, "--assign-copilot");
  if (assignIssue !== undefined) {
    const issueNumber = Number(assignIssue);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      throw new Error("--assign-copilot requires a positive issue number.");
    }
    const commit = argumentValue(args, "--commit");
    if (commit === undefined) {
      throw new Error("--assign-copilot requires --commit.");
    }
    await assignCopilot(
      await createGitHub(requiredEnvironment("COPILOT_ASSIGN_TOKEN")),
      repositoryFromEnvironment(),
      issueNumber,
      commit,
    );
    console.log(`Assigned issue #${issueNumber} to the Copilot coding agent.`);
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const report = await detectDrift(token ? { token } : {});
  const summary = renderDriftMarkdown(report);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }
  const reportPath = argumentValue(args, "--report");
  if (reportPath !== undefined) {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  const outputs: Record<string, string> = {
    status: report.status,
    commit: report.upstream.commit,
  };
  if (args.includes("--issue")) {
    const result = await upsertDriftIssue(
      await createGitHub(requiredEnvironment("GITHUB_TOKEN")),
      repositoryFromEnvironment(),
      report,
    );
    outputs.handoff = String(result.handoff);
    if (result.action !== "none") {
      outputs["issue-number"] = String(result.issueNumber);
      console.log(`Drift issue #${result.issueNumber} ${result.action}.`);
    }
  }
  await writeOutputs(outputs);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
