import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";
import { validateWorkflowPolicy as validate } from "../scripts/integration-policy.mjs";

const read = (name: string) =>
  readFileSync(path.resolve(".github", "workflows", name), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
const ci = read("ci.yml");
const validation = read("validate-toolkit.yml");
const release = read("release-npm.yml");
const policy = (name: string, source: string) =>
  validate({ "validate-toolkit.yml": validation, [name]: source });

describe("exact release and validation workflow contracts", () => {
  it("admits maintained workflows without resurrecting GitHub Packages", () => {
    for (const name of [
      "ci.yml",
      "release-npm.yml",
      "pages.yml",
      "script-retirement.yml",
      "copilot-setup-steps.yml",
      "openapi-drift.yml",
    ])
      expect(policy(name, read(name))).toEqual([]);
    for (const name of ["publish-packages.yml", "bootstrap-packages.yml"])
      expect(policy(name, "on:\n  workflow_dispatch:\njobs: {}")).not.toEqual(
        [],
      );
  });

  it("keeps shared Linux/Windows validation and fail-closed aggregation", () => {
    expect(Object.keys(YAML.parse(ci).jobs).sort()).toEqual([
      "check",
      "validation",
    ]);
    expect(YAML.parse(validation).jobs.validation.strategy).toEqual({
      "fail-fast": false,
      matrix: { os: ["ubuntu-latest", "windows-latest"] },
    });
    expect(validate({ "ci.yml": ci }).join("\n")).toContain(
      "missing reusable workflow",
    );
    for (const candidate of [
      ci.replace('!= "success"', '!= "failure"'),
      ci.replace("if: ${{ always() }}", "if: true"),
      ci.replace("contents: read", "contents: write"),
      ci +
        "\n  publish:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm publish\n",
    ])
      expect(policy("ci.yml", candidate).length).toBeGreaterThan(0);
    for (const candidate of [
      validation.replace("          - windows-latest", ""),
      validation.replace(
        "      - run: pnpm check",
        "      - if: false\n        run: pnpm check",
      ),
      validation.replace("fail-fast: false", "fail-fast: true"),
      validation.replace("pnpm setup:agent", "echo skipped"),
    ])
      expect(policy("validate-toolkit.yml", candidate).length).toBeGreaterThan(
        0,
      );
  });

  it("captures exact package assets before approval and never builds or packs in publication", () => {
    const jobs = YAML.parse(release).jobs;
    expect(jobs.publish.environment).toBe("npm-release");
    expect(jobs.publish.needs).toEqual(["guard", "draft"]);
    expect(jobs.publish.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });
    for (const name of ["draft", "finalize"])
      expect(jobs[name].permissions).toEqual({ contents: "write" });
    for (const name of ["prepare", "verify", "guard"])
      expect(JSON.stringify(jobs[name].permissions ?? {})).not.toMatch(
        /"write"/,
      );
    for (const name of ["publish", "verify", "finalize"]) {
      const steps = JSON.stringify(jobs[name].steps);
      expect(steps).not.toMatch(
        /pnpm build|npm pack|package:smoke|npm-release\.mjs prepare/,
      );
      expect(steps).toContain("captured-npm");
    }
    expect(jobs.finalize.if).toContain("needs.verify.result == 'success'");
    expect(jobs.draft.if).toContain("always()");
    expect(
      jobs.draft.steps.find(
        (step: { run?: string }) =>
          step.run === "node scripts/npm-release.mjs capture",
      ).if,
    ).toBe("${{ inputs.operation != 'prepare' }}");
    expect(jobs.capture).toBeUndefined();
    expect(jobs.prepare.strategy.matrix.os).toEqual([
      "ubuntu-latest",
      "windows-latest",
    ]);
    expect(release).not.toMatch(
      /secrets\.|NODE_AUTH_TOKEN|packages:|vars\.|registry-url/,
    );
    expect(release).not.toContain("npm-release.mjs guard");
    expect(release).not.toContain("actions: read");
  });

  it("disables workspace and npm install hooks in the OIDC publisher", () => {
    const workflow = YAML.parse(release);
    const steps = workflow.jobs.publish.steps;
    expect(steps.map((step: { run?: string }) => step.run)).toContain(
      "pnpm install --frozen-lockfile --ignore-scripts",
    );
    expect(steps.map((step: { run?: string }) => step.run)).toContain(
      "npm install --global npm@11.5.2 --ignore-scripts",
    );
    for (const step of steps.filter((step: { run?: string }) =>
      /^(?:pnpm|npm) install\b/.test(step.run ?? ""),
    )) {
      const mutated = structuredClone(workflow);
      const index = steps.indexOf(step);
      mutated.jobs.publish.steps[index].run = step.run.replace(
        " --ignore-scripts",
        "",
      );
      expect(
        policy("release-npm.yml", YAML.stringify(mutated)).length,
      ).toBeGreaterThan(0);
    }
  });

  it("rejects every named main/manual/approval/permission/source/asset bypass", () => {
    for (const [before, after] of [
      ["workflow_dispatch:", "push:"],
      ["github.ref == 'refs/heads/main'", "true"],
      ["github.event_name == 'workflow_dispatch'", "true"],
      ["environment: npm-release", "environment: github-pages"],
      ["cancel-in-progress: false", "cancel-in-progress: true"],
      ["node-version: 22.14.0", "node-version: 22.12.0"],
      ["npm@11.5.2", "npm@10"],
      ["node scripts/npm-release.mjs assert-source", "echo unchecked"],
      ["node scripts/npm-release.mjs compare-platforms", "echo skipped"],
      [
        "needs.prepare.result == 'success'",
        "needs.prepare.result != 'failure'",
      ],
      ["needs.verify.result == 'success'", "true"],
      ["needs: [guard, draft]", "needs: guard"],
      ["name: captured-npm", "name: mutable-latest"],
      ["if-no-files-found: error", "if-no-files-found: warn"],
      [
        "contents: read\n      id-token: write",
        "contents: write\n      id-token: write",
      ],
      [
        "GITHUB_TOKEN: ${{ github.token }}",
        "GITHUB_TOKEN: ${{ secrets.NPM_TOKEN }}",
      ],
      [
        "node scripts/npm-release.mjs publish",
        "pnpm build && npm pack && npm publish",
      ],
    ]) {
      expect(release).toContain(before);
      expect(
        policy("release-npm.yml", release.replaceAll(before, after)).length,
      ).toBeGreaterThan(0);
    }
  });

  it("preserves Pages restoration and rejects changed maintenance gates", () => {
    const pages = read("pages.yml");
    expect(pages).toContain("node scripts/script-source-release.mjs restore");
    for (const candidate of [
      pages.replace(
        "node scripts/script-source-release.mjs restore",
        "echo skipped",
      ),
      pages.replace("conclusion == 'success'", "conclusion != 'failure'"),
      pages.replace(
        "ref: main",
        "ref: ${{ github.event.workflow_run.head_sha }}",
      ),
      pages.replace(" && pnpm test:site", ""),
    ])
      expect(policy("pages.yml", candidate).length).toBeGreaterThan(0);
    expect(
      policy(
        "script-retirement.yml",
        read("script-retirement.yml").replace(
          "if: ${{ github.ref == 'refs/heads/main' }}",
          "if: true",
        ),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("keeps Copilot setup and OpenAPI drift capabilities narrowly scoped", () => {
    const setup = read("copilot-setup-steps.yml");
    expect(setup).not.toMatch(/contents: write|id-token|secrets\./);
    expect(
      policy(
        "copilot-setup-steps.yml",
        setup.replace("pnpm setup:agent", "pnpm publish"),
      ).length,
    ).toBeGreaterThan(0);
    const drift = read("openapi-drift.yml");
    for (const candidate of [
      drift.replace("issues: write", "pull-requests: write"),
      drift.replace("secrets.COPILOT_ASSIGN_TOKEN", "secrets.NPM_TOKEN"),
      drift.replace("pnpm openapi:drift --issue", "pnpm openapi:refresh"),
    ])
      expect(policy("openapi-drift.yml", candidate).length).toBeGreaterThan(0);
  });
});
