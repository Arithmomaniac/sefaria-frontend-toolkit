import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import process from "node:process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, URL } from "node:url";
import { Octokit } from "@octokit/rest";
import { extract, list } from "tar";
import { z } from "zod";
import {
  NPM_REGISTRY,
  REPOSITORY,
  PACKAGE_DEFINITIONS,
  exportTargets,
  readReleaseState,
  releaseTag,
  releaseVersionSchema,
  sourceShaSchema,
  stagePublishPackages,
  tarballFilename,
  listFiles,
} from "./package-publication.mjs";
import { validatePackedPackage } from "./tarball-consumer-validation.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const { AbortSignal } = globalThis;
const MAX_ASSET_BYTES = 20_000_000;
const MAX_JSON_BYTES = 200_000;
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const dependenciesSchema = z.record(z.string().max(200), z.string().max(200));
const browserFilesSchema = z.record(z.string().max(200), digestSchema);
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    repository: z.literal(REPOSITORY),
    source: sourceShaSchema,
    version: releaseVersionSchema,
    tag: z.enum(["alpha", "latest"]),
    packages: z
      .array(
        z
          .object({
            name: z.enum(
              PACKAGE_DEFINITIONS.map((definition) => definition.name),
            ),
            filename: z.string().max(150),
            size: z.number().int().positive().max(MAX_ASSET_BYTES),
            sha256: digestSchema,
            integrity: z.string().regex(/^sha512-[A-Za-z0-9+/]{86}==$/),
            dependencies: dependenciesSchema,
            browserFiles: browserFilesSchema,
          })
          .strict(),
      )
      .length(3),
  })
  .strict();
const assetSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().max(150),
    size: z.number().int().nonnegative().max(MAX_ASSET_BYTES),
  })
  .passthrough();
const releaseSchema = z
  .object({
    id: z.number().int().positive(),
    tag_name: z.string(),
    target_commitish: sourceShaSchema,
    draft: z.boolean(),
    prerelease: z.boolean(),
    assets: z.array(assetSchema).max(6),
    upload_url: z.string().url(),
    html_url: z.string().url(),
  })
  .passthrough();
const owner = "Sefaria";
const repo = "sefaria-frontend-toolkit";

export function digests(bytes) {
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}

export function validateManifest(value, { version, source } = {}) {
  const manifest = manifestSchema.parse(value);
  if (
    manifest.tag !== releaseTag(manifest.version) ||
    (version !== undefined && version !== manifest.version) ||
    (source !== undefined && source !== manifest.source)
  )
    throw new Error("Release manifest version/source/tag conflict.");
  for (const [index, definition] of PACKAGE_DEFINITIONS.entries()) {
    const entry = manifest.packages[index];
    if (
      entry.name !== definition.name ||
      entry.filename !== tarballFilename(definition, manifest.version)
    )
      throw new Error("Release manifest package order/filename conflict.");
    const internal = Object.fromEntries(
      PACKAGE_DEFINITIONS.filter(
        (dependency) =>
          dependency.name !== definition.name &&
          entry.dependencies[dependency.name] !== undefined,
      ).map((dependency) => [
        dependency.name,
        entry.dependencies[dependency.name],
      ]),
    );
    if (
      definition.slug === "web-components" &&
      (internal["@sefaria/api-client"] !== manifest.version ||
        internal["@sefaria/text-transform"] !== manifest.version)
    )
      throw new Error("Release manifest internal dependency conflict.");
    if (Object.values(internal).some((value) => value !== manifest.version))
      throw new Error("Release manifest unsynchronized dependency.");
    const files = [
      definition.browserFile,
      "LICENSE.txt",
      "THIRD-PARTY-NOTICES.txt",
    ];
    if (
      JSON.stringify(Object.keys(entry.browserFiles).sort()) !==
      JSON.stringify(files.sort())
    )
      throw new Error("Release manifest browser inventory conflict.");
  }
  return manifest;
}

function json(bytes) {
  if (bytes.length > MAX_JSON_BYTES)
    throw new Error("Release JSON exceeds bounded size.");
  return JSON.parse(bytes.toString("utf8"));
}

function manifestBytes(manifest) {
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
}

