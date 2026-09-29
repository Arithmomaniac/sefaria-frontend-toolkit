import { Buffer } from "node:buffer";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  stat,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { gunzipSync } from "node:zlib";
import { Octokit } from "@octokit/rest";
import { create, list, extract } from "tar";
import { z } from "zod";

import {
  SCRIPT_FILES,
  sha256,
  verifyScriptSource,
} from "./build-script-source.mjs";
import { isMainModule } from "./check.mjs";

const positive = z.string().regex(/^[1-9]\d*$/u);
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const releaseSchema = z
  .strictObject({
    version: z.string().regex(/^0\.0\.0-alpha\.[1-9]\d*\.[1-9]\d*$/u),
    sourceSha: z.string().regex(/^[a-f0-9]{40}$/u),
    runId: positive,
    runNumber: positive,
    runAttempt: positive,
    assetId: z.number().int().positive(),
    archiveHash: hash,
    state: z.enum(["active", "retired"]),
  })
  .refine(
    (entry) =>
      entry.version === `0.0.0-alpha.${entry.runId}.${entry.runAttempt}`,
    { path: ["version"], message: "Version must match producer identity." },
  );
const catalogSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    releases: z.array(releaseSchema),
  })
  .refine(
    (catalog) =>
      new Set(catalog.releases.map((entry) => entry.version)).size ===
      catalog.releases.length,
    { path: ["releases"], message: "Duplicate version." },
  );
const archiveFiles = [...SCRIPT_FILES, "manifest.json"];
const catalogBranch = "script-distribution";
const maxArchiveBytes = 64 * 1024 * 1024;

export const validateCatalog = (input) => catalogSchema.parse(input);
const order = (left, right) => {
  for (const key of ["runNumber", "runAttempt"]) {
    if (BigInt(left[key]) !== BigInt(right[key]))
      return BigInt(left[key]) < BigInt(right[key]) ? -1 : 1;
  }
  return left.version.localeCompare(right.version);
};

export function admitRelease(input, candidate) {
  const catalog = validateCatalog(input);
  const record = releaseSchema.parse(candidate);
  const previous = catalog.releases.find(
    (entry) => entry.version === record.version,
  );
  if (previous?.state === "retired")
    throw new Error(`Version is retired: ${record.version}.`);
  if (previous && JSON.stringify(previous) !== JSON.stringify(record))
    throw new Error(`Version is immutable: ${record.version}.`);
  return validateCatalog({
    schemaVersion: 1,
    releases: previous
      ? catalog.releases
      : [...catalog.releases, record].sort(order),
  });
}

export function retireRelease(input, version) {
  const catalog = validateCatalog(input);
  if (!catalog.releases.some((entry) => entry.version === version))
    throw new Error(`Unknown retirement version: ${version}.`);
  return validateCatalog({
    schemaVersion: 1,
    releases: catalog.releases.map((entry) =>
      entry.version === version ? { ...entry, state: "retired" } : entry,
    ),
  });
}

export async function packArtifact(directory, filename) {
  await verifyScriptSource(directory);
  await create(
    {
      cwd: directory,
      file: filename,
      gzip: true,
      portable: true,
      mtime: new Date(0),
    },
    archiveFiles,
  );
  return readFile(filename);
}

