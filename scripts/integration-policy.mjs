import { readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

const RETIRED_ACTIVE_PREFIXES = [
  "demos/linker/",
  "demos/mcp/",
  "demos/reader-workspace/",
  "demos/showcase/",
];

const PYTHON_RUNTIME_FILES = [
  /(^|\/)pyproject\.toml$/u,
  /(^|\/)requirements[^/]*\.txt$/u,
  /\.py$/u,
];

const PUBLISH_COMMAND =
  /\b(?:npm|pnpm|yarn|changeset)\b[^\n]*\b(?:publish|release)\b/iu;
const PUBLISH_ACTION =
  /(?:deploy-pages|upload-pages-artifact|npm-publish|publish|release)/iu;
const CREDENTIAL_NAME =
  /(?:npm|node)_auth_token|npm_token|github_token|id-token/iu;
const EXPECTED_LIBRARY_NAMES = new Map([
  ["packages/client/package.json", "@sefaria/api-client"],
  ["packages/text-transform/package.json", "@sefaria/text-transform"],
  ["packages/web-components/package.json", "@sefaria/web-components"],
]);

export function validateActivePaths(paths) {
  const issues = [];
  for (const candidate of paths.map(normalizePath)) {
    if (
      RETIRED_ACTIVE_PREFIXES.some(
        (prefix) =>
          candidate === prefix.slice(0, -1) || candidate.startsWith(prefix),
      )
    ) {
      issues.push(`retired active path: ${candidate}`);
    }
    if (PYTHON_RUNTIME_FILES.some((pattern) => pattern.test(candidate))) {
      issues.push(`Python runtime/build dependency: ${candidate}`);
    }
  }
  return issues;
}

export function validateManifestPolicy(manifests) {
  const issues = [];
  for (const [filename, manifest] of Object.entries(manifests)) {
    if (manifest.private !== true) {
      issues.push(`non-private manifest: ${filename}`);
    }
    if (filename.startsWith("packages/")) {
      const expectedName = EXPECTED_LIBRARY_NAMES.get(filename);
      if (expectedName !== undefined && manifest.name !== expectedName) {
        issues.push(
          `unexpected package identity: ${filename} -> ${String(manifest.name)}`,
        );
      }
      validatePackageExports(filename, manifest.exports, issues);
      if (!Array.isArray(manifest.files) || !manifest.files.includes("dist")) {
        issues.push(`package does not explicitly pack dist: ${filename}`);
      }
    }
  }
  return issues;
}

export function validateWorkflowPolicy(workflows) {
  const issues = [];
  for (const [filename, source] of Object.entries(workflows)) {
    const workflow = YAML.parse(source);
    if (!isRecord(workflow)) {
      issues.push(`unsupported workflow structure in ${filename}`);
      continue;
    }
    if (isRecord(workflow)) {
      const events = workflow.on;
      if (!isRecord(events)) {
        issues.push(`unsupported workflow events in ${filename}`);
      } else {
        const eventNames = Object.keys(events).sort();
        const expectedEvents =
          filename.endsWith("/copilot-setup-steps.yml") ||
          filename === "copilot-setup-steps.yml"
            ? ["pull_request", "push", "workflow_dispatch"]
            : isReusableWorkflow(filename)
              ? ["workflow_call"]
              : isPagesWorkflow(filename)
                ? ["workflow_dispatch", "workflow_run"]
                : isRetirementWorkflow(filename)
                  ? ["workflow_dispatch"]
                  : isBootstrapWorkflow(filename)
                    ? ["workflow_dispatch"]
                    : isDriftWorkflow(filename)
                      ? ["schedule", "workflow_dispatch"]
                      : ["pull_request", "push"];
        if (JSON.stringify(eventNames) !== JSON.stringify(expectedEvents)) {
          issues.push(`unsupported workflow events in ${filename}`);
        }
      }
      if (filename.endsWith("/ci.yml") || filename === "ci.yml") {
        validateCiWorkflow(workflow, issues, filename);
      } else if (isPagesWorkflow(filename)) {
        validatePagesWorkflow(workflow, issues, filename);
      } else if (isRetirementWorkflow(filename)) {
        validateRetirementWorkflow(workflow, issues, filename);
      } else if (isBootstrapWorkflow(filename)) {
        validateBootstrapWorkflow(workflow, issues, filename);
      } else if (isValidationWorkflow(filename)) {
        validateValidationWorkflow(workflow, issues, filename);
      } else if (isPublisherWorkflow(filename)) {
        validatePublisherWorkflow(workflow, issues, filename);
      } else if (isDriftWorkflow(filename)) {
        validateDriftWorkflow(workflow, issues, filename);
      } else if (
        filename.endsWith("/copilot-setup-steps.yml") ||
        filename === "copilot-setup-steps.yml"
      ) {
        validateCopilotSetupWorkflow(workflow, issues, filename);
      }
    }
    const secretSource = isDriftWorkflow(filename)
      ? DRIFT_HANDOFF_SECRETS.reduce(
          (remaining, reference) => remaining.replaceAll(reference, ""),
          source,
        )
      : source;
    if (/\$\{\{\s*secrets\./iu.test(secretSource)) {
      issues.push(`secret reference in ${filename}`);
    }
    walkWorkflow(workflow, [], issues, filename);
    for (const job of Object.values(workflow.jobs ?? {})) {
      const target =
        typeof job?.uses === "string"
          ? /^\.\/\.github\/workflows\/([^/]+)$/u.exec(job.uses)?.[1]
          : undefined;
      if (
        target &&
        !Object.keys(workflows).some(
          (name) => name === target || name.endsWith(`/${target}`),
        )
      )
        issues.push(`missing reusable workflow ${target} in ${filename}`);
    }
  }
  return issues;
}

function validatePagesWorkflow(workflow, issues, filename) {
  const approvedActions = new Set([
    "actions/checkout@v4",
    "pnpm/action-setup@v4",
    "actions/setup-node@v4",
    "actions/cache@v4",
    "actions/configure-pages@v5",
    "actions/upload-pages-artifact@v5",
    "actions/deploy-pages@v5",
  ]);
  const events = workflow.on;
  const jobs = workflow.jobs;
  const build = isRecord(jobs) ? jobs.build : undefined;
  const deploy = isRecord(jobs) ? jobs.deploy : undefined;
  const buildSteps =
    isRecord(build) && Array.isArray(build.steps) ? build.steps : [];
  const deploySteps =
    isRecord(deploy) && Array.isArray(deploy.steps) ? deploy.steps : [];
  const expectedBuildSteps = [
    { uses: "actions/checkout@v4", with: { ref: "main" } },
    { uses: "pnpm/action-setup@v4" },
    {
      uses: "actions/setup-node@v4",
      with: {
        "node-version": 22,
        cache: "pnpm",
      },
    },
    {
      uses: "actions/cache@v4",
      with: {
        path: "~/.cache/ms-playwright",
        key: "playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}",
      },
    },
    { run: "pnpm setup:agent" },
    {
      name: "Reuse CI validation of this commit",
      id: "ci",
      run: "node scripts/pages-validation.mjs",
      env: {
        EVENT_NAME: "${{ github.event_name }}",
        WORKFLOW_NAME: "${{ github.event.workflow_run.name }}",
        WORKFLOW_EVENT: "${{ github.event.workflow_run.event }}",
        WORKFLOW_CONCLUSION: "${{ github.event.workflow_run.conclusion }}",
        WORKFLOW_HEAD_SHA: "${{ github.event.workflow_run.head_sha }}",
      },
    },
    { if: "${{ steps.ci.outputs.validated != 'true' }}", run: "pnpm check" },
    {
      if: "${{ steps.ci.outputs.validated == 'true' }}",
      run: "pnpm build && pnpm build:site:bundles && pnpm test:site",
    },
    {
      run: "node scripts/script-source-release.mjs restore",
      env: { GITHUB_TOKEN: "${{ github.token }}" },
    },
    { uses: "actions/configure-pages@v5" },
    {
      uses: "actions/upload-pages-artifact@v5",
      with: { path: "dist/site" },
    },
  ];
  const expectedDeploySteps = [
    {
      name: "Deploy GitHub Pages",
      id: "deployment",
      uses: "actions/deploy-pages@v5",
    },
  ];

  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs).sort()) !==
      JSON.stringify(["build", "deploy"])
  ) {
    issues.push(`Pages workflow jobs are incorrect in ${filename}`);
  }

  if (
    !isRecord(events) ||
    !hasOnlyEntries(events.workflow_run, {
      workflows: ["CI", "Retire script version"],
      types: ["completed"],
      branches: ["main"],
    }) ||
    build?.if !==
      "${{ github.ref == 'refs/heads/main' && (github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_repository.full_name == github.repository && ((github.event.workflow_run.name == 'CI' && github.event.workflow_run.event == 'push') || (github.event.workflow_run.name == 'Retire script version' && github.event.workflow_run.event == 'workflow_dispatch')))) }}"
  ) {
    issues.push(`Pages workflow gate is not main-only in ${filename}`);
  }

  if (
    !hasOnlyEntries(workflow.permissions, { contents: "read" }) ||
    !isRecord(build) ||
    !hasOnlyEntries(build.permissions, {
      contents: "read",
      pages: "read",
    }) ||
    build["timeout-minutes"] !== 60 ||
    !isRecord(deploy) ||
    !hasOnlyEntries(deploy.permissions, {
      contents: "read",
      pages: "write",
      "id-token": "write",
    }) ||
    deploy["timeout-minutes"] !== 15
  ) {
    issues.push(`Pages workflow permissions are incorrect in ${filename}`);
  }

  const unapprovedAction = [...buildSteps, ...deploySteps].find(
    (step) =>
      isRecord(step) &&
      typeof step.uses === "string" &&
      !approvedActions.has(step.uses),
  );
  if (unapprovedAction) {
    issues.push(`unapproved Pages action in ${filename}`);
  }

  if (
    JSON.stringify(buildSteps) !== JSON.stringify(expectedBuildSteps) ||
    JSON.stringify(deploySteps) !== JSON.stringify(expectedDeploySteps)
  ) {
    issues.push(`Pages workflow steps are incorrect in ${filename}`);
  }

  const checkIndex = buildSteps.findIndex(
    (step) => isRecord(step) && step.run === "pnpm check",
  );
  const configureIndex = buildSteps.findIndex(
    (step) => isRecord(step) && step.uses === "actions/configure-pages@v5",
  );
  const uploadIndex = buildSteps.findIndex(
    (step) =>
      isRecord(step) && step.uses === "actions/upload-pages-artifact@v5",
  );
  const upload = buildSteps[uploadIndex];
  const deployIndex = deploySteps.findIndex(
    (step) => isRecord(step) && step.uses === "actions/deploy-pages@v5",
  );
  if (
    !isRecord(build) ||
    !hasOnlyEntries(build.env, {
      SITE_BASE_PATH: "/sefaria-frontend-toolkit/",
    }) ||
    checkIndex === -1 ||
    configureIndex <= checkIndex ||
    uploadIndex <= configureIndex ||
    !isRecord(upload) ||
    !hasOnlyEntries(upload.with, { path: "dist/site" }) ||
    !isRecord(deploy) ||
    deploy.needs !== "build" ||
    deployIndex === -1
  ) {
    issues.push(
      `Pages build/upload/deploy ordering is incorrect in ${filename}`,
    );
  }
}

