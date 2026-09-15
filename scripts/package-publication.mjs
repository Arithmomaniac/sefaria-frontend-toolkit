import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import YAML from "yaml";

import { isPathWithin } from "./tarball-consumer-validation.mjs";

const REGISTRY = "https://npm.pkg.github.com";
const DEFAULT_REPOSITORY = "Arithmomaniac/sefaria-frontend-toolkit";
const INTERNAL_PACKAGE_NAMES = new Set([
  "@arithmomaniac/sefaria-client",
  "@arithmomaniac/sefaria-text-transform",
  "@arithmomaniac/sefaria-web-components",
]);

export const PACKAGE_DEFINITIONS = [
  {
    name: "@arithmomaniac/sefaria-client",
    slug: "client",
    directory: "packages/client",
    customElements: false,
  },
  {
    name: "@arithmomaniac/sefaria-text-transform",
    slug: "text-transform",
    directory: "packages/text-transform",
    customElements: false,
  },
  {
    name: "@arithmomaniac/sefaria-web-components",
    slug: "web-components",
    directory: "packages/web-components",
    customElements: true,
  },
];

const NODE_SAFE_IMPORTS = [
  "@arithmomaniac/sefaria-client",
  "@arithmomaniac/sefaria-client/client",
  "@arithmomaniac/sefaria-client/contracts",
  "@arithmomaniac/sefaria-client/errors",
  "@arithmomaniac/sefaria-client/schemas",
  "@arithmomaniac/sefaria-client/validation",
  "@arithmomaniac/sefaria-client/validators",
  "@arithmomaniac/sefaria-text-transform",
  "@arithmomaniac/sefaria-web-components/bilingual-segment",
  "@arithmomaniac/sefaria-web-components/connections-panel",
  "@arithmomaniac/sefaria-web-components/popup",
  "@arithmomaniac/sefaria-web-components/reader",
  "@arithmomaniac/sefaria-web-components/reader-controller",
  "@arithmomaniac/sefaria-web-components/reader-session",
  "@arithmomaniac/sefaria-web-components/ref-label",
  "@arithmomaniac/sefaria-web-components/source-card",
  "@arithmomaniac/sefaria-web-components/text-segment",
];

export function createPublishVersion(runId, runAttempt) {
  for (const [label, value] of [
    ["run ID", runId],
    ["run attempt", runAttempt],
  ]) {
    if (!/^[1-9]\d*$/u.test(value)) {
      throw new Error(`${label} must be a positive integer.`);
    }
  }
  return `0.0.0-alpha.${runId}.${runAttempt}`;
}

export function createRegistryMetadataUrl(packageName) {
  return `${REGISTRY}/${packageName.replace("/", "%2F")}`;
}

export function createPackagePageUrl({
  serverUrl,
  repositoryFullName,
  packageName,
}) {
  const packageSlug = packageName.split("/").at(-1);
  return `${serverUrl}/${repositoryFullName}/pkgs/npm/${encodeURIComponent(packageSlug)}`;
}

export function createPublishManifest({ definition, sourceManifest, version }) {
  validatePublishVersion(version);
  if (
    sourceManifest.name !== definition.name ||
    sourceManifest.private !== true
  ) {
    throw new Error(`${definition.name} source manifest must remain private.`);
  }

  const dependencies = { ...(sourceManifest.dependencies ?? {}) };
  for (const dependency of INTERNAL_PACKAGE_NAMES) {
    if (
      dependency === definition.name ||
      dependencies[dependency] === undefined
    ) {
      continue;
    }
    if (dependencies[dependency] !== "workspace:*") {
      throw new Error(
        `${definition.name} must use workspace:* for ${dependency} before staging.`,
      );
    }
    dependencies[dependency] = version;
  }

  return {
    ...sourceManifest,
    version,
    private: false,
    dependencies,
    publishConfig: {
      access: "restricted",
      registry: REGISTRY,
    },
  };
}

export async function stagePublishPackages({
  repository,
  destination,
  version,
}) {
  validatePublishVersion(version);
  await rm(destination, { force: true, recursive: true });
  await mkdir(destination, { recursive: true });

  for (const definition of PACKAGE_DEFINITIONS) {
    const source = path.join(repository, definition.directory);
    const staged = path.join(destination, definition.slug);
    const sourceManifest = JSON.parse(
      await readFile(path.join(source, "package.json"), "utf8"),
    );
    const publishManifest = createPublishManifest({
      definition,
      sourceManifest,
      version,
    });

    await mkdir(staged, { recursive: true });
    await cp(path.join(source, "dist"), path.join(staged, "dist"), {
      recursive: true,
    });
    await rm(path.join(staged, "dist", ".tsbuildinfo"), { force: true });
    await Promise.all([
      cp(path.join(source, "README.md"), path.join(staged, "README.md")),
      cp(path.join(repository, "LICENSE"), path.join(staged, "LICENSE")),
      writeFile(
        path.join(staged, "package.json"),
        `${JSON.stringify(publishManifest, null, 2)}\n`,
      ),
      ...(definition.customElements
        ? [
            cp(
              path.join(source, "custom-elements.json"),
              path.join(staged, "custom-elements.json"),
            ),
          ]
        : []),
    ]);
    await validateStagedPackage(staged, publishManifest);
  }
}

