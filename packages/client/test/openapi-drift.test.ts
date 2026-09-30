import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  evaluatePreconditions,
  loadCommittedInputs,
  sha256,
  validatePreconditions,
  type JsonObject,
  type OpenApiSource,
  type OverlayDocument,
} from "../scripts/generate-openapi.js";
import {
  assignCopilot,
  compareOpenApi,
  createGitHub,
  detectDrift,
  driftIssueLabel,
  driftIssueMarker,
  renderDriftMarkdown,
  resolveUpstreamHead,
  upsertDriftIssue,
  type DriftReport,
  type GitHubRequester,
} from "../scripts/openapi-drift.js";
import { pinnedOpenApiUrl } from "../scripts/refresh-openapi.js";

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryUrl = "https://api.github.com/repos/Sefaria/Sefaria-Project";
// A synthetic complete SHA must remain different from the committed pin.
const newCommit = "b".repeat(40);
const laterCommit = "a".repeat(40);

let source: OpenApiSource;
let upstream: Uint8Array;
let overlay: OverlayDocument;

beforeAll(async () => {
  const inputs = await loadCommittedInputs(packageRoot);
  source = inputs.source;
  upstream = inputs.upstreamBytes;
  overlay = inputs.overlay;
});

function upstreamDocument(): JsonObject {
  return JSON.parse(new TextDecoder().decode(upstream)) as JsonObject;
}

function encode(document: JsonObject): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(document));
}

function schemas(document: JsonObject): JsonObject {
  return (document.components as JsonObject).schemas as JsonObject;
}

function paths(document: JsonObject): JsonObject {
  return document.paths as JsonObject;
}

interface FakeRoute {
  readonly status?: number;
  readonly body?: unknown;
  readonly bytes?: Uint8Array;
  readonly reject?: Error;
}

function fakeFetch(routes: Readonly<Record<string, FakeRoute>>): {
  readonly fetchImpl: typeof fetch;
  readonly urls: string[];
} {
  const urls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    const route = routes[url];
    if (route === undefined) {
      throw new Error(`Unexpected request: ${url}`);
    }
    if (route.reject) {
      throw route.reject;
    }
    const payload =
      route.bytes ??
      new TextEncoder().encode(JSON.stringify(route.body ?? null));
    return new Response(payload as Uint8Array<ArrayBuffer>, {
      status: route.status ?? 200,
    });
  }) as typeof fetch;
  return { fetchImpl, urls };
}

function upstreamRoutes(
  bytes: Uint8Array,
  commit = newCommit,
): Record<string, FakeRoute> {
  return {
    [repositoryUrl]: { body: { default_branch: "master" } },
    [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
      { body: [{ sha: commit }] },
    [pinnedOpenApiUrl(commit)]: { bytes },
  };
}

interface RecordedRequest {
  readonly route: string;
  readonly params: Record<string, unknown>;
}

function fakeGitHub(
  handler: (route: string, params: Record<string, unknown>) => unknown,
): { readonly github: GitHubRequester; readonly requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    github: {
      async request(route, params = {}) {
        requests.push({ route, params });
        return { data: await handler(route, params) };
      },
    },
  };
}

function driftReport(commit = newCommit): DriftReport {
  const document = upstreamDocument();
  schemas(document).AddedSchema = { type: "string" };
  return compareOpenApi({
    pinned: { source, upstreamBytes: upstream },
    upstream: {
      defaultBranch: "master",
      commit,
      bytes: encode(document),
    },
    overlay,
  });
}