function validateCiWorkflow(workflow, issues, filename) {
  const events = workflow.on;
  const jobs = workflow.jobs;
  if (
    !isRecord(events) ||
    JSON.stringify(events.pull_request) !==
      JSON.stringify({
        branches: ["main"],
      }) ||
    JSON.stringify(events.push) !==
      JSON.stringify({
        branches: ["main"],
      })
  ) {
    issues.push(`unexpected CI branch scope in ${filename}`);
  }
  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs).sort()) !==
      JSON.stringify(["check", "publish", "script-source", "validation"])
  ) {
    issues.push(`unexpected CI jobs in ${filename}`);
    return;
  }

  const validation = jobs.validation;
  const check = jobs.check;
  const publish = jobs.publish;
  if (!isRecord(validation) || !isRecord(check) || !isRecord(publish)) {
    issues.push(`invalid CI jobs in ${filename}`);
    return;
  }
  if (
    JSON.stringify(workflow.concurrency) !==
    JSON.stringify({
      group: "ci-${{ github.workflow }}-${{ github.ref }}",
      "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
    })
  ) {
    issues.push(
      `CI publication can be canceled after it starts in ${filename}`,
    );
  }
  if (
    !hasOnlyEntries(validation, {
      uses: "./.github/workflows/validate-toolkit.yml",
    })
  )
    issues.push(`CI must use shared complete validation in ${filename}`);
  if (
    check.name !== "check" ||
    check.if !== "${{ always() }}" ||
    check.needs !== "validation" ||
    JSON.stringify(check).includes("continue-on-error") ||
    !JSON.stringify(check).includes(
      'needs.validation.result }}\\" != \\"success\\"',
    )
  ) {
    issues.push(`CI check aggregation is not fail-closed in ${filename}`);
  }
  validatePublishCaller(publish, false, issues, filename);
  const script = jobs["script-source"];
  const expectedScript = {
    name: "archive browser script",
    "timeout-minutes": 30,
    needs: "publish",
    if: "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.SEFARIA_PACKAGES_ENABLED == 'true' }}",
    "runs-on": "ubuntu-latest",
    permissions: { contents: "write" },
    env: { SCRIPT_VERSION: "${{ needs.publish.outputs.version }}" },
    steps: [
      { uses: "actions/checkout@v4" },
      { uses: "pnpm/action-setup@v4" },
      {
        uses: "actions/setup-node@v4",
        with: { "node-version": 22, cache: "pnpm" },
      },
      {
        uses: "actions/cache@v4",
        with: {
          path: "~/.cache/ms-playwright",
          key: "playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}",
        },
      },
      { run: "pnpm setup:agent" },
      { run: "pnpm build" },
      { run: "pnpm build:script-source" },
      { run: "pnpm test:script-source dist/script-source" },
      {
        run: "node scripts/script-source-release.mjs publish",
        env: { GITHUB_TOKEN: "${{ github.token }}" },
      },
    ],
  };
  if (!hasOnlyEntries(script, expectedScript))
    issues.push(`Script archive gate is incorrect in ${filename}`);
}