export function maintainerCommands(manifest) {
  validateManifest(manifest);
  return [
    `# Draft assets: https://github.com/${REPOSITORY}/releases/tag/v${manifest.version}`,
    "# Use your authorized Sefaria npm account with 2FA. Do not use source archives.",
    "$ErrorActionPreference = 'Stop'",
    `gh release download v${manifest.version} --repo ${REPOSITORY} --dir npm-release-assets`,
    'if ($LASTEXITCODE -ne 0) { throw "Draft download failed" }',
    "Set-Location npm-release-assets",
    "Get-Content SHA256SUMS.txt | ForEach-Object {",
    "  $hash, $file = $_ -split '  ', 2",
    '  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant() -ne $hash) { throw "Checksum mismatch: $file" }',
    "}",
    `npm login --registry ${NPM_REGISTRY}`,
    'if ($LASTEXITCODE -ne 0) { throw "npm login failed" }',
    ...manifest.packages.flatMap((entry) => [
      `npm publish .\\${entry.filename} --registry ${NPM_REGISTRY} --tag ${manifest.tag} --access public --ignore-scripts`,
      `if ($LASTEXITCODE -ne 0) { throw "npm publish failed: ${entry.name}; preserve assets for explicit resume" }`,
    ]),
    "# Stop on any failure; preserve all assets. Explicit resume verifies existing integrity first.",
    `# After all three packages are public, dispatch release-npm.yml verify-finalize for ${manifest.version} / ${manifest.source}.`,
    "",
  ].join("\n");
}

export function handoffAssets(manifest, tarballs) {
  validateManifest(manifest);
  const assets = new Map();
  for (const entry of manifest.packages) {
    const bytes = tarballs.get(entry.filename);
    if (
      !Buffer.isBuffer(bytes) ||
      bytes.length !== entry.size ||
      digests(bytes).sha256 !== entry.sha256 ||
      digests(bytes).integrity !== entry.integrity
    )
      throw new Error(`Missing or tampered npm tarball: ${entry.filename}.`);
    assets.set(entry.filename, bytes);
  }
  if (tarballs.size !== 3)
    throw new Error("Unexpected or duplicate package assets.");
  assets.set("release-manifest.json", manifestBytes(manifest));
  assets.set(
    "MAINTAINER-COMMANDS.ps1",
    Buffer.from(maintainerCommands(manifest)),
  );
  assets.set(
    "SHA256SUMS.txt",
    Buffer.from(
      [...assets]
        .map(([name, bytes]) => `${digests(bytes).sha256}  ${name}`)
        .join("\n") + "\n",
    ),
  );
  return assets;
}

export async function readHandoff(directory, expected) {
  const manifest = validateManifest(
    json(await readFile(path.join(directory, "release-manifest.json"))),
    expected,
  );
  const tarballs = new Map(
    await Promise.all(
      manifest.packages.map(async (entry) => [
        entry.filename,
        await boundedFile(path.join(directory, entry.filename)),
      ]),
    ),
  );
  const assets = handoffAssets(manifest, tarballs);
  if (
    JSON.stringify((await readdir(directory)).sort()) !==
    JSON.stringify([...assets.keys()].sort())
  )
    throw new Error(
      "Missing, duplicate or unexpected release asset inventory.",
    );
  for (const [name, bytes] of assets)
    if (!(await boundedFile(path.join(directory, name))).equals(bytes))
      throw new Error(`Release asset conflict: ${name}.`);
  return { manifest, assets };
}

async function boundedFile(filename) {
  if ((await stat(filename)).size > MAX_ASSET_BYTES)
    throw new Error(`Oversized release asset: ${filename}.`);
  return readFile(filename);
}

