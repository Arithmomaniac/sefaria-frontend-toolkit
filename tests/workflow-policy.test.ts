import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import { validateWorkflowPolicy } from "../scripts/integration-policy.mjs";

const ciSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);
const setupSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/copilot-setup-steps.yml"),
  "utf8",
);

type RecordValue = Record<string, unknown>;

function parseWorkflow(source: string): RecordValue {
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  }
  const value: unknown = document.toJS();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      "Workflow YAML must contain a mapping at the document root.",
    );
  }
  return value as RecordValue;
}

describe("agent-ready workflow policy", () => {
  it("archives browser releases only after verified package publication", () => {
    const workflow = parseWorkflow(ciSource);
    const archive = (workflow.jobs as RecordValue)[
      "script-source"
    ] as RecordValue;
    expect(archive).toBeDefined();
    expect(archive.needs).toBe("publish");
    expect(archive.permissions).toEqual({ contents: "write" });
    expect(JSON.stringify(archive)).toContain(
      "pnpm test:script-source dist/script-source",
    );
    expect(JSON.stringify(archive)).toContain(
      "node scripts/script-source-release.mjs publish",
    );
  });

  it("rejects script archive bypasses and incorrect retry version identity", () => {
    for (const candidate of [
      ciSource.replace("needs: publish", "needs: check"),
      ciSource.replace(
        "pnpm test:script-source dist/script-source",
        "echo skipped",
      ),
      ciSource.replace(
        "SCRIPT_VERSION: ${{ needs.publish.outputs.version }}",
        "SCRIPT_VERSION: 0.0.0-alpha.${{ github.run_id }}.${{ github.run_attempt }}",
      ),
      ciSource.replace(
        "      contents: write",
        "      contents: write\n      packages: write",
      ),
    ]) {
      expect(
        validateWorkflowPolicy({ "ci.yml": candidate }).join("\n"),
      ).toContain("Script archive gate");
    }
  });

  it("requires trusted main-only Pages and explicit manual retirement", () => {
    const pages = readFileSync(
      resolve(process.cwd(), ".github/workflows/pages.yml"),
      "utf8",
    );
    const retirement = readFileSync(
      resolve(process.cwd(), ".github/workflows/script-retirement.yml"),
      "utf8",
    );
    expect(
      validateWorkflowPolicy({
        "pages.yml": pages,
        "script-retirement.yml": retirement,
      }),
    ).toEqual([]);
    for (const candidate of [
      pages.replace("conclusion == 'success'", "conclusion != 'failure'"),
      pages.replace(
        "ref: main",
        "ref: ${{ github.event.workflow_run.head_sha }}",
      ),
      pages.replace(
        "node scripts/script-source-release.mjs restore",
        "echo skipped",
      ),
    ]) {
      expect(
        validateWorkflowPolicy({ "pages.yml": candidate }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateWorkflowPolicy({
        "script-retirement.yml": retirement.replace(
          "if: ${{ github.ref == 'refs/heads/main' }}",
          "if: true",
        ),
      }).length,
    ).toBeGreaterThan(0);
  });
  it("admits only the exact read-only OpenAPI drift workflow and its optional handoff secret", () => {
    const drift = readFileSync(
      resolve(process.cwd(), ".github/workflows/openapi-drift.yml"),
      "utf8",
    );
    expect(validateWorkflowPolicy({ "openapi-drift.yml": drift })).toEqual([]);
    for (const candidate of [
      drift.replace(
        "      issues: write",
        "      issues: write\n      pull-requests: write",
      ),
      drift.replace(
        "      contents: read\n    env:",
        "      issues: write\n    env:",
      ),
      drift.replace(
        "pnpm openapi:drift --issue",
        "pnpm openapi:refresh --commit x && pnpm openapi:drift --issue",
      ),
      drift.replace(
        "${{ secrets.COPILOT_ASSIGN_TOKEN }}",
        "${{ secrets.NPM_TOKEN }}",
      ),
      drift.replace(
        "permissions: {}",
        "permissions: {}\n\nenv:\n  COPILOT_ASSIGN_TOKEN: ${{ secrets.COPILOT_ASSIGN_TOKEN }}",
      ),
      drift.replace("  workflow_dispatch:", "  workflow_dispatch:\n  push:"),
      drift.replace("17 6 * * *", "17 6 * * 1"),
      drift.replace(
        "ref: ${{ github.event.repository.default_branch }}",
        "ref: ${{ github.ref }}",
      ),
      drift.replace(
        "    if: ${{ needs.detect.outputs.handoff == 'true' }}\n",
        "",
      ),
    ]) {
      expect(
        validateWorkflowPolicy({ "openapi-drift.yml": candidate }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateWorkflowPolicy({
        "script-retirement.yml": readFileSync(
          resolve(process.cwd(), ".github/workflows/script-retirement.yml"),
          "utf8",
        ).replace(
          "RETIRE_VERSION: ${{ inputs.version }}",
          "RETIRE_VERSION: ${{ secrets.COPILOT_ASSIGN_TOKEN }}",
        ),
      }).join("\n"),
    ).toContain("secret reference");
  });

  it("requires complete Linux and Windows validation behind one check", () => {
    const workflow = parseWorkflow(ciSource);
    const jobs = workflow.jobs as RecordValue;
    const validation = jobs.validation as RecordValue;
    const strategy = validation.strategy as RecordValue;
    const matrix = strategy.matrix as RecordValue;
    const check = jobs.check as RecordValue;

    expect(Object.keys(jobs).sort()).toEqual([
      "check",
      "publish",
      "script-source",
      "validation",
    ]);
    expect(strategy["fail-fast"]).toBe(false);
    expect(matrix.os).toEqual(["ubuntu-latest", "windows-latest"]);
    expect(validation["continue-on-error"]).toBeUndefined();
    expect(
      (validation.steps as RecordValue[]).filter(
        (step) => step.run === "pnpm check",
      ),
    ).toHaveLength(1);
    expect(check.name).toBe("check");
    expect(check.if).toBe("${{ always() }}");
    expect(check.needs).toBe("validation");
    expect(JSON.stringify(check)).toContain("needs.validation.result");
    expect(JSON.stringify(check)).toContain('!= \\"success\\"');
  });

  it("retains the intended branch and permission boundary", () => {
    const workflow = parseWorkflow(ciSource);

    const jobs = workflow.jobs as RecordValue;
    const publish = jobs.publish as RecordValue;

    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.on).toEqual({
      pull_request: { branches: ["main"] },
      push: { branches: ["main"] },
    });
    expect(workflow.concurrency).toEqual({
      group: "ci-${{ github.workflow }}-${{ github.ref }}",
      "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
    });
    expect(publish.if).toBe(
      "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.PUBLIC_PACKAGES_ENABLED == 'true' }}",
    );
    expect(publish.needs).toBe("check");
    expect(publish.permissions).toEqual({
      contents: "read",
      packages: "write",
    });
    expect(JSON.stringify(publish)).toContain("github.run_id");
    expect(JSON.stringify(publish)).toContain("github.run_attempt");
    expect(JSON.stringify(publish)).toContain("github.token");
    expect(JSON.stringify(publish)).toContain("PUBLIC_PACKAGES_ENABLED");
    expect(publish.name).toBe("publish public prerelease");
    expect(JSON.stringify(publish)).toContain("--access public");
    expect(JSON.stringify(publish)).not.toContain("--access restricted");
    expect(JSON.stringify(publish)).not.toContain("secrets.");
    expect(JSON.stringify(publish)).toContain(
      'test \\"$(git rev-parse HEAD)\\" = \\"$(git rev-parse origin/main)\\"',
    );
    expect(ciSource).not.toMatch(
      /deploy-pages|upload-pages-artifact|pull_request_target/iu,
    );
  });

  it("keeps Copilot setup read-only and capability-based", () => {
    const workflow = parseWorkflow(setupSource);
    const jobs = workflow.jobs as RecordValue;
    const setup = jobs["copilot-setup-steps"] as RecordValue;

    expect(Object.keys(jobs)).toEqual(["copilot-setup-steps"]);
    expect(workflow.on).toEqual({
      workflow_dispatch: null,
      pull_request: {
        paths: [
          ".github/scripts/detect-toolkit.mjs",
          ".github/workflows/copilot-setup-steps.yml",
        ],
      },
      push: {
        paths: [
          ".github/scripts/detect-toolkit.mjs",
          ".github/workflows/copilot-setup-steps.yml",
        ],
      },
    });
    expect(setup.permissions).toEqual({ contents: "read" });
    expect(setupSource).toContain(".github/scripts/detect-toolkit.mjs");
    expect(setupSource).toContain("pnpm setup:agent");
    expect(setupSource).not.toContain(
      "feature/avilevin/frontend-toolkit-alpha",
    );
    expect(setupSource).not.toMatch(/secrets\.|contents: write|id-token/iu);
  });

  it("surfaces malformed workflow YAML", () => {
    expect(() => parseWorkflow(`${ciSource}\n  - malformed`)).toThrow();
  });

  it("rejects missing platforms, conditional checks, permissive aggregation, and secrets", () => {
    const mutations: Array<[string, string]> = [
      [
        ciSource.replace("          - windows-latest", ""),
        "CI must validate Linux and Windows",
      ],
      [
        ciSource.replace(
          "      - run: pnpm check",
          "      - if: false\n        run: pnpm check",
        ),
        "CI must run one unconditional pnpm check",
      ],
      [
        ciSource.replace(
          'if [ "${{ needs.validation.result }}" != "success" ]',
          'if [ "${{ needs.validation.result }}" != "failure" ]',
        ),
        "CI check aggregation is not fail-closed",
      ],
      [
        setupSource.replace(
          "run: pnpm setup:agent",
          "env:\n          TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: pnpm setup:agent",
        ),
        "secret reference",
      ],
      [
        setupSource.replace(
          "  pull_request:\n    paths:\n      - .github/scripts/detect-toolkit.mjs\n      - .github/workflows/copilot-setup-steps.yml\n",
          "",
        ),
        "Copilot setup self-validation is missing",
      ],
    ];

    for (const [candidate, expected] of mutations) {
      const filename = candidate.includes("Copilot Setup Steps")
        ? "copilot-setup-steps.yml"
        : "ci.yml";
      expect(
        validateWorkflowPolicy({ [filename]: candidate }).join("\n"),
      ).toContain(expected);
    }
  });
});