function validateRetirementWorkflow(workflow, issues, filename) {
  const expected = {
    "timeout-minutes": 10,
    if: "${{ github.ref == 'refs/heads/main' }}",
    "runs-on": "ubuntu-latest",
    permissions: { contents: "write" },
    steps: [
      { uses: "actions/checkout@v4", with: { ref: "main" } },
      { uses: "pnpm/action-setup@v4" },
      {
        uses: "actions/setup-node@v4",
        with: { "node-version": 22, cache: "pnpm" },
      },
      { run: "pnpm install --frozen-lockfile" },
      {
        run: "node scripts/script-source-release.mjs retire",
        env: {
          GITHUB_TOKEN: "${{ github.token }}",
          RETIRE_VERSION: "${{ inputs.version }}",
        },
      },
    ],
  };
  if (
    !hasOnlyEntries(workflow.permissions, { contents: "read" }) ||
    !hasOnlyEntries(workflow.jobs, { retire: expected }) ||
    !hasOnlyEntries(workflow.on, {
      workflow_dispatch: {
        inputs: {
          version: {
            description: "Exact script version to retire without notice",
            required: true,
            type: "string",
          },
        },
      },
    })
  ) {
    issues.push(`Script retirement gate is incorrect in ${filename}`);
  }
}

const DRIFT_HANDOFF_SECRETS = [
  "${{ secrets.COPILOT_ASSIGN_TOKEN != '' }}",
  "${{ secrets.COPILOT_ASSIGN_TOKEN }}",
];

