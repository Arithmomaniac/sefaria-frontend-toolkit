import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const NPM_REGISTRY = "https://registry.npmjs.org";
export const REPOSITORY = "Sefaria/sefaria-frontend-toolkit";
export const PACKAGE_DEFINITIONS = [
  {
    name: "@sefaria/api-client",
    browserFile: "sefaria-api-client.js",
    slug: "client",
    directory: "packages/client",
    subpaths: [
      ".",
      "./client",
      "./contracts",
      "./errors",
      "./schemas",
      "./validation",
      "./validators",
    ],
  },
  {
    name: "@sefaria/text-transform",
    browserFile: "sefaria-text-transform.js",
    slug: "text-transform",
    directory: "packages/text-transform",
    subpaths: ["."],
  },
  {
    name: "@sefaria/web-components",
    browserFile: "sefaria-elements.js",
    slug: "web-components",
    directory: "packages/web-components",
    subpaths: [
      ".",
      "./data-source",
      "./bilingual-segment",
      "./connections-panel",
      "./reader",
      "./reader-session",
      "./source-card",
      "./text-segment",
    ],
  },
];

export const releaseVersionSchema = z
  .string()
  .max(64)
  .regex(
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-alpha\.(?:0|[1-9]\d*))?$/,
  );
export const sourceShaSchema = z.string().regex(/^[a-f0-9]{40}$/);

export function releaseTag(version) {
  releaseVersionSchema.parse(version);
  return version.includes("-alpha.") ? "alpha" : "latest";
}

export function tarballFilename(definition, version) {
  releaseVersionSchema.parse(version);
  return `${definition.name.slice(1).replace("/", "-")}-${version}.tgz`;
}

export function createPublishManifest({ definition, sourceManifest, version }) {
  releaseVersionSchema.parse(version);
  if (
    sourceManifest.name !== definition.name ||
    sourceManifest.private !== true ||
    sourceManifest.version !== version
  )
    throw new Error(
      `${definition.name} must match the private reviewed source version.`,
    );
  const dependencies = { ...sourceManifest.dependencies };
  for (const internal of PACKAGE_DEFINITIONS) {
    if (dependencies[internal.name] === undefined) continue;
    if (dependencies[internal.name] !== "workspace:*")
      throw new Error(
        `${definition.name} must retain workspace:* for ${internal.name}.`,
      );
    dependencies[internal.name] = version;
  }
  return {
    ...sourceManifest,
    private: false,
    dependencies,
    publishConfig: { access: "public", registry: NPM_REGISTRY },
  };
}

export async function readReleaseState(
  repository,
  version,
  { requireConsumed = true } = {},
) {
  releaseVersionSchema.parse(version);
  const manifests = await Promise.all(
    PACKAGE_DEFINITIONS.map(async (definition) =>
      JSON.parse(
        await readFile(
          path.join(repository, definition.directory, "package.json"),
          "utf8",
        ),
      ),
    ),
  );
  for (const [index, manifest] of manifests.entries())
    createPublishManifest({
      definition: PACKAGE_DEFINITIONS[index],
      sourceManifest: manifest,
      version,
    });
  if (!requireConsumed) return manifests;
  if (version.includes("-alpha.")) {
    const pre = z
      .object({
        mode: z.literal("pre"),
        tag: z.literal("alpha"),
      })
      .passthrough()
      .parse(
        JSON.parse(
          await readFile(
            path.join(repository, ".changeset", "pre.json"),
            "utf8",
          ),
        ),
      );
    const pending = (await readdir(path.join(repository, ".changeset"))).filter(
      (file) => file.endsWith(".md") && file !== "README.md",
    );
    if (pre.mode !== "pre" || pending.length)
      throw new Error(
        "Unversioned Changesets remain; prepare a reviewed version first.",
      );
  } else {
    const files = await readdir(path.join(repository, ".changeset"));
    if (
      files.includes("pre.json") ||
      files.some((file) => file.endsWith(".md") && file !== "README.md")
    )
      throw new Error(
        "Stable release requires consumed Changesets and exited prerelease state.",
      );
  }
  return manifests;
}

export async function stagePublishPackages({
  repository,
  destination,
  version,
}) {
  releaseVersionSchema.parse(version);
  if (
    !path
      .resolve(destination)
      .startsWith(`${path.resolve(repository)}${path.sep}.artifacts${path.sep}`)
  )
    throw new Error("Release staging must stay within repository .artifacts.");
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const definition of PACKAGE_DEFINITIONS) {
    const source = path.join(repository, definition.directory);
    const staged = path.join(destination, definition.slug);
    const sourceManifest = JSON.parse(
      await readFile(path.join(source, "package.json"), "utf8"),
    );
    const manifest = createPublishManifest({
      definition,
      sourceManifest,
      version,
    });
    await mkdir(staged);
    await cp(path.join(source, "dist"), path.join(staged, "dist"), {
      recursive: true,
    });
    await rm(path.join(staged, "dist", ".tsbuildinfo"), { force: true });
    await Promise.all([
      cp(path.join(source, "README.md"), path.join(staged, "README.md")),
      cp(path.join(repository, "LICENSE"), path.join(staged, "LICENSE")),
      writeFile(
        path.join(staged, "package.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      ),
      ...(definition.slug === "web-components"
        ? [
            cp(
              path.join(source, "custom-elements.json"),
              path.join(staged, "custom-elements.json"),
            ),
          ]
        : []),
    ]);
    const files = await listFiles(staged);
    if (
      files.some((file) =>
        /(?:^src\/|\.tsbuildinfo$|\.(?:js|d\.ts)\.map$|\.test\.(?:js|d\.ts)$)/.test(
          file,
        ),
      )
    )
      throw new Error(
        `${definition.name} contains excluded source/build files.`,
      );
    for (const target of exportTargets(manifest.exports))
      if (!target.startsWith("./dist/") || !files.includes(target.slice(2)))
        throw new Error(
          `${definition.name} has an invalid or missing export ${target}.`,
        );
    for (const file of [
      definition.browserFile,
      "LICENSE.txt",
      "THIRD-PARTY-NOTICES.txt",
    ])
      if (!files.includes(`dist/browser/${file}`))
        throw new Error(`${definition.name} lacks browser file ${file}.`);
  }
}

export async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error(`Symlink in package: ${entry.name}.`);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relative)),
      );
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported package file: ${relative}.`);
  }
  return files.sort();
}

export function exportTargets(value) {
  if (typeof value === "string") return [value];
  return Object.values(value ?? {}).flatMap(exportTargets);
}