export async function unpackArtifact(bytes, record, destination) {
  if (bytes.length > maxArchiveBytes || sha256(bytes) !== record.archiveHash)
    throw new Error(`Archive hash/size mismatch: ${record.version}.`);
  const temporary = await mkdtemp(path.join(tmpdir(), "script-archive-"));
  try {
    const filename = path.join(temporary, "artifact.tar");
    await writeFile(
      filename,
      gunzipSync(bytes, { maxOutputLength: maxArchiveBytes }),
    );
    const entries = [];
    await list({
      file: filename,
      strict: true,
      onReadEntry: (entry) =>
        entries.push({ name: entry.path, type: entry.type }),
    });
    if (
      entries.some((entry) => entry.type !== "File") ||
      JSON.stringify(entries.map((entry) => entry.name).sort()) !==
        JSON.stringify([...archiveFiles].sort())
    ) {
      throw new Error(`Unsafe archive inventory: ${record.version}.`);
    }
    await mkdir(destination, { recursive: true });
    await extract({
      cwd: destination,
      file: filename,
      strict: true,
      preservePaths: false,
    });
    const manifest = await verifyScriptSource(destination);
    if (
      manifest.version !== record.version ||
      manifest.sourceSha !== record.sourceSha
    )
      throw new Error(`Archive provenance mismatch: ${record.version}.`);
    return manifest;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const REPOSITORY = "https://github.com/Arithmomaniac/sefaria-frontend-toolkit";
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Renders the hosted script-tag versions index (EP6) from the catalog. */
export function renderVersionsIndex(input) {
  const catalog = validateCatalog(input);
  const newestFirst = [...catalog.releases].sort(order).reverse();
  const alpha = newestFirst.find((entry) => entry.state === "active");
  const rows = newestFirst.map((entry) => {
    const commit = `<a href="${REPOSITORY}/commit/${entry.sourceSha}"><code>${entry.sourceSha.slice(0, 7)}</code></a>`;
    const address =
      entry.state === "active"
        ? `<code>${escapeHtml(entry.version)}/sefaria-elements.js</code>`
        : "Retired; no longer served";
    const marker = entry === alpha ? " (current <code>alpha</code>)" : "";
    return `      <tr><td><code>${escapeHtml(entry.version)}</code>${marker}</td><td>${commit}</td><td>${address}</td></tr>`;
  });
  const alphaSentence = alpha
    ? `<code>alpha/sefaria-elements.js</code> currently serves <code>${escapeHtml(alpha.version)}</code>.`
    : "No version is being served as <code>alpha</code> right now.";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Script-tag versions · Sefaria Frontend Toolkit</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 48rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #ccc; padding: 0.4rem; text-align: left; vertical-align: top; }
      .status { border-left: 4px solid #b58100; padding: 0.5rem 0.75rem; background: #fff8e1; color: #3b2f00; }
    </style>
  </head>
  <body>
    <h1>Script-tag versions</h1>
    <p class="status"><strong>Experimental and unofficial.</strong> Names and addresses may change.</p>
    <p>This directory hosts the Sefaria Frontend Toolkit's elements as one script file, <code>sefaria-elements.js</code>, that you add to a page with a <code>&lt;script type="module"&gt;</code> tag. To put your first source on a page, see <a href="../use-components/start-here.html">Use components › Start here</a>.</p>
    <h2>Choose an address</h2>
    <ul>
      <li><strong><code>alpha/sefaria-elements.js</code></strong> points to the newest active version each time the site is deployed, so it can change without warning. ${alphaSentence}</li>
      <li><strong>A pinned version</strong>, such as <code>${escapeHtml(alpha?.version ?? "0.0.0-alpha.1.1")}/sefaria-elements.js</code>, stays byte-for-byte the same while it's listed as active here. A pinned version may be retired without notice. A retired version is removed the next time the site is deployed, though caches may keep serving it for a while.</li>
      <li><strong>Your own copy.</strong> To avoid both risks, download a version and serve it from your own site, or install the packages instead. <a href="../help/install-and-status.html">Install and status</a> compares the routes.</li>
    </ul>
    <p>Each version keeps its own behavior. An older version can still include the removed Popup element and lack attributes added since. The site's reference pages describe the newest code; <a href="../reference/package-imports-and-exports.html">Package imports and exports</a> lists the package names.</p>
    <h2>Versions</h2>
    <p>Newest first. Each directory also holds the version's <code>manifest.json</code>, <code>LICENSE.txt</code>, <code>THIRD-PARTY-NOTICES.txt</code> and <code>source.tar.gz</code>. <a href="catalog.json">catalog.json</a> has the same list as data.</p>
    <table>
      <thead><tr><th>Version</th><th>Source commit</th><th>Address in this directory</th></tr></thead>
      <tbody>
${rows.join("\n") || '      <tr><td colspan="3">No versions yet.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>
`;
}

export async function assembleScripts({
  catalog: input,
  destination,
  download,
}) {
  if (path.basename(destination) !== "cdn")
    throw new Error("Script assembly owns only a directory named cdn.");
  const catalog = validateCatalog(input);
  const staging = await mkdtemp(path.join(tmpdir(), "script-assembly-"));
  const active = catalog.releases
    .filter((entry) => entry.state === "active")
    .sort(order);
  try {
    for (const record of active) {
      await unpackArtifact(
        await download(record),
        record,
        path.join(staging, record.version),
      );
    }
    const latest = active.at(-1);
    if (latest)
      await cp(
        path.join(staging, latest.version),
        path.join(staging, "alpha"),
        { recursive: true },
      );
    await writeFile(
      path.join(staging, "catalog.json"),
      `${JSON.stringify({ ...catalog, alpha: latest?.version ?? null }, null, 2)}\n`,
    );
    await writeFile(
      path.join(staging, "index.html"),
      renderVersionsIndex(catalog),
    );
    // Only replace the owned cdn directory after every retained artifact is verified.
    await rm(destination, { recursive: true, force: true });
    await cp(staging, destination, { recursive: true });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export function createGithubClient({
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  fetch: fetchRequest = globalThis.fetch,
  timeoutMs = 60_000,
} = {}) {
  if (!repository || !/^[\w.-]+\/[\w.-]+$/u.test(repository))
    throw new Error("GITHUB_REPOSITORY is required.");
  const [owner, repo] = repository.split("/");
  if (!token) throw new Error("GITHUB_TOKEN is required.");
  return {
    api: new Octokit({
      auth: token,
      request: {
        fetch: (url, options) => {
          const deadline = globalThis.AbortSignal.timeout(timeoutMs);
          const signal = options?.signal
            ? globalThis.AbortSignal.any([options.signal, deadline])
            : deadline;
          return fetchRequest(url, { ...options, signal });
        },
      },
    }),
    owner,
    repo,
  };
}

export async function assertSiteSize(directory, limit = 1_000_000_000) {
  if (!Number.isSafeInteger(limit) || limit <= 0)
    throw new Error("Invalid site byte limit.");
  const pending = [directory];
  const versions = new Map();
  let bytes = 0;
  while (pending.length) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(filename);
      } else if (entry.isFile()) {
        const size = (await stat(filename)).size;
        bytes += size;
        const [first, version] = path
          .relative(directory, filename)
          .split(path.sep);
        if (
          first === "cdn" &&
          /^0\.0\.0-alpha\.\d+\.\d+$/u.test(version ?? "")
        ) {
          versions.set(version, (versions.get(version) ?? 0) + size);
        }
      } else {
        throw new Error(`Unsupported site filesystem entry: ${filename}.`);
      }
    }
  }
  if (bytes > limit) {
    const candidates = [...versions]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([version, size]) => `${version} (${size} bytes)`);
    throw new Error(
      `Pages site is ${bytes} bytes; limit is ${limit} bytes. No versions were retired. Review documentation assets or explicitly retire retained versions. Largest candidates: ${candidates.join(", ") || "none"}.`,
    );
  }
  return bytes;
}

export async function readCatalog(client, initialize = false) {
  const { api, owner, repo } = client;
  let head;
  try {
    head = (
      await api.git.getRef({ owner, repo, ref: `heads/${catalogBranch}` })
    ).data.object.sha;
  } catch (error) {
    if (!initialize || error.status !== 404) throw error;
    const releases = await api.paginate(api.repos.listReleases, {
      owner,
      repo,
      per_page: 100,
    });
    if (releases.some((release) => release.tag_name.startsWith("script-")))
      throw new Error(
        "Missing catalog for existing script releases; restore it, do not reinitialize.",
        { cause: error },
      );
    const initial = { schemaVersion: 1, releases: [] };
    const tree = await api.git.createTree({
      owner,
      repo,
      tree: [
        {
          path: "catalog.json",
          mode: "100644",
          type: "blob",
          content: `${JSON.stringify(initial, null, 2)}\n`,
        },
      ],
    });
    const commit = await api.git.createCommit({
      owner,
      repo,
      message: "Initialize script retention catalog",
      tree: tree.data.sha,
      parents: [],
    });
    await api.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${catalogBranch}`,
      sha: commit.data.sha,
    });
    head = commit.data.sha;
  }
  const file = (
    await api.repos.getContent({ owner, repo, path: "catalog.json", ref: head })
  ).data;
  if (!("content" in file) || file.encoding !== "base64")
    throw new Error("Invalid catalog file response.");
  return {
    head,
    catalog: validateCatalog(
      JSON.parse(Buffer.from(file.content, "base64").toString("utf8")),
    ),
  };
}

export async function writeCatalog(client, snapshot, catalog) {
  const { api, owner, repo } = client;
  const tree = await api.git.createTree({
    owner,
    repo,
    tree: [
      {
        path: "catalog.json",
        mode: "100644",
        type: "blob",
        content: `${JSON.stringify(validateCatalog(catalog), null, 2)}\n`,
      },
    ],
  });
  const commit = await api.git.createCommit({
    owner,
    repo,
    message: "Update script retention catalog",
    tree: tree.data.sha,
    parents: [snapshot.head],
  });
  // A divergent concurrent commit makes this non-fast-forward update fail.
  await api.git.updateRef({
    owner,
    repo,
    ref: `heads/${catalogBranch}`,
    sha: commit.data.sha,
    force: false,
  });
}

async function downloadArtifact(client, record) {
  const response = await client.api.repos.getReleaseAsset({
    owner: client.owner,
    repo: client.repo,
    asset_id: record.assetId,
    headers: { accept: "application/octet-stream" },
  });
  if (
    !(response.data instanceof ArrayBuffer) &&
    !Buffer.isBuffer(response.data)
  )
    throw new Error("Expected binary release asset.");
  return Buffer.from(response.data);
}

async function publish(client, directory) {
  const manifest = await verifyScriptSource(directory);
  const runId = positive.parse(process.env.GITHUB_RUN_ID);
  const runAttempt = positive.parse(manifest.version.split(".").at(-1));
  const currentAttempt = positive.parse(process.env.GITHUB_RUN_ATTEMPT);
  const runNumber = positive.parse(process.env.GITHUB_RUN_NUMBER);
  if (
    manifest.version !== process.env.SCRIPT_VERSION ||
    manifest.version !== `0.0.0-alpha.${runId}.${runAttempt}` ||
    BigInt(runAttempt) > BigInt(currentAttempt) ||
    manifest.sourceSha !== process.env.GITHUB_SHA ||
    process.env.GITHUB_EVENT_NAME !== "push" ||
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw new Error(
      "Script publication requires the matching main push producer.",
    );
  const snapshot = await readCatalog(client, true);
  const existing = snapshot.catalog.releases.find(
    (entry) => entry.version === manifest.version,
  );
  if (existing?.state === "retired")
    throw new Error("Cannot publish a retired version.");
  const { api, owner, repo } = client;
  const tag = `script-${manifest.version}`;
  let release;
  try {
    release = (await api.repos.getReleaseByTag({ owner, repo, tag })).data;
  } catch (error) {
    if (error.status !== 404) throw error;
    const releases = await api.paginate(api.repos.listReleases, {
      owner,
      repo,
      per_page: 100,
    });
    release =
      releases.find((entry) => entry.tag_name === tag) ??
      (
        await api.repos.createRelease({
          owner,
          repo,
          tag_name: tag,
          target_commitish: manifest.sourceSha,
          name: tag,
          draft: true,
          prerelease: true,
          body: "Browser script artifact and corresponding source. Names and URLs may change. Retained versioned bytes are immutable; script URLs may be retired without notice.",
        })
      ).data;
  }
  const temporary = await mkdtemp(path.join(tmpdir(), "script-publish-"));
  try {
    const bytes = await packArtifact(
      directory,
      path.join(temporary, "script.tar.gz"),
    );
    const assetName = "script.tar.gz";
    const assets = await api.paginate(api.repos.listReleaseAssets, {
      owner,
      repo,
      release_id: release.id,
      per_page: 100,
    });
    let asset = assets.find((entry) => entry.name === assetName);
    if (!asset)
      asset = (
        await api.repos.uploadReleaseAsset({
          owner,
          repo,
          release_id: release.id,
          name: assetName,
          data: bytes,
          headers: { "content-type": "application/gzip" },
        })
      ).data;
    const record = {
      version: manifest.version,
      sourceSha: manifest.sourceSha,
      runId,
      runNumber,
      runAttempt,
      assetId: asset.id,
      archiveHash: sha256(bytes),
      state: "active",
    };
    await unpackArtifact(
      await downloadArtifact(client, record),
      record,
      path.join(temporary, "verified"),
    );
    if (release.draft)
      await api.repos.updateRelease({
        owner,
        repo,
        release_id: release.id,
        draft: false,
      });
    await writeCatalog(
      client,
      snapshot,
      admitRelease(snapshot.catalog, record),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const client = createGithubClient();
  const command = process.argv[2];
  if (command === "publish") {
    await publish(client, path.resolve("dist", "script-source"));
  } else if (command === "restore") {
    const snapshot = await readCatalog(client);
    await assembleScripts({
      catalog: snapshot.catalog,
      destination: path.resolve("dist", "site", "cdn"),
      download: (record) => downloadArtifact(client, record),
    });
    const bytes = await assertSiteSize(path.resolve("dist", "site"));
    process.stdout.write(
      `Restored Pages site: ${bytes} bytes (limit 1000000000).\n`,
    );
    const current = await readCatalog(client);
    if (current.head !== snapshot.head)
      throw new Error(
        "Catalog changed during assembly; redeploy from a fresh snapshot.",
      );
  } else if (command === "retire") {
    if (
      process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      process.env.GITHUB_REF !== "refs/heads/main"
    )
      throw new Error("Retirement requires a manual main dispatch.");
    const snapshot = await readCatalog(client);
    await writeCatalog(
      client,
      snapshot,
      retireRelease(snapshot.catalog, process.env.RETIRE_VERSION),
    );
  } else {
    throw new Error("Expected publish, restore, or retire.");
  }
}