function validateDriftWorkflow(workflow, issues, filename) {
  const setup = [
    {
      uses: "actions/checkout@v4",
      with: { ref: "${{ github.event.repository.default_branch }}" },
    },
    { uses: "pnpm/action-setup@v4" },
    {
      uses: "actions/setup-node@v4",
      with: { "node-version": 22, cache: "pnpm" },
    },
    { run: "pnpm install --frozen-lockfile" },
  ];
  const available = "steps.token.outputs.available == 'true'";
  const detect = {
    name: "detect upstream drift",
    "timeout-minutes": 10,
    "runs-on": "ubuntu-latest",
    permissions: { contents: "read", issues: "write" },
    outputs: {
      commit: "${{ steps.drift.outputs.commit }}",
      handoff: "${{ steps.drift.outputs.handoff }}",
      "issue-number": "${{ steps.drift.outputs.issue-number }}",
    },
    steps: [
      ...setup,
      {
        id: "drift",
        run: "pnpm openapi:drift --issue",
        env: { GITHUB_TOKEN: "${{ github.token }}" },
      },
    ],
  };
  const handoff = {
    name: "hand off to Copilot",
    needs: "detect",
    if: "${{ needs.detect.outputs.handoff == 'true' }}",
    "timeout-minutes": 10,
    "runs-on": "ubuntu-latest",
    permissions: { contents: "read" },
    env: {
      ISSUE_NUMBER: "${{ needs.detect.outputs.issue-number }}",
      UPSTREAM_COMMIT: "${{ needs.detect.outputs.commit }}",
    },
    steps: [
      {
        id: "token",
        run: `echo "available=${DRIFT_HANDOFF_SECRETS[0]}" >> "$GITHUB_OUTPUT"`,
      },
      {
        if: "steps.token.outputs.available != 'true'",
        run: 'echo "::notice::COPILOT_ASSIGN_TOKEN is not set. Assign issue #$ISSUE_NUMBER to Copilot manually."',
      },
      ...setup.map((step) => ({ if: available, ...step })),
      {
        if: available,
        run: 'pnpm openapi:drift --assign-copilot "$ISSUE_NUMBER" --commit "$UPSTREAM_COMMIT"',
        env: { COPILOT_ASSIGN_TOKEN: DRIFT_HANDOFF_SECRETS[1] },
      },
    ],
  };
  if (
    !hasOnlyEntries(workflow, {
      name: "OpenAPI drift",
      on: { schedule: [{ cron: "17 6 * * *" }], workflow_dispatch: null },
      permissions: {},
      concurrency: { group: "openapi-drift", "cancel-in-progress": false },
      jobs: { detect, handoff },
    })
  ) {
    issues.push(`OpenAPI drift report-only gate is incorrect in ${filename}`);
  }
}