export async function inspectNpmTarball(filename, definition, version) {
  const contents = new Set();
  let expandedSize = 0;
  await list({
    file: filename,
    strict: true,
    onReadEntry: (entry) => {
      expandedSize += entry.size;
      if (
        !entry.path.startsWith("package/") ||
        entry.path.includes("\\") ||
        entry.path.split("/").some((part) => part === ".." || part === ".") ||
        contents.has(entry.path) ||
        !["File", "Directory"].includes(entry.type) ||
        expandedSize > 80_000_000 ||
        contents.size > 4000
      )
        throw new Error("Unsafe, duplicate or oversized npm tarball entry.");
      contents.add(entry.path);
    },
  });
  const root = await mkdtemp(path.join(tmpdir(), "sefaria-npm-inspect-"));
  try {
    await extract({ file: filename, cwd: root, strict: true });
    const directory = path.join(root, "package");
    const manifest = json(await readFile(path.join(directory, "package.json")));
    validatePackedPackage({
      definition,
      manifest,
      contents,
      published: true,
      customElements:
        definition.slug === "web-components"
          ? json(await readFile(path.join(directory, "custom-elements.json")))
          : undefined,
    });
    if (
      manifest.version !== version ||
      manifest.publishConfig?.registry !== NPM_REGISTRY ||
      manifest.publishConfig?.access !== "public" ||
      manifest.repository?.url !== `git+https://github.com/${REPOSITORY}.git`
    )
      throw new Error("npm tarball target, version or repository mismatch.");
    for (const target of exportTargets(manifest.exports))
      if (!target.startsWith("./dist/"))
        throw new Error("Non-built npm export.");
    const files = await listFiles(directory);
    if (
      files.some(
        (file) =>
          !/^(?:dist\/|package\.json$|README\.md$|LICENSE$|custom-elements\.json$)/.test(
            file,
          ),
      )
    )
      throw new Error("Unexpected npm package contents.");
    const browserFiles = {};
    for (const file of [
      definition.browserFile,
      "LICENSE.txt",
      "THIRD-PARTY-NOTICES.txt",
    ])
      browserFiles[file] = digests(
        await readFile(path.join(directory, "dist", "browser", file)),
      ).sha256;
    return { dependencies: manifest.dependencies ?? {}, browserFiles };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function prepareNpmAssets({
  version,
  source,
  directory = path.join(repository, ".artifacts", "npm-release"),
  requireConsumed = true,
}) {
  sourceShaSchema.parse(source);
  await readReleaseState(repository, version, { requireConsumed });
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    windowsHide: true,
    cwd: repository,
    encoding: "utf8",
  }).trim();
  if (head !== source)
    throw new Error("Reviewed source must equal the checked-out commit.");
  const staging = path.join(repository, ".artifacts", "npm-staging");
  await stagePublishPackages({ repository, destination: staging, version });
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length)
    throw new Error(
      "Preparation destination must be empty; never replace qualified assets.",
    );
  const packages = [];
  const tarballs = new Map();
  for (const definition of PACKAGE_DEFINITIONS) {
    // npm pack is offline and has no scripts or publishing credentials.
    runNpm(
      ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
      path.join(staging, definition.slug),
    );
    const filename = tarballFilename(definition, version);
    const bytes = await boundedFile(path.join(directory, filename));
    const inspection = await inspectNpmTarball(
      path.join(directory, filename),
      definition,
      version,
    );
    packages.push({
      name: definition.name,
      filename,
      size: bytes.length,
      ...digests(bytes),
      ...inspection,
    });
    tarballs.set(filename, bytes);
  }
  const manifest = validateManifest({
    schemaVersion: 1,
    repository: REPOSITORY,
    version,
    source,
    tag: releaseTag(version),
    packages,
  });
  for (const [filename, bytes] of handoffAssets(manifest, tarballs))
    await writeFile(path.join(directory, filename), bytes, {
      flag: filename.endsWith(".tgz") ? "w" : "wx",
    });
  await readHandoff(directory, { version, source });
  return manifest;
}

export function githubClient(token) {
  if (!token) throw new Error("GitHub workflow token is required.");
  const api = new Octokit({
    auth: token,
    retry: { enabled: false },
    throttle: { enabled: false },
  });
  api.hook.before("request", (options) => {
    options.request.signal = AbortSignal.timeout(60_000);
  });
  return api;
}