export function validatePublishedPackage({
  definition,
  registryMetadata,
  publicStatus,
  repositoryFullName,
  version,
}) {
  if (publicStatus !== 404) {
    if (publicStatus >= 200 && publicStatus < 300) {
      throw new Error(`${definition.name} must be private.`);
    }
    throw new Error(
      `${definition.name} private visibility check returned ${publicStatus}.`,
    );
  }
  if (!isRecord(registryMetadata)) {
    throw new Error(`${definition.name} registry metadata is invalid.`);
  }
  if (registryMetadata.name !== definition.name) {
    throw new Error(`${definition.name} package metadata name is incorrect.`);
  }
  if (registryMetadata["dist-tags"]?.alpha !== version) {
    throw new Error(`${definition.name} alpha tag is not ${version}.`);
  }
  const publishedVersion = registryMetadata.versions?.[version];
  if (
    !isRecord(publishedVersion) ||
    publishedVersion.name !== definition.name ||
    publishedVersion.version !== version
  ) {
    throw new Error(`${definition.name}@${version} is not published.`);
  }
  const repository =
    typeof publishedVersion.repository === "string"
      ? publishedVersion.repository
      : publishedVersion.repository?.url;
  if (repository !== `git+https://github.com/${repositoryFullName}.git`) {
    throw new Error(
      `${definition.name} is not linked to ${repositoryFullName}.`,
    );
  }
  for (const dependency of INTERNAL_PACKAGE_NAMES) {
    if (
      dependency !== definition.name &&
      publishedVersion.dependencies?.[dependency] !== undefined &&
      publishedVersion.dependencies[dependency] !== version
    ) {
      throw new Error(
        `${definition.name} published ${dependency} at a non-synchronized version.`,
      );
    }
  }
}

export function validateRegistryConsumerLockfile({ lockfile, version }) {
  validatePublishVersion(version);
  if (/\b(?:workspace:|link:|file:)/u.test(lockfile)) {
    throw new Error("Registry consumer resolved toolkit source or a tarball.");
  }
  const parsed = YAML.parse(lockfile);
  const dependencies =
    parsed?.importers?.["."]?.dependencies ??
    parsed?.importers?.[""]?.dependencies ??
    parsed;
  for (const definition of PACKAGE_DEFINITIONS) {
    const resolution = dependencies?.[definition.name];
    const specifier =
      typeof resolution === "string" ? resolution : resolution?.specifier;
    const resolvedVersion =
      typeof resolution === "string" ? resolution : resolution?.version;
    const packageVersion =
      typeof resolvedVersion === "string"
        ? resolvedVersion.replace(/\(.+$/u, "")
        : resolvedVersion;
    if (specifier !== version || packageVersion !== version) {
      throw new Error(
        `${definition.name} did not resolve the exact published version.`,
      );
    }
  }
}

async function verifyPublication({
  repository,
  staging,
  version,
  repositoryFullName,
  serverUrl,
  token,
}) {
  validatePublishVersion(version);
  if (!token) {
    throw new Error(
      "NODE_AUTH_TOKEN is required for publication verification.",
    );
  }
  if (!repositoryFullName.includes("/")) {
    throw new Error("GITHUB_REPOSITORY must include an owner and repository.");
  }

  for (const definition of PACKAGE_DEFINITIONS) {
    const [registryMetadata, packagePageResponse] = await Promise.all([
      fetchRegistryJson(createRegistryMetadataUrl(definition.name), token),
      globalThis.fetch(
        createPackagePageUrl({
          serverUrl,
          repositoryFullName,
          packageName: definition.name,
        }),
        {
          headers: {
            Accept: "text/html",
            "User-Agent": "sefaria-frontend-toolkit-publication-verifier",
          },
        },
      ),
    ]);
    validatePublishedPackage({
      definition,
      registryMetadata,
      publicStatus: packagePageResponse.status,
      repositoryFullName,
      version,
    });
  }

  await verifyRegistryConsumer({ repository, staging, version });
}

async function verifyRegistryConsumer({ repository, staging, version }) {
  const root = await mkdtemp(path.join(tmpdir(), "sefaria-registry-consumer-"));
  const consumer = path.join(root, "consumer");
  const npmrc = path.join(root, ".npmrc");
  try {
    await mkdir(consumer, { recursive: true });
    await Promise.all([
      writeFile(
        path.join(consumer, "package.json"),
        `${JSON.stringify(
          {
            name: "sefaria-private-registry-consumer",
            version: "0.0.0",
            private: true,
            type: "module",
            dependencies: Object.fromEntries(
              PACKAGE_DEFINITIONS.map((definition) => [
                definition.name,
                version,
              ]),
            ),
          },
          null,
          2,
        )}\n`,
      ),
      writeFile(
        npmrc,
        [
          "@arithmomaniac:registry=https://npm.pkg.github.com",
          "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}",
          "always-auth=true",
          "",
        ].join("\n"),
      ),
    ]);

    const installEnvironment = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: npmrc,
    };
    runPnpm(["install", "--lockfile-only"], consumer, installEnvironment);
    runPnpm(["install", "--frozen-lockfile"], consumer, installEnvironment);
    validateRegistryConsumerLockfile({
      lockfile: await readFile(path.join(consumer, "pnpm-lock.yaml"), "utf8"),
      version,
    });

    const canonicalConsumer = await realpath(consumer);
    const canonicalRepository = await realpath(repository);
    for (const definition of PACKAGE_DEFINITIONS) {
      const manifestPath = path.join(
        consumer,
        "node_modules",
        ...definition.name.split("/"),
        "package.json",
      );
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (
        !isRecord(manifest) ||
        manifest.name !== definition.name ||
        manifest.version !== version ||
        manifest.private !== false
      ) {
        throw new Error(
          `${definition.name} installed manifest does not match the published prerelease.`,
        );
      }
      for (const dependency of INTERNAL_PACKAGE_NAMES) {
        if (
          dependency !== definition.name &&
          manifest.dependencies?.[dependency] !== undefined &&
          manifest.dependencies[dependency] !== version
        ) {
          throw new Error(
            `${definition.name} installed ${dependency} at a non-synchronized version.`,
          );
        }
      }
      const installedPath = await realpath(manifestPath);
      if (
        !isPathWithin(canonicalConsumer, installedPath) ||
        isPathWithin(canonicalRepository, installedPath)
      ) {
        throw new Error(
          `${definition.name} resolved outside the isolated registry consumer.`,
        );
      }
    }

    await Promise.all([
      rm(npmrc, { force: true }),
      rm(staging, { force: true, recursive: true }),
    ]);
    runNodeImports(NODE_SAFE_IMPORTS, consumer);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

async function fetchRegistryJson(url, token) {
  const response = await globalThis.fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "sefaria-frontend-toolkit-publication-verifier",
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub npm registry metadata request failed: ${response.status} ${response.statusText}.`,
    );
  }
  return response.json();
}

function runPnpm(args, cwd, env = process.env) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const commandArgs = windows
    ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed.`);
  }
}