function isBootstrapWorkflow(filename) {
  return (
    filename === "bootstrap-packages.yml" ||
    filename.endsWith("/bootstrap-packages.yml")
  );
}

function validateBootstrapWorkflow(workflow, issues, filename) {
  const gate =
    "${{ github.ref == 'refs/heads/main' && vars.SEFARIA_PACKAGES_ENABLED != 'true' }}";
  const { validation, check, publish } = workflow.jobs ?? {};
  if (
    JSON.stringify(Object.keys(workflow.jobs ?? {}).sort()) !==
      JSON.stringify(["check", "publish", "validation"]) ||
    JSON.stringify(workflow.permissions) !==
      JSON.stringify({ contents: "read" }) ||
    workflow.concurrency !== undefined ||
    !hasOnlyEntries(validation, {
      if: gate,
      uses: "./.github/workflows/validate-toolkit.yml",
    }) ||
    check?.if !== "${{ always() }}" ||
    check?.needs !== "validation" ||
    JSON.stringify(check).includes("continue-on-error") ||
    !JSON.stringify(check).includes(
      'needs.validation.result }}\\" != \\"success\\"',
    ) ||
    publish?.if !== gate
  ) {
    issues.push(
      `Bootstrap validation/main/activation gate is incorrect in ${filename}`,
    );
    return;
  }
  const expectedCheck = {
    name: "check",
    if: "${{ always() }}",
    needs: "validation",
    "runs-on": "ubuntu-latest",
    steps: [
      {
        name: "Require every validation platform",
        run: 'if [ "${{ needs.validation.result }}" != "success" ]; then\n  echo "Validation result: ${{ needs.validation.result }}"\n  exit 1\nfi\n',
      },
    ],
  };
  if (!hasOnlyEntries(check, expectedCheck))
    issues.push(
      `Bootstrap check aggregation is not fail-closed in ${filename}`,
    );
  validatePublishCaller(publish, true, issues, filename);
}

function validatePublishCaller(publish, bootstrap, issues, filename) {
  if (
    !hasOnlyEntries(publish, {
      name: bootstrap
        ? "bootstrap Sefaria prerelease"
        : "publish public prerelease",
      if: bootstrap
        ? "${{ github.ref == 'refs/heads/main' && vars.SEFARIA_PACKAGES_ENABLED != 'true' }}"
        : "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.SEFARIA_PACKAGES_ENABLED == 'true' }}",
      needs: "check",
      uses: "./.github/workflows/publish-packages.yml",
      with: { bootstrap },
      permissions: { contents: "read", packages: "write" },
    })
  )
    issues.push(`Shared publication caller gate is incorrect in ${filename}`);
}

function isValidationWorkflow(filename) {
  return (
    filename === "validate-toolkit.yml" ||
    filename.endsWith("/validate-toolkit.yml")
  );
}

function isPublisherWorkflow(filename) {
  return (
    filename === "publish-packages.yml" ||
    filename.endsWith("/publish-packages.yml")
  );
}

function isReusableWorkflow(filename) {
  return isValidationWorkflow(filename) || isPublisherWorkflow(filename);
}

function validateValidationWorkflow(workflow, issues, filename) {
  const expected = {
    name: "Validate toolkit",
    on: { workflow_call: null },
    permissions: { contents: "read" },
    jobs: {
      validation: {
        name: "validation (${{ matrix.os }})",
        "runs-on": "${{ matrix.os }}",
        strategy: {
          "fail-fast": false,
          matrix: { os: ["ubuntu-latest", "windows-latest"] },
        },
        steps: [
          { uses: "actions/checkout@v4" },
          { uses: "pnpm/action-setup@v4" },
          {
            uses: "actions/setup-node@v4",
            with: { "node-version": 22, cache: "pnpm" },
          },
          {
            uses: "actions/cache@v4",
            with: {
              path: "${{ runner.os == 'Windows' && '~\\AppData\\Local\\ms-playwright' || '~/.cache/ms-playwright' }}",
              key: "playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}",
            },
          },
          { run: "pnpm setup:agent" },
          {
            run: "pnpm check",
            env: { SITE_SCREENSHOT_DIR: ".artifacts/site" },
          },
          {
            name: "Upload failure diagnostics",
            if: "failure()",
            uses: "actions/upload-artifact@v4",
            with: {
              name: "failure-${{ runner.os }}",
              path: ".artifacts/check/result.json\n.artifacts/setup/result.json\n.artifacts/site/\nplaywright-report/\ntest-results/\n",
              "if-no-files-found": "warn",
              "retention-days": 7,
            },
          },
        ],
      },
    },
  };
  if (!hasOnlyEntries(workflow, expected))
    issues.push(
      `Shared validation must run unconditional complete Linux and Windows checks in ${filename}`,
    );
}