function absent(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

export async function verifySourceTag(
  api,
  manifest,
  { required = false } = {},
) {
  let ref;
  try {
    ref = z
      .object({
        object: z.object({ type: z.literal("commit"), sha: sourceShaSchema }),
      })
      .passthrough()
      .parse(
        (
          await api.git.getRef({
            owner,
            repo,
            ref: `tags/v${manifest.version}`,
          })
        ).data,
      );
  } catch (error) {
    if (!required && absent(error)) return;
    throw error;
  }
  if (ref.object.sha !== manifest.source)
    throw new Error("Release source tag conflicts; never move it.");
}

export async function findDraft(api, manifest) {
  const releases = await api.repos.listReleases({ owner, repo, per_page: 100 });
  const candidates = z
    .array(z.object({ tag_name: z.string() }).passthrough())
    .max(100)
    .parse(releases.data)
    .filter((release) => release.tag_name === `v${manifest.version}`);
  if (candidates.length > 1) throw new Error("Duplicate release identity.");
  if (releases.data.length === 100)
    throw new Error(
      "Release inventory exceeds bounded first page; require explicit inventory maintenance.",
    );
  if (!candidates.length) return undefined;
  const release = releaseSchema.parse(candidates[0]);
  if (
    release.target_commitish !== manifest.source ||
    release.prerelease !== (manifest.tag === "alpha")
  )
    throw new Error("Release source/version identity conflict.");
  return release;
}

async function downloadedAsset(api, asset) {
  const response = await api.repos.getReleaseAsset({
    owner,
    repo,
    asset_id: asset.id,
    headers: { accept: "application/octet-stream" },
  });
  const bytes = Buffer.from(response.data);
  if (bytes.length !== asset.size || bytes.length > MAX_ASSET_BYTES)
    throw new Error(`Downloaded asset size conflict: ${asset.name}.`);
  return bytes;
}

export async function verifyDraftAssets(
  api,
  release,
  assets,
  { complete = true } = {},
) {
  releaseSchema.parse(release);
  const names = new Set();
  for (const asset of release.assets) {
    if (names.has(asset.name) || !assets.has(asset.name))
      throw new Error(
        "Duplicate/unexpected asset; source archives are not npm packages.",
      );
    names.add(asset.name);
    const expected = assets.get(asset.name);
    if (
      asset.size !== expected.length ||
      !(await downloadedAsset(api, asset)).equals(expected)
    )
      throw new Error(`Tampered release asset: ${asset.name}.`);
  }
  if (complete && names.size !== assets.size)
    throw new Error("Missing qualified release assets.");
  return names;
}

export async function uploadDraft(api, { manifest, assets }) {
  await verifySourceTag(api, manifest);
  let release = await findDraft(api, manifest);
  if (!release) {
    release = releaseSchema.parse(
      (
        await api.repos.createRelease({
          owner,
          repo,
          tag_name: `v${manifest.version}`,
          target_commitish: manifest.source,
          name: `Sefaria toolkit ${manifest.version}`,
          draft: true,
          prerelease: manifest.tag === "alpha",
          make_latest: "false",
          body: "Qualified npm package assets. Publication and hosted CDN verification remain pending. Use MAINTAINER-COMMANDS.ps1, not source archives.",
        })
      ).data,
    );
  }
  const existing = await verifyDraftAssets(api, release, assets, {
    complete: !release.draft,
  });
  if (!release.draft) return release;
  for (const [name, bytes] of assets) {
    if (existing.has(name)) continue;
    await api.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.id,
      name,
      data: bytes,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": bytes.length,
      },
    });
  }
  const refreshed = releaseSchema.parse(
    (await api.repos.getRelease({ owner, repo, release_id: release.id })).data,
  );
  await verifyDraftAssets(api, refreshed, assets);
  return refreshed;
}

export async function captureDraft(api, { version, source, directory }) {
  releaseVersionSchema.parse(version);
  sourceShaSchema.parse(source);
  const identity = { version, source };
  const release = await findDraft(api, {
    ...identity,
    tag: releaseTag(version),
  });
  if (!release)
    throw new Error(
      "Qualified draft release is missing; publication cannot build a replacement.",
    );
  await verifySourceTag(api, identity);
  const manifestAssets = release.assets.filter(
    (asset) => asset.name === "release-manifest.json",
  );
  if (manifestAssets.length !== 1)
    throw new Error("Missing/duplicate release manifest.");
  const manifest = validateManifest(
    json(await downloadedAsset(api, manifestAssets[0])),
    identity,
  );
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length)
    throw new Error("Capture destination must be empty.");
  const tarballs = new Map();
  for (const entry of manifest.packages) {
    const matches = release.assets.filter(
      (asset) => asset.name === entry.filename,
    );
    if (matches.length !== 1)
      throw new Error("Missing/duplicate npm package assets.");
    tarballs.set(entry.filename, await downloadedAsset(api, matches[0]));
  }
  const assets = handoffAssets(manifest, tarballs);
  await verifyDraftAssets(api, release, assets);
  for (const [name, bytes] of assets)
    await writeFile(path.join(directory, name), bytes, { flag: "wx" });
  await readHandoff(directory, identity);
  return { manifest, assets, release };
}

