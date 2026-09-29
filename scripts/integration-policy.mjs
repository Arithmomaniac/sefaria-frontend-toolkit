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
  ["packages/client/package.json", "@arithmomaniac/sefaria-client"],
  [
    "packages/text-transform/package.json",
    "@arithmomaniac/sefaria-text-transform",
  ],
  [
    "packages/web-components/package.json",
    "@arithmomaniac/sefaria-web-components",
  ],
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
            : isPagesWorkflow(filename)
              ? ["workflow_dispatch", "workflow_run"]
              : isRetirementWorkflow(filename)
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
  const strategy = validation.strategy;
  const matrix = isRecord(strategy) ? strategy.matrix : undefined;
  if (
    !isRecord(strategy) ||
    strategy["fail-fast"] !== false ||
    !isRecord(matrix) ||
    JSON.stringify(matrix.os) !==
      JSON.stringify(["ubuntu-latest", "windows-latest"])
  ) {
    issues.push(`CI must validate Linux and Windows in ${filename}`);
  }
  if (validation["continue-on-error"] !== undefined) {
    issues.push(`CI validation cannot continue on error in ${filename}`);
  }
  const steps = Array.isArray(validation.steps) ? validation.steps : [];
  const fullChecks = steps.filter(
    (step) => isRecord(step) && step.run === "pnpm check",
  );
  if (
    fullChecks.length !== 1 ||
    fullChecks.some(
      (step) =>
        step.if !== undefined || step["continue-on-error"] !== undefined,
    )
  ) {
    issues.push(`CI must run one unconditional pnpm check in ${filename}`);
  }
  if (
    !steps.some((step) => isRecord(step) && step.run === "pnpm setup:agent")
  ) {
    issues.push(`CI must run the shared agent setup in ${filename}`);
  }
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
  validatePublishJob(publish, issues, filename);
  const script = jobs["script-source"];
  const expectedScript = {
    name: "archive browser script",
    "timeout-minutes": 30,
    needs: "publish",
    if: "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.PUBLIC_PACKAGES_ENABLED == 'true' }}",
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
  if (
    !hasOnlyEntries(publish.outputs, {
      version: "${{ steps.release-version.outputs.version }}",
    })
  )
    issues.push(`Script producer version output is missing in ${filename}`);
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

function validatePublishJob(publish, issues, filename) {
  const expectedRuns = [
    "pnpm install --frozen-lockfile",
    "pnpm build",
    'node scripts/package-publication.mjs stage --version "$PUBLISH_VERSION"',
    [
      "git fetch --no-tags --depth=1 origin main",
      'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"',
    ].join("\n"),
    "node scripts/package-publication.mjs preflight",
    "pnpm publish .artifacts/publish/client --tag alpha --access public --no-git-checks",
    "pnpm publish .artifacts/publish/text-transform --tag alpha --access public --no-git-checks",
    "pnpm publish .artifacts/publish/web-components --tag alpha --access public --no-git-checks",
    'node scripts/package-publication.mjs verify --version "$PUBLISH_VERSION"',
    'echo "version=$PUBLISH_VERSION" >> "$GITHUB_OUTPUT"',
  ];
  const steps = Array.isArray(publish.steps) ? publish.steps : [];
  const runs = steps
    .filter((step) => isRecord(step) && typeof step.run === "string")
    .map((step) => step.run.trimEnd());
  const tokenSteps = steps.filter(
    (step) =>
      isRecord(step) && isRecord(step.env) && "NODE_AUTH_TOKEN" in step.env,
  );
  const setupNode = steps.find(
    (step) => isRecord(step) && step.uses === "actions/setup-node@v4",
  );

  if (
    publish.name !== "publish public prerelease" ||
    publish.if !==
      "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.PUBLIC_PACKAGES_ENABLED == 'true' }}" ||
    publish.needs !== "check" ||
    publish["runs-on"] !== "ubuntu-latest" ||
    JSON.stringify(publish.permissions) !==
      JSON.stringify({ contents: "read", packages: "write" }) ||
    JSON.stringify(publish.env) !==
      JSON.stringify({
        PUBLISH_VERSION:
          "0.0.0-alpha.${{ github.run_id }}.${{ github.run_attempt }}",
      })
  ) {
    issues.push(`CI publication gate is not green-main-only in ${filename}`);
  }
  if (JSON.stringify(runs) !== JSON.stringify(expectedRuns)) {
    issues.push(
      `CI publication commands or dependency order are incorrect in ${filename}`,
    );
  }
  if (
    !isRecord(setupNode) ||
    JSON.stringify(setupNode.with) !==
      JSON.stringify({
        "node-version": 22,
        cache: "pnpm",
        "registry-url": "https://npm.pkg.github.com",
        scope: "@arithmomaniac",
      })
  ) {
    issues.push(`CI npm registry configuration is incorrect in ${filename}`);
  }
  if (
    tokenSteps.length !== 5 ||
    tokenSteps.some(
      (step) =>
        step.env.NODE_AUTH_TOKEN !== "${{ github.token }}" ||
        !(
          step.run.startsWith("pnpm publish .artifacts/publish/") ||
          step.run === "node scripts/package-publication.mjs preflight" ||
          step.run.startsWith("node scripts/package-publication.mjs verify")
        ),
    )
  ) {
    issues.push(`CI package token scope is incorrect in ${filename}`);
  }
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
    issues.push(`Copilot setup is not toolkit-capability based in ${filename}`);
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
        /(?:npm install|pnpm add|yarn add)\s+["']?@arithmomaniac\/sefaria-/iu.test(
          line,
        ),
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
        (valuePath[1] === "publish" ||
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
        isPagesWorkflow(filename) &&
        [
          "actions/upload-pages-artifact@v5",
          "actions/deploy-pages@v5",
        ].includes(entry)
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