function validatePublisherWorkflow(workflow, issues, filename) {
  const authenticated = (run, condition) => ({
    ...(condition ? { if: condition } : {}),
    run,
    env: { NODE_AUTH_TOKEN: "${{ github.token }}" },
  });
  const expected = {
    name: "Publish toolkit packages",
    on: {
      workflow_call: {
        inputs: { bootstrap: { required: true, type: "boolean" } },
        outputs: { version: { value: "${{ jobs.publish.outputs.version }}" } },
      },
    },
    permissions: { contents: "read" },
    jobs: {
      publish: {
        name: "publish verified prerelease",
        "timeout-minutes": 30,
        if: "${{ github.ref == 'refs/heads/main' && ((inputs.bootstrap && github.event_name == 'workflow_dispatch' && vars.SEFARIA_PACKAGES_ENABLED != 'true') || (!inputs.bootstrap && github.event_name == 'push' && vars.SEFARIA_PACKAGES_ENABLED == 'true')) }}",
        concurrency: {
          group: "sefaria-package-publication",
          "cancel-in-progress": false,
        },
        "runs-on": "ubuntu-latest",
        permissions: { contents: "read", packages: "write" },
        outputs: { version: "${{ steps.release-version.outputs.version }}" },
        env: {
          PUBLISH_VERSION:
            "0.0.0-alpha.${{ github.run_id }}.${{ github.run_attempt }}",
        },
        steps: [
          { uses: "actions/checkout@v4" },
          { uses: "pnpm/action-setup@v4" },
          {
            uses: "actions/setup-node@v4",
            with: {
              "node-version": 22,
              cache: "pnpm",
              "registry-url": "https://npm.pkg.github.com",
              scope: "@sefaria",
            },
          },
          { run: "pnpm install --frozen-lockfile" },
          { run: "pnpm build" },
          {
            run: 'node scripts/package-publication.mjs stage --version "$PUBLISH_VERSION"',
          },
          {
            name: "Require the current main head",
            run: 'git fetch --no-tags --depth=1 origin main\ntest "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"\n',
          },
          authenticated(
            "node scripts/package-publication.mjs bootstrap-preflight",
            "${{ inputs.bootstrap }}",
          ),
          authenticated(
            "node scripts/package-publication.mjs preflight",
            "${{ !inputs.bootstrap }}",
          ),
          ...["client", "text-transform", "web-components"].map((slug) =>
            authenticated(
              `pnpm publish .artifacts/publish/${slug} --tag alpha --access public --no-git-checks`,
            ),
          ),
          authenticated(
            'node scripts/package-publication.mjs bootstrap-verify --version "$PUBLISH_VERSION"',
            "${{ inputs.bootstrap }}",
          ),
          authenticated(
            'node scripts/package-publication.mjs verify --version "$PUBLISH_VERSION"',
            "${{ !inputs.bootstrap }}",
          ),
          {
            id: "release-version",
            run: 'echo "version=$PUBLISH_VERSION" >> "$GITHUB_OUTPUT"',
          },
        ],
      },
    },
  };
  if (!hasOnlyEntries(workflow, expected))
    issues.push(
      `Shared publication mode, gates, credentials, dependency order, or version output is incorrect in ${filename}`,
    );
}

function validateCopilotSetupWorkflow(workflow, issues, filename) {
  const expectedPaths = [
    ".github/scripts/detect-toolkit.mjs",
    ".github/workflows/copilot-setup-steps.yml",
  ];
  if (
    JSON.stringify(workflow.on?.pull_request) !==
      JSON.stringify({ paths: expectedPaths }) ||
    JSON.stringify(workflow.on?.push) !==
      JSON.stringify({ paths: expectedPaths })
  ) {
    issues.push(`Copilot setup self-validation is missing in ${filename}`);
  }
  const jobs = workflow.jobs;
  if (
    !isRecord(jobs) ||
    JSON.stringify(Object.keys(jobs)) !==
      JSON.stringify(["copilot-setup-steps"])
  ) {
    issues.push(`unexpected Copilot setup jobs in ${filename}`);
    return;
  }
  const setup = jobs["copilot-setup-steps"];
  const source = JSON.stringify(setup);
  if (
    !isRecord(setup) ||
    JSON.stringify(setup.permissions) !== JSON.stringify({ contents: "read" })
  ) {
    issues.push(`unsafe Copilot setup job in ${filename}`);
  }
  if (
    !source.includes(".github/scripts/detect-toolkit.mjs") ||
    !source.includes("pnpm setup:agent") ||
    source.includes("feature/avilevin/frontend-toolkit-alpha")
  ) {
    issues.push(`Copilot setup is not toolkit-loader based in ${filename}`);
  }
}