const npmVersionSchema = z
  .object({
    name: z.string(),
    version: releaseVersionSchema,
    repository: z.object({ url: z.string() }).passthrough(),
    dependencies: dependenciesSchema.optional(),
    dist: z
      .object({ integrity: z.string(), tarball: z.string().url() })
      .passthrough(),
  })
  .passthrough();

export async function npmRecord(
  entry,
  manifest,
  { fetch = globalThis.fetch } = {},
) {
  const url = `${NPM_REGISTRY}/${entry.name.replace("/", "%2F")}/${manifest.version}`;
  const response = await fetch(url, {
    redirect: "error",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`npm metadata failed: ${response.status}.`);
  const record = npmVersionSchema.parse(
    json(await boundedResponse(response, MAX_JSON_BYTES)),
  );
  if (
    record.name !== entry.name ||
    record.version !== manifest.version ||
    record.repository.url !== `git+https://github.com/${REPOSITORY}.git` ||
    JSON.stringify(Object.entries(record.dependencies ?? {}).sort()) !==
      JSON.stringify(Object.entries(entry.dependencies).sort()) ||
    record.dist.integrity !== entry.integrity
  )
    throw new Error(`Existing npm version conflicts: ${entry.name}.`);
  const tarballUrl = new URL(record.dist.tarball);
  if (
    tarballUrl.origin !== NPM_REGISTRY ||
    tarballUrl.search ||
    tarballUrl.hash ||
    tarballUrl.pathname !==
      `/${entry.name}/-/${entry.filename.replace(/^sefaria-/, "")}`
  )
    throw new Error("Unexpected npm tarball location.");
  const tarball = await fetch(tarballUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(60_000),
  });
  if (!tarball.ok) throw new Error(`npm tarball failed: ${tarball.status}.`);
  const bytes = await boundedResponse(tarball, MAX_ASSET_BYTES);
  if (
    bytes.length !== entry.size ||
    digests(bytes).sha256 !== entry.sha256 ||
    digests(bytes).integrity !== entry.integrity
  )
    throw new Error(`npm tarball integrity conflicts: ${entry.name}.`);
  return record;
}

export async function boundedResponse(response, maximum) {
  if (Number(response.headers.get("content-length")) > maximum)
    throw new Error("Hosted response exceeds size limit.");
  if (!response.body) throw new Error("Hosted response has no body.");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximum) throw new Error("Hosted response exceeds size limit.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function publishCaptured({
  manifest,
  assets,
  directory,
  resume = false,
  fetch = globalThis.fetch,
  publish,
}) {
  handoffAssets(
    manifest,
    new Map(
      manifest.packages.map((entry) => [
        entry.filename,
        assets.get(entry.filename),
      ]),
    ),
  );
  const existing = [];
  // Preflight the entire set before performing the first irreversible publish.
  for (const entry of manifest.packages)
    existing.push(await npmRecord(entry, manifest, { fetch }));
  if (!resume && existing.some(Boolean))
    throw new Error(
      "Existing npm version requires explicit integrity-confirmed resume.",
    );
  for (const [index, entry] of manifest.packages.entries()) {
    if (existing[index]) continue;
    if (!publish)
      throw new Error("Explicit npm publishing operation is required.");
    await publish(entry, manifest, directory);
    if (!(await npmRecord(entry, manifest, { fetch })))
      throw new Error(`Published npm record is still absent: ${entry.name}.`);
  }
}

export async function verifyNpm({ manifest, fetch = globalThis.fetch }) {
  validateManifest(manifest);
  for (const entry of manifest.packages)
    if (!(await npmRecord(entry, manifest, { fetch })))
      throw new Error(`Incomplete npm release: ${entry.name}.`);
  // Dist-tags are separately checked, without assuming first-publication latest is absent.
  for (const entry of manifest.packages) {
    const response = await fetch(
      `${NPM_REGISTRY}/-/package/${entry.name}/dist-tags`,
      { redirect: "error", signal: AbortSignal.timeout(60_000) },
    );
    if (!response.ok)
      throw new Error(`npm dist-tags failed: ${response.status}.`);
    const tags = z
      .record(z.string(), z.string())
      .parse(json(await boundedResponse(response, MAX_JSON_BYTES)));
    if (tags[manifest.tag] !== manifest.version)
      throw new Error(`npm ${manifest.tag} tag mismatch: ${entry.name}.`);
  }
}

