import {
  validateProjectAssets,
  validateProjectSources,
  type ProjectAssets,
  type ProjectSources,
} from "./policy.js";

export const PROJECT_IDS = [
  "ref-label",
  "text-segment",
  "bilingual-segment",
  "source-card",
  "popup",
  "connections-panel",
  "reader",
] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];
export type FileKind = keyof ProjectSources;

export interface ProjectManifest {
  readonly id: ProjectId;
  readonly title: string;
  readonly summary: string;
  readonly coverage: string;
  readonly files: Readonly<Record<FileKind, string>>;
  readonly assets: readonly ProjectAssetDeclaration[];
  readonly sourceBaseUrl: string;
  readonly liveDemoUrl?: string;
}

export interface ProjectAssetDeclaration {
  readonly specifier: string;
  readonly path: string;
}

export interface PlaygroundProject {
  readonly manifest: ProjectManifest;
  readonly maintained: ProjectSources;
  readonly assets: ProjectAssets;
}

export interface ProjectCatalog {
  readonly projects: readonly PlaygroundProject[];
  readonly byId: ReadonlyMap<ProjectId, PlaygroundProject>;
}

export type ProjectSelection =
  | { readonly state: "selected"; readonly project: PlaygroundProject }
  | { readonly state: "invalid"; readonly requestedId: string };

const DEFAULT_PROJECT_ID: ProjectId = "source-card";
const fileKinds = ["html", "css", "javascript"] as const;

export function createProjectCatalog(
  manifestModules: Readonly<Record<string, unknown>>,
  fileModules: Readonly<Record<string, unknown>>,
): ProjectCatalog {
  const projects: PlaygroundProject[] = [];
  const byId = new Map<ProjectId, PlaygroundProject>();
  for (const [manifestPath, value] of Object.entries(manifestModules)) {
    const manifest = validateManifest(value, manifestPath);
    if (byId.has(manifest.id)) {
      throw new Error(`Duplicate playground project ID ${manifest.id}.`);
    }
    const directory = manifestPath.slice(0, manifestPath.lastIndexOf("/"));
    const maintained = Object.fromEntries(
      fileKinds.map((kind) => [
        kind,
        requireFile(fileModules, resolvePath(directory, manifest.files[kind])),
      ]),
    ) as unknown as ProjectSources;
    const assets: Record<string, string> = Object.create(null);
    for (const { specifier, path: assetPath } of manifest.assets) {
      if (Object.hasOwn(assets, specifier)) {
        throw new Error(
          `Duplicate playground asset specifier ${specifier} in ${manifest.id}.`,
        );
      }
      validateAssetSpecifier(specifier, manifest.id);
      assets[specifier] = requireFile(
        fileModules,
        resolvePath(directory, assetPath),
      );
    }
    const sourceFailure = validateProjectSources(maintained);
    if (sourceFailure !== undefined) {
      throw new Error(`${manifest.id}: ${sourceFailure}`);
    }
    const assetFailure = validateProjectAssets(assets);
    if (assetFailure !== undefined) {
      throw new Error(`${manifest.id}: ${assetFailure}`);
    }
    const project = Object.freeze({
      manifest,
      maintained: Object.freeze({ ...maintained }),
      assets: Object.freeze(assets),
    });
    projects.push(project);
    byId.set(manifest.id, project);
  }
  projects.sort(
    (left, right) =>
      PROJECT_IDS.indexOf(left.manifest.id) -
      PROJECT_IDS.indexOf(right.manifest.id),
  );
  if (
    projects.length !== PROJECT_IDS.length ||
    PROJECT_IDS.some((id) => !byId.has(id))
  ) {
    throw new Error(
      `Playground catalog must contain exactly ${PROJECT_IDS.join(", ")}.`,
    );
  }
  return Object.freeze({
    projects: Object.freeze(projects),
    byId,
  });
}

export function selectProject(
  catalog: ProjectCatalog,
  search: string,
): ProjectSelection {
  const requestedId = new URLSearchParams(search).get("project");
  if (requestedId === null || requestedId === "") {
    return {
      state: "selected",
      project: requireProject(catalog, DEFAULT_PROJECT_ID),
    };
  }
  const project = catalog.byId.get(requestedId as ProjectId);
  return project === undefined
    ? { state: "invalid", requestedId }
    : { state: "selected", project };
}