export function validateLockfilePolicy(source) {
  const issues = [];
  const lockfile = YAML.parse(source);
  walkObject(lockfile, [], (value, valuePath) => {
    if (
      valuePath.at(-1) === "tarball" &&
      typeof value === "string" &&
      /^https?:\/\//iu.test(value)
    ) {
      issues.push(`nonportable tarball URL at ${valuePath.join(".")}`);
    }
  });
  return issues;
}

export function validateDocumentationClaims(files) {
  const issues = [];
  for (const [filename, source] of Object.entries(files)) {
    const prose = stripFencedCode(source);
    const toolkitInstallLines = source
      .split(/\r?\n/u)
      .filter((line) =>
        /(?:npm install|pnpm add|yarn add)\s+["']?@sefaria\//iu.test(line),
      );
    const documentsGitHubPackages =
      filename === "docs/help/install-and-status.md" &&
      source.includes("https://npm.pkg.github.com") &&
      /\bread:packages\b/u.test(source) &&
      /\bnot published on npmjs\.com\b/iu.test(prose) &&
      toolkitInstallLines.length === 1 &&
      [...EXPECTED_LIBRARY_NAMES.values()].every((packageName) =>
        toolkitInstallLines[0].includes(`"${packageName}@$version"`),
      );
    if (toolkitInstallLines.length > 0 && !documentsGitHubPackages) {
      issues.push(`unsupported registry installation command: ${filename}`);
    }
    for (const line of prose.split(/\r?\n/u)) {
      if (
        /\b(?:official\s+Sefaria|Sefaria-(?:maintained|supported))\b/iu.test(
          line,
        ) &&
        !/\b(?:not|isn't|is not|does not|no)\b/iu.test(line)
      ) {
        issues.push(`unsupported official ownership claim: ${filename}`);
        break;
      }
    }
    for (const line of prose.split(/\r?\n/u)) {
      if (
        /\b(?:(?:toolkit|documentation site)\s+(?:is\s+)?(?:deployed|hosted)|deployed\s+(?:toolkit|documentation(?:\s+site)?))\b/iu.test(
          line,
        ) &&
        !/\b(?:not|unpublished|local-only|does not)\b/iu.test(line)
      ) {
        issues.push(`unsupported deployment claim: ${filename}`);
        break;
      }
    }
  }
  return issues;
}

export async function readJsonFiles(root, filenames) {
  return Object.fromEntries(
    await Promise.all(
      filenames.map(async (filename) => [
        normalizePath(filename),
        JSON.parse(await readFile(path.join(root, filename), "utf8")),
      ]),
    ),
  );
}

function validatePackageExports(filename, exportsField, issues) {
  if (exportsField === undefined) {
    issues.push(`package exports are missing: ${filename}`);
    return;
  }
  walkObject(exportsField, ["exports"], (value, valuePath) => {
    if (
      typeof value === "string" &&
      !value.startsWith("./dist/") &&
      value !== "./dist/index.js" &&
      value !== "./dist/index.d.ts"
    ) {
      issues.push(
        `source export fallback at ${filename}:${valuePath.join(".")} -> ${value}`,
      );
    }
  });
}

function walkWorkflow(value, valuePath, issues, filename) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walkWorkflow(entry, [...valuePath, String(index)], issues, filename),
    );
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...valuePath, key];
    const publishToken =
      isPublisherWorkflow(filename) &&
      key === "NODE_AUTH_TOKEN" &&
      valuePath[0] === "jobs" &&
      valuePath[1] === "publish" &&
      entry === "${{ github.token }}";
    const pagesIdentityToken =
      key === "id-token" &&
      valuePath[0] === "jobs" &&
      valuePath[1] === "deploy" &&
      isPagesWorkflow(filename) &&
      entry === "write";
    const scriptToken =
      key === "GITHUB_TOKEN" &&
      entry === "${{ github.token }}" &&
      valuePath[0] === "jobs" &&
      (((filename === "ci.yml" || filename.endsWith("/ci.yml")) &&
        valuePath[1] === "script-source") ||
        (isRetirementWorkflow(filename) && valuePath[1] === "retire") ||
        (isDriftWorkflow(filename) && valuePath[1] === "detect") ||
        (isPagesWorkflow(filename) && valuePath[1] === "build"));
    if (
      CREDENTIAL_NAME.test(key) &&
      !publishToken &&
      !pagesIdentityToken &&
      !scriptToken
    ) {
      issues.push(
        `publication credential in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (key === "permissions" && isRecord(entry)) {
      for (const [permission, access] of Object.entries(entry)) {
        const publishPermission =
          valuePath[0] === "jobs" &&
          valuePath[1] === "publish" &&
          (isPublisherWorkflow(filename) ||
            isBootstrapWorkflow(filename) ||
            filename === "ci.yml" ||
            filename.endsWith("/ci.yml")) &&
          ((permission === "contents" && access === "read") ||
            (permission === "packages" && access === "write"));
        const pagesPermission =
          isPagesWorkflow(filename) &&
          valuePath[0] === "jobs" &&
          ((valuePath[1] === "build" &&
            ((permission === "contents" && access === "read") ||
              (permission === "pages" && access === "read"))) ||
            (valuePath[1] === "deploy" &&
              ((permission === "contents" && access === "read") ||
                (permission === "pages" && access === "write") ||
                (permission === "id-token" && access === "write"))));
        const scriptPermission =
          valuePath[0] === "jobs" &&
          permission === "contents" &&
          access === "write" &&
          (((filename === "ci.yml" || filename.endsWith("/ci.yml")) &&
            valuePath[1] === "script-source") ||
            (isRetirementWorkflow(filename) && valuePath[1] === "retire"));
        const driftIssuePermission =
          isDriftWorkflow(filename) &&
          valuePath[0] === "jobs" &&
          valuePath[1] === "detect" &&
          permission === "issues" &&
          access === "write";
        if (
          !publishPermission &&
          !pagesPermission &&
          !scriptPermission &&
          !driftIssuePermission &&
          (permission !== "contents" || access !== "read")
        ) {
          issues.push(
            `unsafe workflow permission in ${filename}:${nextPath.join(".")}.${permission}`,
          );
        }
      }
    }
    if (key === "permissions" && !isRecord(entry)) {
      issues.push(
        `unsafe workflow permission in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (key === "tags" || key === "tags-ignore") {
      issues.push(
        `unsupported tag trigger in ${filename}:${nextPath.join(".")}`,
      );
    }
    if (
      key === "run" &&
      typeof entry === "string" &&
      PUBLISH_COMMAND.test(entry) &&
      !(
        valuePath[0] === "jobs" &&
        ((isPublisherWorkflow(filename) && valuePath[1] === "publish") ||
          ((filename === "ci.yml" || filename.endsWith("/ci.yml")) &&
            valuePath[1] === "script-source" &&
            entry === "node scripts/script-source-release.mjs publish"))
      )
    ) {
      issues.push(`publication command in ${filename}:${nextPath.join(".")}`);
    }
    if (
      key === "uses" &&
      typeof entry === "string" &&
      PUBLISH_ACTION.test(entry) &&
      !(
        (isPagesWorkflow(filename) &&
          [
            "actions/upload-pages-artifact@v5",
            "actions/deploy-pages@v5",
          ].includes(entry)) ||
        (valuePath[0] === "jobs" &&
          valuePath[1] === "publish" &&
          entry === "./.github/workflows/publish-packages.yml" &&
          (isBootstrapWorkflow(filename) ||
            filename === "ci.yml" ||
            filename.endsWith("/ci.yml")))
      )
    ) {
      issues.push(
        `publication/deployment action in ${filename}:${nextPath.join(".")}`,
      );
    }
    walkWorkflow(entry, nextPath, issues, filename);
  }
}

function walkObject(value, valuePath, visit) {
  visit(value, valuePath);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walkObject(entry, [...valuePath, String(index)], visit),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    walkObject(entry, [...valuePath, key], visit);
  }
}

function stripFencedCode(source) {
  return source.replace(/```[\s\S]*?```/gu, "");
}

function normalizePath(candidate) {
  return candidate.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyEntries(value, expected) {
  if (!isRecord(value)) return false;
  const actualEntries = Object.entries(value);
  const expectedEntries = Object.entries(expected);
  return (
    actualEntries.length === expectedEntries.length &&
    expectedEntries.every(
      ([key, expectedValue]) =>
        JSON.stringify(value[key]) === JSON.stringify(expectedValue),
    )
  );
}

function isPagesWorkflow(filename) {
  return filename === "pages.yml" || filename.endsWith("/pages.yml");
}

function isDriftWorkflow(filename) {
  return (
    filename === "openapi-drift.yml" || filename.endsWith("/openapi-drift.yml")
  );
}

function isRetirementWorkflow(filename) {
  return (
    filename === "script-retirement.yml" ||
    filename.endsWith("/script-retirement.yml")
  );
}