describe("precondition evaluation", () => {
  it("reports every guard mismatch while validation still stops at the first", () => {
    const document = upstreamDocument();
    delete schemas(document).versionData;
    schemas(document).CoreSheetTopic = { type: "object" };

    const mismatches = evaluatePreconditions(
      document,
      overlay["x-sefaria-guards"],
    );

    expect(mismatches).toEqual([
      {
        guardId: "shared-version-metadata",
        target: "$.components.schemas.versionData",
        expected: "exactly one matching value",
        actual: "[]",
      },
      {
        guardId: "shared-sheet-topic",
        target: "$.components.schemas.CoreSheetTopic",
        expected: "absent",
        actual: '{"type":"object"}',
      },
    ]);
    expect(() =>
      validatePreconditions(document, overlay["x-sefaria-guards"]),
    ).toThrow(
      "OpenAPI precondition mismatch for shared-version-metadata at $.components.schemas.versionData\nexpected: exactly one matching value\nactual: []",
    );
  });

  it("reports no mismatch for the pinned document", () => {
    expect(
      evaluatePreconditions(upstreamDocument(), overlay["x-sefaria-guards"]),
    ).toEqual([]);
  });
});

describe("OpenAPI drift comparison", () => {
  it("reports no drift when the upstream commit and bytes match the pin", () => {
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: upstream,
      },
      overlay,
    });

    expect(report).toEqual({
      status: "no-drift",
      pinned: { commit: source.commit, sha256: source.sha256 },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        sha256: source.sha256,
      },
    });
  });

  it("reports commit-only drift even when upstream bytes are unchanged", () => {
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: { defaultBranch: "master", commit: newCommit, bytes: upstream },
      overlay,
    });

    expect(report).toMatchObject({
      status: "drift",
      paths: { added: [], removed: [], changed: [] },
      schemas: { added: [], removed: [], changed: [] },
      guardFailures: [],
    });
  });

  it("reports byte drift even when the upstream commit matches the pin", () => {
    const document = upstreamDocument();
    schemas(document).AddedSchema = { type: "string" };
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: encode(document),
      },
      overlay,
    });

    expect(report.status).toBe("drift");
  });

  it("reports changed paths, schemas, and other top-level keys", () => {
    const document = upstreamDocument();
    const pathItem = paths(document)["/api/calendars/topics/parasha"] as
      JsonObject | undefined;
    expect(pathItem).toBeDefined();
    (pathItem!.get as JsonObject).description = "changed upstream";
    paths(document)["/api/new-endpoint"] = { get: {} };
    delete paths(document)["/api/terms/{name}"];
    schemas(document).AddedSchema = { type: "string" };
    delete schemas(document).SearchPOSTData;
    (document.info as JsonObject).version = "changed";

    const bytes = encode(document);
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: { defaultBranch: "master", commit: newCommit, bytes },
      overlay,
    });

    expect(report).toMatchObject({
      status: "drift",
      pinned: { commit: source.commit, sha256: source.sha256 },
      upstream: {
        defaultBranch: "master",
        commit: newCommit,
        sha256: sha256(bytes),
      },
      paths: {
        added: ["/api/new-endpoint"],
        removed: ["/api/terms/{name}"],
        changed: [{ path: "/api/calendars/topics/parasha", keys: ["get"] }],
      },
      schemas: {
        added: ["AddedSchema"],
        removed: ["SearchPOSTData"],
        changed: [],
      },
      otherTopLevelKeys: ["info"],
    });
  });

  it("reports every overlay guard that would fail against upstream", () => {
    const document = upstreamDocument();
    delete schemas(document).versionData;
    schemas(document).CoreSheetTopic = { type: "object" };

    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: newCommit,
        bytes: encode(document),
      },
      overlay,
    });

    expect(report.status).toBe("drift");
    if (report.status !== "drift") return;
    expect(report.guardFailures.map((failure) => failure.guardId)).toEqual([
      "shared-version-metadata",
      "shared-sheet-topic",
    ]);
    expect(report.schemas).toEqual({
      added: ["CoreSheetTopic"],
      removed: ["versionData"],
      changed: [],
    });
  });

  it("rejects upstream bytes that are not JSON", () => {
    expect(() =>
      compareOpenApi({
        pinned: { source, upstreamBytes: upstream },
        upstream: {
          defaultBranch: "master",
          commit: newCommit,
          bytes: new TextEncoder().encode("<html>rate limited</html>"),
        },
        overlay,
      }),
    ).toThrow(SyntaxError);
  });

  it("renders the diff summary, commits, guard failures, and markers", () => {
    const document = upstreamDocument();
    delete schemas(document).versionData;
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: newCommit,
        bytes: encode(document),
      },
      overlay,
    });

    const markdown = renderDriftMarkdown(report);

    expect(markdown).toContain(driftIssueMarker);
    expect(markdown).toContain(`<!-- upstream-commit: ${newCommit} -->`);
    expect(markdown).toContain(source.commit);
    expect(markdown).toContain(newCommit);
    expect(markdown).toContain("`versionData`");
    expect(markdown).toContain("shared-version-metadata");
    expect(markdown).toContain(`pnpm openapi:refresh --commit ${newCommit}`);
    expect(renderDriftMarkdown(driftReport())).not.toContain(
      "shared-version-metadata",
    );
  });
});