function validateManifest(
  value: unknown,
  manifestPath: string,
): ProjectManifest {
  if (!isRecord(value)) {
    throw new Error(`Invalid playground manifest ${manifestPath}.`);
  }
  const id = value.id;
  if (typeof id !== "string" || !PROJECT_IDS.includes(id as ProjectId)) {
    throw new Error(`Unsupported playground project ID ${String(id)}.`);
  }
  const files = value.files;
  if (
    !isRecord(files) ||
    Object.keys(files).sort().join(",") !== [...fileKinds].sort().join(",") ||
    fileKinds.some((kind) => typeof files[kind] !== "string")
  ) {
    throw new Error(
      `Playground project ${id} must declare exactly html, css, and javascript files.`,
    );
  }
  const assets = value.assets;
  if (!Array.isArray(assets)) {
    throw new Error(`Playground project ${id} has invalid assets.`);
  }
  const assetDeclarations: ProjectAssetDeclaration[] = [];
  const assetSpecifiers = new Set<string>();
  for (const asset of assets) {
    if (
      !isRecord(asset) ||
      typeof asset.specifier !== "string" ||
      typeof asset.path !== "string"
    ) {
      throw new Error(`Playground project ${id} has invalid assets.`);
    }
    validateAssetSpecifier(asset.specifier, id);
    if (assetSpecifiers.has(asset.specifier)) {
      throw new Error(
        `Duplicate playground asset specifier ${asset.specifier} in ${id}.`,
      );
    }
    assetSpecifiers.add(asset.specifier);
    assetDeclarations.push({
      specifier: asset.specifier,
      path: asset.path,
    });
  }
  for (const key of [
    "title",
    "summary",
    "coverage",
    "sourceBaseUrl",
  ] as const) {
    if (typeof value[key] !== "string" || value[key].trim() === "") {
      throw new Error(`Playground project ${id} has invalid ${key}.`);
    }
  }
  const title = value.title as string;
  const summary = value.summary as string;
  const coverage = value.coverage as string;
  const sourceBaseUrl = value.sourceBaseUrl as string;
  if (
    !sourceBaseUrl.startsWith(
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/",
    )
  ) {
    throw new Error(`Playground project ${id} has an invalid sourceBaseUrl.`);
  }
  if (
    value.liveDemoUrl !== undefined &&
    (typeof value.liveDemoUrl !== "string" ||
      !value.liveDemoUrl.startsWith("../"))
  ) {
    throw new Error(`Playground project ${id} has an invalid liveDemoUrl.`);
  }
  return Object.freeze({
    id: id as ProjectId,
    title,
    summary,
    coverage,
    files: Object.freeze({
      html: files.html as string,
      css: files.css as string,
      javascript: files.javascript as string,
    }),
    assets: Object.freeze(assetDeclarations),
    sourceBaseUrl,
    ...(value.liveDemoUrl === undefined
      ? {}
      : { liveDemoUrl: value.liveDemoUrl as string }),
  });
}

function requireProject(
  catalog: ProjectCatalog,
  id: ProjectId,
): PlaygroundProject {
  const project = catalog.byId.get(id);
  if (project === undefined) {
    throw new Error(`Missing default playground project ${id}.`);
  }
  return project;
}

function requireFile(
  modules: Readonly<Record<string, unknown>>,
  path: string,
): string {
  const value = modules[path];
  if (typeof value !== "string") {
    throw new Error(`Missing playground project file ${path}.`);
  }
  return value;
}

function validateAssetSpecifier(specifier: string, projectId: string): void {
  if (
    !specifier.startsWith("./") ||
    specifier.includes("\\") ||
    specifier.includes("..") ||
    /^[a-z][a-z\d+.-]*:/iu.test(specifier)
  ) {
    throw new Error(
      `Playground project ${projectId} has invalid asset specifier ${specifier}.`,
    );
  }
}

function resolvePath(directory: string, relativePath: string): string {
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    /^[a-z][a-z\d+.-]*:/iu.test(relativePath)
  ) {
    throw new Error(`Invalid playground project path ${relativePath}.`);
  }
  if (!directory.startsWith("../projects/")) {
    throw new Error(`Invalid playground project directory ${directory}.`);
  }
  const segments = directory.slice("../projects/".length).split("/");
  for (const segment of relativePath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) {
        throw new Error(
          `Playground project path escapes its root: ${relativePath}.`,
        );
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `../projects/${segments.join("/")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