function runNodeImports(specifiers, cwd) {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      [
        `await Promise.all(${JSON.stringify(specifiers)}.map((specifier) => import(specifier)));`,
        "if ('customElements' in globalThis) throw new Error('DOM registration leaked into Node-safe imports');",
      ].join(""),
    ],
    { cwd, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Registry package imports failed: ${result.stderr}`);
  }
}

function validatePublishVersion(version) {
  if (!/^0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*$/u.test(version)) {
    throw new Error(
      "Publish version must match 0.0.0-alpha.<run-id>.<run-attempt>.",
    );
  }
}

async function validateStagedPackage(staged, manifest) {
  const files = await listFiles(staged);
  const forbidden = files.find(
    (filename) =>
      filename.startsWith("src/") ||
      filename.endsWith(".tsbuildinfo") ||
      filename.endsWith(".js.map") ||
      filename.endsWith(".d.ts.map") ||
      /\.test\.(?:js|d\.ts)$/u.test(filename),
  );
  if (forbidden !== undefined) {
    throw new Error(`${manifest.name} staged forbidden file ${forbidden}.`);
  }
  for (const target of collectExportTargets(manifest.exports)) {
    await access(path.join(staged, target.replace(/^\.\//u, "")));
  }
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), filename)),
      );
    } else {
      files.push(filename);
    }
  }
  return files;
}

function collectExportTargets(value, targets = []) {
  if (typeof value === "string") {
    targets.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectExportTargets(entry, targets);
  } else if (isRecord(value)) {
    for (const entry of Object.values(value)) {
      collectExportTargets(entry, targets);
    }
  }
  return targets;
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || process.argv[index + 1] === undefined) {
    throw new Error(`${name} is required.`);
  }
  return process.argv[index + 1];
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entryPath)).href
) {
  const command = process.argv[2];
  const version = readArgument("--version");
  const repository = path.resolve(import.meta.dirname, "..");
  const staging = path.join(repository, ".artifacts", "publish");
  if (command === "stage") {
    await stagePublishPackages({
      repository,
      destination: staging,
      version,
    });
    process.stdout.write(
      `Staged ${PACKAGE_DEFINITIONS.length} packages at ${version}.\n`,
    );
  } else if (command === "verify") {
    await verifyPublication({
      repository,
      staging,
      version,
      repositoryFullName: process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY,
      serverUrl: process.env.GITHUB_SERVER_URL ?? "https://github.com",
      token: process.env.NODE_AUTH_TOKEN,
    });
    process.stdout.write(
      `Verified ${PACKAGE_DEFINITIONS.length} private registry packages at ${version}.\n`,
    );
  } else {
    throw new Error("Expected the stage or verify command.");
  }
}