describe("upstream resolution", () => {
  it("downloads the document at the exact resolved commit", async () => {
    const { fetchImpl, urls } = fakeFetch(
      upstreamRoutes(upstream, source.commit),
    );

    const report = await detectDrift({ fetchImpl, root: packageRoot });

    expect(report.status).toBe("no-drift");
    expect(report.upstream.commit).toBe(source.commit);
    expect(urls.at(-1)).toBe(pinnedOpenApiUrl(source.commit));
  });

  it("sends the token to the GitHub API when one is supplied", async () => {
    const seen: Headers[] = [];
    const { fetchImpl } = fakeFetch(upstreamRoutes(upstream));
    const recordingFetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      seen.push(new Headers(init?.headers));
      return fetchImpl(input, init);
    }) as typeof fetch;

    await resolveUpstreamHead(recordingFetch, "secret-token");

    expect(seen[0]?.get("authorization")).toBe("Bearer secret-token");
    expect(seen).toHaveLength(2);
    for (const headers of seen) {
      expect(headers.get("x-github-api-version")).toBe("2026-03-10");
    }
  });

  it("uses the current GitHub API version for Octokit issue reads and writes", async () => {
    const requests: { method: string; headers: Headers }[] = [];
    const recordingFetch = (async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      requests.push({
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
      });
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    const github = await createGitHub("test-token", recordingFetch);

    await github.request("GET /repos/{owner}/{repo}/issues", {
      owner: "Arithmomaniac",
      repo: "sefaria-frontend-toolkit",
    });
    await github.request("POST /repos/{owner}/{repo}/issues", {
      owner: "Arithmomaniac",
      repo: "sefaria-frontend-toolkit",
      title: "Test",
      body: "Test",
    });

    expect(requests.map(({ method }) => method)).toEqual(["GET", "POST"]);
    for (const { headers } of requests) {
      expect(headers.get("x-github-api-version")).toBe("2026-03-10");
    }
  });

  it("reports drift when upstream changed", async () => {
    const document = upstreamDocument();
    delete schemas(document).SearchPOSTData;
    const { fetchImpl } = fakeFetch(upstreamRoutes(encode(document)));

    const report = await detectDrift({ fetchImpl, root: packageRoot });

    expect(report.status).toBe("drift");
  });

  const failures: readonly (readonly [string, Record<string, FakeRoute>])[] = [
    [
      "a rejected repository request",
      { [repositoryUrl]: { reject: new TypeError("fetch failed") } },
    ],
    [
      "an unsuccessful commit lookup",
      {
        [repositoryUrl]: { body: { default_branch: "master" } },
        [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
          { status: 502, body: { message: "Bad Gateway" } },
      },
    ],
    [
      "a commit lookup without a complete SHA",
      {
        [repositoryUrl]: { body: { default_branch: "master" } },
        [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
          { body: [] },
      },
    ],
    [
      "an unsuccessful raw download",
      {
        [repositoryUrl]: { body: { default_branch: "master" } },
        [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
          { body: [{ sha: newCommit }] },
        [pinnedOpenApiUrl(newCommit)]: { status: 503, body: "unavailable" },
      },
    ],
    [
      "a rejected raw download",
      {
        [repositoryUrl]: { body: { default_branch: "master" } },
        [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
          { body: [{ sha: newCommit }] },
        [pinnedOpenApiUrl(newCommit)]: {
          reject: new TypeError("fetch failed"),
        },
      },
    ],
    [
      "a raw download that is not JSON",
      {
        [repositoryUrl]: { body: { default_branch: "master" } },
        [`${repositoryUrl}/commits?sha=master&path=docs%2FopenAPI.json&per_page=1`]:
          { body: [{ sha: newCommit }] },
        [pinnedOpenApiUrl(newCommit)]: {
          bytes: new TextEncoder().encode("<html>"),
        },
      },
    ],
  ];

  for (const [name, routes] of failures) {
    it(`fails instead of reporting no drift after ${name}`, async () => {
      const { fetchImpl } = fakeFetch(routes);

      await expect(
        detectDrift({ fetchImpl, root: packageRoot }),
      ).rejects.toThrow();
    });
  }
});

describe("drift issue", () => {
  const repo = { owner: "Arithmomaniac", repo: "sefaria-frontend-toolkit" };

  it("does not create or update an issue when already in sync with none open", async () => {
    const { github, requests } = fakeGitHub((route) =>
      route === "GET /repos/{owner}/{repo}/issues" ? [] : {},
    );
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: upstream,
      },
      overlay,
    });

    await expect(upsertDriftIssue(github, repo, report)).resolves.toEqual({
      action: "none",
      handoff: false,
    });
    expect(requests.map(({ route }) => route)).toEqual([
      "GET /repos/{owner}/{repo}/issues",
    ]);
    expect(requests[0]?.params).toMatchObject({
      state: "open",
      labels: driftIssueLabel,
    });
  });

  it("closes the open episode only after the pin is in sync, preserving its drift report", async () => {
    const existing = {
      number: 7,
      body: renderDriftMarkdown(driftReport()),
    };
    const { github, requests } = fakeGitHub((route) =>
      route === "GET /repos/{owner}/{repo}/issues" ? [existing] : {},
    );
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: upstream,
      },
      overlay,
    });

    await expect(upsertDriftIssue(github, repo, report)).resolves.toEqual({
      action: "closed",
      issueNumber: 7,
      handoff: false,
    });
    expect(requests.map(({ route }) => route)).toEqual([
      "GET /repos/{owner}/{repo}/issues",
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
    ]);
    expect(requests[1]?.params).toMatchObject({
      issue_number: 7,
      state: "closed",
      state_reason: "completed",
      body: expect.stringContaining(existing.body),
    });
    expect(requests[1]?.params.body).toContain(source.commit);
  });

  it("starts a new episode rather than reopening the closed issue after later drift", async () => {
    const issues: { number: number; body: string; state: string }[] = [];
    let nextIssueNumber = 37;
    const { github, requests } = fakeGitHub((route, params) => {
      if (route === "GET /repos/{owner}/{repo}/issues") {
        return issues.filter((issue) => issue.state === "open");
      }
      if (route === "POST /repos/{owner}/{repo}/issues") {
        const issue = {
          number: nextIssueNumber++,
          body: String(params.body),
          state: "open",
        };
        issues.push(issue);
        return issue;
      }
      if (route === "PATCH /repos/{owner}/{repo}/issues/{issue_number}") {
        const issue = issues.find(
          (item) => item.number === params.issue_number,
        );
        if (!issue) throw new Error("Unknown issue");
        issue.state = String(params.state);
        issue.body = String(params.body);
        return issue;
      }
      return {};
    });
    const inSync = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: upstream,
      },
      overlay,
    });

    expect(await upsertDriftIssue(github, repo, driftReport())).toMatchObject({
      action: "created",
      issueNumber: 37,
    });
    expect(await upsertDriftIssue(github, repo, inSync)).toEqual({
      action: "closed",
      issueNumber: 37,
      handoff: false,
    });
    expect(
      await upsertDriftIssue(github, repo, driftReport(laterCommit)),
    ).toMatchObject({ action: "created", issueNumber: 38 });
    expect(issues.map(({ number, state }) => [number, state])).toEqual([
      [37, "closed"],
      [38, "open"],
    ]);
    expect(
      requests.filter(
        ({ route }) => route === "POST /repos/{owner}/{repo}/issues",
      ),
    ).toHaveLength(2);
  });

  it("propagates issue lookup and close failures without treating them as resolved", async () => {
    const report = compareOpenApi({
      pinned: { source, upstreamBytes: upstream },
      upstream: {
        defaultBranch: "master",
        commit: source.commit,
        bytes: upstream,
      },
      overlay,
    });
    const lookup = fakeGitHub(() => {
      throw new Error("Issue lookup unavailable");
    });
    await expect(upsertDriftIssue(lookup.github, repo, report)).rejects.toThrow(
      "Issue lookup unavailable",
    );
    const close = fakeGitHub((route) => {
      if (route === "GET /repos/{owner}/{repo}/issues") {
        return [{ number: 7, body: renderDriftMarkdown(driftReport()) }];
      }
      throw new Error("Issue close unavailable");
    });
    await expect(upsertDriftIssue(close.github, repo, report)).rejects.toThrow(
      "Issue close unavailable",
    );
    const invalid = fakeGitHub(() => ({}));
    await expect(
      upsertDriftIssue(invalid.github, repo, report),
    ).rejects.toThrow("did not return an issue list");
  });

  it("creates the label and one issue when none is open", async () => {
    const { github, requests } = fakeGitHub((route) => {
      if (route === "GET /repos/{owner}/{repo}/labels/{name}") {
        throw Object.assign(new Error("Not Found"), { status: 404 });
      }
      if (route === "GET /repos/{owner}/{repo}/issues") return [];
      if (route === "POST /repos/{owner}/{repo}/issues") return { number: 41 };
      return {};
    });

    const result = await upsertDriftIssue(github, repo, driftReport());

    expect(result).toEqual({
      action: "created",
      issueNumber: 41,
      handoff: true,
    });
    expect(requests.map((request) => request.route)).toEqual([
      "GET /repos/{owner}/{repo}/labels/{name}",
      "POST /repos/{owner}/{repo}/labels",
      "GET /repos/{owner}/{repo}/issues",
      "POST /repos/{owner}/{repo}/issues",
    ]);
    expect(requests[2]?.params).toMatchObject({
      state: "open",
      labels: driftIssueLabel,
    });
    expect(requests[3]?.params).toMatchObject({
      labels: [driftIssueLabel],
      body: expect.stringContaining(driftIssueMarker),
    });
  });

  it("propagates label lookup failures other than absence", async () => {
    const { github } = fakeGitHub((route) => {
      if (route === "GET /repos/{owner}/{repo}/labels/{name}") {
        throw Object.assign(new Error("Server Error"), { status: 500 });
      }
      return [];
    });

    await expect(upsertDriftIssue(github, repo, driftReport())).rejects.toThrow(
      "Server Error",
    );
  });

  it("updates the open issue without duplicating it for the same commit", async () => {
    const existing = {
      number: 7,
      body: renderDriftMarkdown(driftReport()),
    };
    const { github, requests } = fakeGitHub((route) => {
      if (route === "GET /repos/{owner}/{repo}/issues") {
        return [
          { number: 3, body: "unrelated" },
          { number: 5, body: driftIssueMarker, pull_request: {} },
          existing,
        ];
      }
      return {};
    });

    const result = await upsertDriftIssue(github, repo, driftReport());

    expect(result).toEqual({
      action: "updated",
      issueNumber: 7,
      handoff: false,
    });
    expect(requests.map((request) => request.route)).toEqual([
      "GET /repos/{owner}/{repo}/labels/{name}",
      "GET /repos/{owner}/{repo}/issues",
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
    ]);
  });

  it("comments and requests a handoff when the upstream commit moves", async () => {
    const existing = {
      number: 7,
      body: renderDriftMarkdown(driftReport()),
    };
    const { github, requests } = fakeGitHub((route) =>
      route === "GET /repos/{owner}/{repo}/issues" ? [existing] : {},
    );

    const result = await upsertDriftIssue(
      github,
      repo,
      driftReport(laterCommit),
    );

    expect(result).toEqual({
      action: "updated",
      issueNumber: 7,
      handoff: true,
    });
    expect(requests.at(-2)).toMatchObject({
      route: "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      params: {
        issue_number: 7,
        body: expect.stringContaining(laterCommit),
      },
    });
    expect(requests.at(-1)?.route).toBe(
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
    );
  });

  it("keeps the previous commit marker when the handoff comment fails", async () => {
    const existing = {
      number: 7,
      body: renderDriftMarkdown(driftReport()),
    };
    const { github, requests } = fakeGitHub((route) => {
      if (route === "GET /repos/{owner}/{repo}/issues") return [existing];
      if (route.endsWith("/comments")) {
        throw Object.assign(new Error("Service Unavailable"), { status: 503 });
      }
      return {};
    });

    await expect(
      upsertDriftIssue(github, repo, driftReport(laterCommit)),
    ).rejects.toThrow("Service Unavailable");
    expect(requests.map((request) => request.route)).not.toContain(
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
    );
  });

  it("assigns the issue to the Copilot coding agent with the triage agent", async () => {
    const { github, requests } = fakeGitHub((route) =>
      route === "GET /repos/{owner}/{repo}/issues/{issue_number}"
        ? { assignees: [] }
        : {},
    );

    await assignCopilot(github, repo, 7, newCommit);

    expect(requests).toEqual([
      {
        route: "GET /repos/{owner}/{repo}/issues/{issue_number}",
        params: {
          owner: repo.owner,
          repo: repo.repo,
          issue_number: 7,
        },
      },
      {
        route: "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees",
        params: {
          owner: repo.owner,
          repo: repo.repo,
          issue_number: 7,
          assignees: ["copilot-swe-agent[bot]"],
          agent_assignment: {
            target_repo: `${repo.owner}/${repo.repo}`,
            base_branch: "main",
            custom_agent: "openapi-drift-triage",
            custom_instructions: expect.stringContaining(newCommit),
          },
        },
      },
    ]);
  });

  it.each(["copilot-swe-agent", "copilot-swe-agent[bot]"])(
    "rejects reassignment when %s is already assigned",
    async (login) => {
      const { github, requests } = fakeGitHub((route) =>
        route === "GET /repos/{owner}/{repo}/issues/{issue_number}"
          ? { assignees: [{ login }] }
          : {},
      );

      await expect(assignCopilot(github, repo, 7, laterCommit)).rejects.toThrow(
        /already assigned.*manually reassign/i,
      );
      expect(requests.map(({ route }) => route)).toEqual([
        "GET /repos/{owner}/{repo}/issues/{issue_number}",
      ]);
    },
  );

  it("recognizes the Copilot Bot identity returned by the issues REST API", async () => {
    const { github, requests } = fakeGitHub((route) =>
      route === "GET /repos/{owner}/{repo}/issues/{issue_number}"
        ? { assignees: [{ login: "Copilot", type: "Bot", id: 198982749 }] }
        : {},
    );

    await expect(assignCopilot(github, repo, 7, laterCommit)).rejects.toThrow(
      /already assigned.*manually reassign/i,
    );
    expect(requests.map(({ route }) => route)).toEqual([
      "GET /repos/{owner}/{repo}/issues/{issue_number}",
    ]);
  });

  it("rejects an issue lookup with missing assignee data", async () => {
    const { github, requests } = fakeGitHub(() => ({}));

    await expect(assignCopilot(github, repo, 7, laterCommit)).rejects.toThrow(
      /assignees/,
    );
    expect(requests.map(({ route }) => route)).toEqual([
      "GET /repos/{owner}/{repo}/issues/{issue_number}",
    ]);
  });

  it("rejects an assignment commit that is not a complete SHA", async () => {
    const { github } = fakeGitHub(() => ({}));

    await expect(assignCopilot(github, repo, 7, "master")).rejects.toThrow(
      /complete 40-character SHA/,
    );
  });
});
