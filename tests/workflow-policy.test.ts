import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import { validateWorkflowPolicy as validatePolicySource } from "../scripts/integration-policy.mjs";

const ciSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);
const setupSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/copilot-setup-steps.yml"),
  "utf8",
);
const validationSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/validate-toolkit.yml"),
  "utf8",
);
const publisherSource = readFileSync(
  resolve(process.cwd(), ".github/workflows/publish-packages.yml"),
  "utf8",
);
const reusableWorkflows = {
  "validate-toolkit.yml": validationSource,
  "publish-packages.yml": publisherSource,
};

function validateWorkflowPolicy(workflows: Record<string, string>): string[] {
  return validatePolicySource({ ...reusableWorkflows, ...workflows });
}

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
  it("admits only explicitly gated bootstrap without browser archival", () => {
    const source = readFileSync(
      resolve(process.cwd(), ".github/workflows/bootstrap-packages.yml"),
      "utf8",
    );
    expect(
      validateWorkflowPolicy({ "bootstrap-packages.yml": source }),
    ).toEqual([]);
    expect(source).not.toContain("script-source-release.mjs");
    for (const candidate of [
      source.replaceAll("github.ref == 'refs/heads/main'", "true"),
      source.replaceAll("vars.SEFARIA_PACKAGES_ENABLED != 'true'", "true"),
      source.replace("bootstrap: true", "bootstrap: false"),
      source.replace("needs: check", "needs: validation"),
      source.replace("validate-toolkit.yml", "missing-validation.yml"),
      source.replace("publish-packages.yml", "missing-publication.yml"),
      source.replace('!= "success"', '== "failure"'),
      source.replace(
        "jobs:",
        "concurrency:\n  group: sefaria-package-publication\n  cancel-in-progress: false\n\njobs:",
      ),
      source.replace(
        "      packages: write",
        "      packages: write\n      issues: write",
      ),
    ]) {
      expect(
        validateWorkflowPolicy({ "bootstrap-packages.yml": candidate }).length,
      ).toBeGreaterThan(0);
    }
  });
  it("rejects missing reusable definitions and bypasses at either publication boundary", () => {
    expect(validatePolicySource({ "ci.yml": ciSource }).join("\n")).toContain(
      "missing reusable workflow",
    );
    for (const candidate of [
      ciSource.replace("needs: check", "needs: validation"),
      ciSource.replace("bootstrap: false", "bootstrap: true"),
      ciSource.replace("github.event_name == 'push'", "true"),
      ciSource.replace("vars.SEFARIA_PACKAGES_ENABLED == 'true'", "true"),
      ciSource.replace("publish-packages.yml", "missing-publisher.yml"),
    ]) {
      expect(
        validateWorkflowPolicy({ "ci.yml": candidate }).length,
      ).toBeGreaterThan(0);
    }
    for (const candidate of [
      publisherSource.replace("type: boolean", "type: string"),
      publisherSource.replace("required: true", "required: false"),
      publisherSource.replace("github.ref == 'refs/heads/main'", "true"),
      publisherSource.replace(
        "github.event_name == 'workflow_dispatch'",
        "true",
      ),
      publisherSource.replace(
        "vars.SEFARIA_PACKAGES_ENABLED != 'true'",
        "true",
      ),
      publisherSource.replace(
        "vars.SEFARIA_PACKAGES_ENABLED == 'true'",
        "true",
      ),
      publisherSource.replace("bootstrap-preflight", "preflight"),
      publisherSource.replace("bootstrap-verify", "verify"),
      publisherSource.replace("if: ${{ !inputs.bootstrap }}", "if: true"),
      publisherSource.replace(
        "cancel-in-progress: false",
        "cancel-in-progress: true",
      ),
      publisherSource.replace(
        "NODE_AUTH_TOKEN: ${{ github.token }}",
        "NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
      ),
      publisherSource.replace('scope: "@sefaria"', 'scope: "@unrelated"'),
      publisherSource.replace("jobs.publish.outputs.version", "github.run_id"),
      publisherSource.replace("github.run_attempt", "github.run_number"),
      publisherSource.replace(
        'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"',
        "true",
      ),
      publisherSource.replace(
        "    runs-on: ubuntu-latest",
        "    continue-on-error: true\n    runs-on: ubuntu-latest",
      ),
    ]) {
      expect(
        validateWorkflowPolicy({ "publish-packages.yml": candidate }).length,
      ).toBeGreaterThan(0);
    }
  });
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
      pages.replace(
        "if: ${{ steps.ci.outputs.validated != 'true' }}",
        "if: false",
      ),
      pages.replace(
        "if: ${{ steps.ci.outputs.validated == 'true' }}",
        "if: true",
      ),
      pages.replace(
        "WORKFLOW_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}",
        "WORKFLOW_HEAD_SHA: ${{ github.sha }}",
      ),
      pages.replace(" && pnpm test:site", ""),
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
    const validation = (parseWorkflow(validationSource).jobs as RecordValue)
      .validation as RecordValue;
    const strategy = validation.strategy as RecordValue;
    const matrix = strategy.matrix as RecordValue;
    const check = jobs.check as RecordValue;

    expect(Object.keys(jobs).sort()).toEqual([
      "check",
      "publish",
      "script-source",
      "validation",
    ]);
    expect(jobs.validation).toEqual({
      uses: "./.github/workflows/validate-toolkit.yml",
    });
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
      "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.SEFARIA_PACKAGES_ENABLED == 'true' }}",
    );
    expect(publish.needs).toBe("check");
    expect(publish.permissions).toEqual({
      contents: "read",
      packages: "write",
    });
    expect(publish.uses).toBe("./.github/workflows/publish-packages.yml");
    expect(publish.with).toEqual({ bootstrap: false });
    expect(publish.steps).toBeUndefined();
    expect(publisherSource).toContain("github.run_id");
    expect(publisherSource).toContain("github.run_attempt");
    expect(publisherSource).toContain("github.token");
    expect(JSON.stringify(publish)).toContain("SEFARIA_PACKAGES_ENABLED");
    expect(publish.name).toBe("publish public prerelease");
    expect(publisherSource).toContain("--access public");
    expect(publisherSource).not.toContain("--access restricted");
    expect(publisherSource).not.toContain("secrets.");
    expect(JSON.stringify(parseWorkflow(publisherSource))).toContain(
      'test \\"$(git rev-parse HEAD)\\" = \\"$(git rev-parse origin/main)\\"',
    );
    expect(ciSource).not.toMatch(
      /deploy-pages|upload-pages-artifact|pull_request_target/iu,
    );
  });

  it("keeps Copilot setup read-only and loader-based", () => {
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
    const mutations: Array<[string, string, string]> = [
      [
        "validate-toolkit.yml",
        validationSource.replace("          - windows-latest", ""),
        "Shared validation must run unconditional complete Linux and Windows checks",
      ],
      [
        "validate-toolkit.yml",
        validationSource.replace(
          "      - run: pnpm check",
          "      - if: false\n        run: pnpm check",
        ),
        "Shared validation must run unconditional complete Linux and Windows checks",
      ],
      [
        "ci.yml",
        ciSource.replace(
          'if [ "${{ needs.validation.result }}" != "success" ]',
          'if [ "${{ needs.validation.result }}" != "failure" ]',
        ),
        "CI check aggregation is not fail-closed",
      ],
      [
        "copilot-setup-steps.yml",
        setupSource.replace(
          "run: pnpm setup:agent",
          "env:\n          TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: pnpm setup:agent",
        ),
        "secret reference",
      ],
      [
        "copilot-setup-steps.yml",
        setupSource.replace(
          "  pull_request:\n    paths:\n      - .github/scripts/detect-toolkit.mjs\n      - .github/workflows/copilot-setup-steps.yml\n",
          "",
        ),
        "Copilot setup self-validation is missing",
      ],
    ];

    for (const [filename, candidate, expected] of mutations) {
      expect(
        validateWorkflowPolicy({ [filename]: candidate }).join("\n"),
      ).toContain(expected);
    }
  });
});