export async function finalizeDraft(
  api,
  captured,
  { verify = verifyNpm, consumer = verifyAnonymousConsumer } = {},
) {
  await verify(captured);
  await consumer(captured.manifest);
  await verifySourceTag(api, captured.manifest);
  const release = await findDraft(api, captured.manifest);
  if (!release) throw new Error("Release disappeared before finalization.");
  await verifyDraftAssets(api, release, captured.assets);
  if (!release.draft) return release;
  const finalized = releaseSchema.parse(
    (
      await api.repos.updateRelease({
        owner,
        repo,
        release_id: release.id,
        draft: false,
        prerelease: captured.manifest.tag === "alpha",
        make_latest: captured.manifest.tag === "alpha" ? "false" : "true",
        body: `Verified public npm release ${captured.manifest.version} from ${captured.manifest.source}. All three package records, dependencies, integrity and anonymous consumer passed. Hosted CDN qualification remains a separate gate.`,
      })
    ).data,
  );
  await verifySourceTag(api, captured.manifest, { required: true });
  await verifyDraftAssets(api, finalized, captured.assets);
  return finalized;
}

export async function verifyAnonymousConsumer(manifest) {
  validateManifest(manifest);
  const directory = await mkdtemp(
    path.join(tmpdir(), "sefaria-anonymous-npm-"),
  );
  try {
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: Object.fromEntries(
          manifest.packages.map((entry) => [entry.name, manifest.version]),
        ),
      }),
    );
    const configuredRegistry = runNpm(["config", "get", "registry"], repository)
      .toString("utf8")
      .trim();
    const dependencyRegistry = z.url().parse(configuredRegistry);
    const environment = { ...process.env };
    for (const key of Object.keys(environment))
      if (/token|^npm_config_/i.test(key)) delete environment[key];
    const npmrc = path.join(directory, ".npmrc");
    // Keep dependency-install proxies; only the explicit public toolkit scope targets npm.
    await writeFile(
      npmrc,
      `registry=${dependencyRegistry}\n@sefaria:registry=${NPM_REGISTRY}\n`,
    );
    environment.NPM_CONFIG_USERCONFIG = npmrc;
    runNpm(
      ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
      directory,
      environment,
    );
    const lock = z
      .object({
        packages: z.record(
          z.string(),
          z
            .object({
              version: z.string().optional(),
              resolved: z.string().optional(),
              integrity: z.string().optional(),
              link: z.boolean().optional(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .parse(json(await readFile(path.join(directory, "package-lock.json"))));
    for (const entry of manifest.packages) {
      const installed = lock.packages[`node_modules/${entry.name}`];
      if (
        installed?.version !== manifest.version ||
        installed.integrity !== entry.integrity ||
        installed.link ||
        !installed.resolved?.startsWith(`${NPM_REGISTRY}/${entry.name}/-/`)
      )
        throw new Error(
          `Anonymous consumer resolution conflict: ${entry.name}.`,
        );
    }
    const specifiers = PACKAGE_DEFINITIONS.flatMap((definition) =>
      definition.subpaths
        .filter(
          (subpath) =>
            !(definition.slug === "web-components" && subpath === "."),
        )
        .map((subpath) =>
          subpath === "."
            ? definition.name
            : `${definition.name}${subpath.slice(1)}`,
        ),
    );
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `await Promise.all(${JSON.stringify(specifiers)}.map(s=>import(s))); if ('customElements' in globalThis) throw Error('DOM registration leaked');`,
      ],
      { cwd: directory, env: environment, stdio: "pipe", windowsHide: true },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runNpm(args, cwd, env = process.env) {
  const command =
    process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const commandArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...args] : args;
  return execFileSync(command, commandArgs, {
    cwd,
    env,
    stdio: "pipe",
    windowsHide: true,
  });
}

export function requireOidcEnvironment(environment = process.env) {
  if (
    environment.GITHUB_REPOSITORY !== REPOSITORY ||
    environment.GITHUB_REF !== "refs/heads/main" ||
    environment.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    environment.GITHUB_WORKFLOW_REF !==
      `${REPOSITORY}/.github/workflows/release-npm.yml@refs/heads/main` ||
    !environment.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  )
    throw new Error("Approved main release-npm.yml OIDC identity is required.");
  for (const key of Object.keys(environment))
    if (
      /^(?:NODE_AUTH_TOKEN|NPM_TOKEN|NPM_AUTH_TOKEN|NPM_CONFIG_.*AUTH.*)$/i.test(
        key,
      ) &&
      environment[key]
    )
      throw new Error("Permanent or ambient npm credentials are forbidden.");
}

async function main() {
  const operation = process.argv[2];
  const version = releaseVersionSchema.parse(process.env.RELEASE_VERSION);
  const source = sourceShaSchema.parse(process.env.RELEASE_SOURCE);
  const directory = path.join(repository, ".artifacts", "npm-release");
  if (operation === "compare-platforms") {
    const platforms = path.join(repository, ".artifacts", "platforms");
    if (
      JSON.stringify((await readdir(platforms)).sort()) !==
      JSON.stringify(["qualified-npm-Linux", "qualified-npm-Windows"])
    )
      throw new Error(
        "Both complete platform qualification artifacts are required.",
      );
    const linux = await readHandoff(
      path.join(platforms, "qualified-npm-Linux"),
      { version, source },
    );
    const windows = await readHandoff(
      path.join(platforms, "qualified-npm-Windows"),
      { version, source },
    );
    for (const [name, bytes] of linux.assets)
      if (!windows.assets.get(name)?.equals(bytes))
        throw new Error(`Platform asset mismatch: ${name}.`);
    await mkdir(directory, { recursive: true });
    if ((await readdir(directory)).length)
      throw new Error("Qualified destination must be empty.");
    for (const [name, bytes] of linux.assets)
      await writeFile(path.join(directory, name), bytes, { flag: "wx" });
    return;
  }
  if (operation === "assert-source") {
    if (
      process.env.GITHUB_REF !== "refs/heads/main" ||
      process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      process.env.GITHUB_REPOSITORY !== REPOSITORY
    )
      throw new Error("Manual main-only Sefaria release required.");
    if (
      execFileSync("git", ["rev-parse", "HEAD"], {
        windowsHide: true,
        encoding: "utf8",
      }).trim() !== source ||
      execFileSync("git", ["rev-parse", "origin/main"], {
        windowsHide: true,
        encoding: "utf8",
      }).trim() !== source
    )
      throw new Error(
        "Release source must be the reviewed current main commit.",
      );
    await readReleaseState(repository, version);
    if (
      execFileSync("git", ["status", "--porcelain"], {
        windowsHide: true,
        encoding: "utf8",
      }).trim()
    )
      throw new Error("Reviewed release source must have a clean checkout.");
    return;
  }
  if (operation === "prepare") {
    await prepareNpmAssets({ version, source, directory });
    return;
  }
  if (operation === "capture") {
    await captureDraft(githubClient(process.env.GITHUB_TOKEN), {
      version,
      source,
      directory,
    });
    return;
  }
  const captured = await readHandoff(directory, { version, source });
  if (operation === "upload")
    await uploadDraft(githubClient(process.env.GITHUB_TOKEN), captured);
  else if (operation === "verify") {
    await verifyNpm(captured);
    await verifyAnonymousConsumer(captured.manifest);
  } else if (operation === "publish") {
    requireOidcEnvironment();
    await publishCaptured({
      ...captured,
      directory,
      resume: process.env.RELEASE_RESUME === "true",
      publish: async (entry, manifest, location) =>
        runNpm(
          [
            "publish",
            path.join(location, entry.filename),
            "--registry",
            NPM_REGISTRY,
            "--tag",
            manifest.tag,
            "--access",
            "public",
            "--provenance",
            "--ignore-scripts",
          ],
          repository,
        ),
    });
  } else if (operation === "finalize")
    await finalizeDraft(githubClient(process.env.GITHUB_TOKEN), captured);
  else throw new Error("Unsupported release operation.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
