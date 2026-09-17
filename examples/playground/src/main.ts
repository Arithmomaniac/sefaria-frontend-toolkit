import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";

import previewBootstrapSource from "./preview-bootstrap.js?raw";
import {
  DIAGNOSTIC_COUNT_LIMIT,
  DIAGNOSTIC_TEXT_LIMIT,
  MESSAGE_SIZE_LIMIT,
  SOURCE_FILE_LIMIT,
} from "./limits.js";
import {
  canAcceptDiagnostic,
  canCreatePreview,
  isBoundedDiagnosticMessage,
  validateProjectAssets,
  validateProjectSources,
} from "./policy.js";
import { rewriteDeclaredAssets } from "./project-imports.js";
import {
  selectProject,
  type FileKind,
  type PlaygroundProject,
  type ProjectId,
} from "./project-catalog.js";
import { projectCatalog } from "./projects.js";
import "./style.css";

type DiagnosticCategory = "csp" | "import" | "runtime" | "syntax";
interface RuntimeGraph {
  readonly version: 1;
  readonly imports: Readonly<Record<string, string>>;
}
interface PreviewDiagnostic {
  readonly category: DiagnosticCategory;
  readonly message: string;
}

const STYLE_NONCE = "sefaria-playground-editor";
let activeProject: PlaygroundProject | undefined;
let drafts: Record<FileKind, string> | undefined;
let activeFile: FileKind = "html";
let activeFrame: HTMLIFrameElement | undefined;
let activeChannel = "";
let activeRun = "";
let diagnosticCount = 0;
let runtimeGraph: RuntimeGraph | undefined;

const editorHost = requireElement<HTMLElement>("#editor");
const previewHost = requireElement<HTMLElement>("#preview");
const previewStatus = requireElement<HTMLElement>("#preview-status");
const draftStatus = requireElement<HTMLElement>("#draft-status");
const diagnosticList = requireElement<HTMLOListElement>("#diagnostic-list");
const projectSelect = requireElement<HTMLSelectElement>("#project-select");
const projectTitle = requireElement<HTMLElement>("#project-title");
const projectSummary = requireElement<HTMLElement>("#project-summary");
const projectCoverage = requireElement<HTMLElement>("#project-coverage");
const projectError = requireElement<HTMLElement>("#project-error");
const sourceLink = requireElement<HTMLAnchorElement>("#source-link");
const liveLink = requireElement<HTMLAnchorElement>("#live-link");
const runButton = requireElement<HTMLButtonElement>("#run");
const resetButton = requireElement<HTMLButtonElement>("#reset");
const stopButton = requireElement<HTMLButtonElement>("#stop");
const copyButton = requireElement<HTMLButtonElement>("#copy");
const tabs = {
  html: requireElement<HTMLButtonElement>("#tab-html"),
  css: requireElement<HTMLButtonElement>("#tab-css"),
  javascript: requireElement<HTMLButtonElement>("#tab-javascript"),
};
const languages: Record<FileKind, Extension> = {
  html: html(),
  css: css(),
  javascript: javascript(),
};

let editor: EditorView | undefined;

for (const project of projectCatalog.projects) {
  const option = document.createElement("option");
  option.value = project.manifest.id;
  option.textContent = project.manifest.title;
  projectSelect.append(option);
}

for (const [kind, tab] of Object.entries(tabs) as [
  FileKind,
  HTMLButtonElement,
][]) {
  tab.addEventListener("click", () => selectFile(kind));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const order: FileKind[] = ["html", "css", "javascript"];
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next =
      order[(order.indexOf(kind) + direction + order.length) % order.length];
    if (next) {
      selectFile(next);
      tabs[next].focus();
    }
  });
}
runButton.addEventListener("click", () => void run());
resetButton.addEventListener("click", () => {
  if (!activeProject || !editor) return;
  drafts = { ...activeProject.maintained };
  editor.setState(createEditorState(activeFile));
  updateTabs();
  draftStatus.textContent = "Maintained source restored exactly.";
});
stopButton.addEventListener("click", () => stopPreview("Preview stopped."));
copyButton.addEventListener("click", () => void copyActiveFile());
window.addEventListener("message", receivePreviewMessage);
window.addEventListener("popstate", () => applyUrlSelection(true));
window.addEventListener("beforeunload", () => stopPreview(""));
projectSelect.addEventListener("change", () => {
  const project = projectCatalog.byId.get(projectSelect.value as ProjectId);
  if (project === undefined) return;
  const url = new URL(location.href);
  url.searchParams.set("project", project.manifest.id);
  history.pushState(null, "", url);
  activateProject(project);
  if (runtimeGraph !== undefined) void run();
});

applyUrlSelection(false);
void loadGraphAndRun();

async function loadGraphAndRun(): Promise<void> {
  try {
    const response = await fetch(
      new URL("runtime-graph.json", document.baseURI),
    );
    if (!response.ok)
      throw new Error(`Runtime graph returned HTTP ${response.status}.`);
    runtimeGraph = validateRuntimeGraph(await response.json());
    if (activeProject !== undefined) await run();
  } catch (error) {
    reportDiagnostic({ category: "import", message: errorMessage(error) });
    previewStatus.textContent = "Preview initialization failed.";
  }
}

function createEditorState(kind: FileKind): EditorState {
  const currentDrafts = requireDrafts();
  return EditorState.create({
    doc: currentDrafts[kind],
    extensions: [
      basicSetup,
      EditorView.cspNonce.of(STYLE_NONCE),
      EditorState.lineSeparator.of(
        currentDrafts[kind].includes("\r\n") ? "\r\n" : "\n",
      ),
      languages[kind],
      EditorState.transactionFilter.of((transaction) => {
        if (transaction.newDoc.length <= SOURCE_FILE_LIMIT) return transaction;
        draftStatus.textContent = `The ${kind} file is limited to ${SOURCE_FILE_LIMIT.toLocaleString()} characters.`;
        return [];
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        requireDrafts()[kind] = update.state.doc.toString();
        draftStatus.textContent = "Draft changed. Run to update the preview.";
      }),
      EditorView.theme({
        "&": { height: "30rem" },
        ".cm-scroller": { overflow: "auto" },
        "&.cm-focused": { outline: "3px solid #9a5d13", outlineOffset: "2px" },
      }),
    ],
  });
}

function selectFile(kind: FileKind): void {
  if (!editor) return;
  requireDrafts()[activeFile] = editor.state.doc.toString();
  activeFile = kind;
  editor.setState(createEditorState(kind));
  updateTabs();
}

function updateTabs(): void {
  const project = activeProject;
  for (const [kind, tab] of Object.entries(tabs) as [
    FileKind,
    HTMLButtonElement,
  ][]) {
    const selected = kind === activeFile;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.disabled = project === undefined;
  }
  if (project === undefined) return;
  editorHost.setAttribute("aria-labelledby", tabs[activeFile].id);
  sourceLink.href = `${project.manifest.sourceBaseUrl}${project.manifest.files[activeFile]}`;
}

async function run(): Promise<void> {
  const project = activeProject;
  if (!project || !editor) return;
  const currentDrafts = requireDrafts();
  currentDrafts[activeFile] = editor.state.doc.toString();
  clearDiagnostics();
  const limitFailure = validateProjectSources(currentDrafts);
  if (limitFailure) {
    reportDiagnostic({ category: "syntax", message: limitFailure });
    return;
  }
  const assetFailure = validateProjectAssets(project.assets);
  if (assetFailure) {
    reportDiagnostic({ category: "import", message: assetFailure });
    previewStatus.textContent =
      "Preview not run because project assets are invalid.";
    return;
  }
  const syntaxDiagnostics = collectSyntaxDiagnostics(currentDrafts);
  for (const diagnostic of syntaxDiagnostics) reportDiagnostic(diagnostic);
  if (syntaxDiagnostics.length > 0) {
    previewStatus.textContent =
      "Preview not run because the source has syntax errors.";
    return;
  }
  if (!runtimeGraph) {
    reportDiagnostic({
      category: "import",
      message: "The runtime graph is not ready.",
    });
    return;
  }
  try {
    const declaredAssets = Object.fromEntries(
      Object.entries(project.assets).map(([specifier, source]) => [
        specifier,
        toDataUrl(source),
      ]),
    );
    const javascriptWithAssets = rewriteDeclaredAssets(
      currentDrafts.javascript,
      declaredAssets,
    );
    await createPreview(
      { ...currentDrafts, javascript: javascriptWithAssets },
      runtimeGraph,
    );
  } catch (error) {
    reportDiagnostic({ category: "import", message: errorMessage(error) });
    previewStatus.textContent = "Preview import failed.";
  }
}

function collectSyntaxDiagnostics(
  files: Record<FileKind, string>,
): PreviewDiagnostic[] {
  const diagnostics: PreviewDiagnostic[] = [];
  for (const kind of ["html", "css", "javascript"] as const) {
    const state = EditorState.create({
      doc: files[kind],
      extensions: [languages[kind]],
    });
    syntaxTree(state).iterate({
      enter(node) {
        if (!node.type.isError || diagnostics.length >= DIAGNOSTIC_COUNT_LIMIT)
          return;
        diagnostics.push({
          category: "syntax",
          message: `${kind}:${state.doc.lineAt(node.from).number}: syntax error`,
        });
      },
    });
  }
  return diagnostics;
}

async function createPreview(
  files: Record<FileKind, string>,
  graph: RuntimeGraph,
): Promise<void> {
  stopPreview("");
  if (!canCreatePreview(previewHost.querySelectorAll("iframe").length)) {
    throw new Error("Only one active preview is allowed.");
  }
  activeChannel = crypto.randomUUID();
  activeRun = crypto.randomUUID();
  const channel = activeChannel;
  const run = activeRun;
  diagnosticCount = 0;
  const config = {
    channel,
    run,
    html: files.html,
    javascriptUrl: toDataUrl(files.javascript),
  };
  const importMap = JSON.stringify({ imports: graph.imports });
  const bootstrapUrl = toDataUrl(previewBootstrapSource);
  const emittedImportMap = escapeInline(importMap);
  const importMapHash = await sha256(emittedImportMap);
  if (activeChannel !== channel || activeRun !== run) return;
  const childPolicy = [
    "default-src 'none'",
    `script-src data: 'sha256-${importMapHash}'`,
    "style-src 'unsafe-inline'",
    "img-src data:",
    "font-src 'none'",
    "connect-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "media-src 'none'",
    "manifest-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
  const frame = document.createElement("iframe");
  frame.title = "Supplied-data component preview";
  frame.setAttribute("sandbox", "allow-scripts");
  const documentSource = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(childPolicy)}"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="importmap">${emittedImportMap}</script><style>${escapeStyle(files.css)}</style></head><body><div id="root"></div><script data-config="${escapeAttribute(JSON.stringify(config))}" src="${escapeAttribute(bootstrapUrl)}"></script></body></html>`;
  frame.src = `data:text/html;base64,${bytesToBase64(new TextEncoder().encode(documentSource))}`;
  activeFrame = frame;
  previewHost.replaceChildren(frame);
  previewStatus.textContent = "Running supplied-data preview.";
  draftStatus.textContent = "Current draft is running.";
}

function receivePreviewMessage(event: MessageEvent): void {
  if (event.source !== activeFrame?.contentWindow) return;
  if (event.origin !== "null") return;
  try {
    if (JSON.stringify(event.data).length > MESSAGE_SIZE_LIMIT) return;
  } catch {
    return;
  }
  if (
    !isRecord(event.data) ||
    event.data.channel !== activeChannel ||
    event.data.run !== activeRun
  )
    return;
  if (event.data.type === "sefaria-playground-ready") {
    previewStatus.textContent = "Preview rendered with supplied data.";
    return;
  }
  if (
    event.data.type !== "sefaria-playground-diagnostic" ||
    !canAcceptDiagnostic(diagnosticCount) ||
    !isBoundedDiagnosticMessage(event.data)
  )
    return;
  const value = event.data.diagnostic;
  if (
    !isRecord(value) ||
    !isCategory(value.category) ||
    typeof value.message !== "string"
  )
    return;
  reportDiagnostic({ category: value.category, message: value.message });
}

function reportDiagnostic(diagnostic: PreviewDiagnostic): void {
  if (diagnosticCount >= DIAGNOSTIC_COUNT_LIMIT) return;
  diagnosticCount += 1;
  const item = document.createElement("li");
  item.dataset.category = diagnostic.category;
  item.textContent = `${diagnostic.category}: ${diagnostic.message.slice(0, DIAGNOSTIC_TEXT_LIMIT)}`;
  diagnosticList.append(item);
}

function clearDiagnostics(): void {
  diagnosticCount = 0;
  diagnosticList.replaceChildren();
}

function stopPreview(message: string): void {
  activeFrame?.remove();
  activeFrame = undefined;
  activeChannel = "";
  activeRun = "";
  if (message) previewStatus.textContent = message;
}

async function copyActiveFile(): Promise<void> {
  try {
    await navigator.clipboard.writeText(requireDrafts()[activeFile]);
    draftStatus.textContent = `${activeFile} copied.`;
  } catch (error) {
    draftStatus.textContent = `Copy failed: ${errorMessage(error)}`;
  }
}

function applyUrlSelection(runAfterSelection: boolean): void {
  const selection = selectProject(projectCatalog, location.search);
  if (selection.state === "invalid") {
    showInvalidProject(selection.requestedId);
    return;
  }
  activateProject(selection.project);
  if (runAfterSelection && runtimeGraph !== undefined) void run();
}

function activateProject(project: PlaygroundProject): void {
  stopPreview("");
  editor?.destroy();
  editorHost.replaceChildren();
  activeProject = project;
  drafts = { ...project.maintained };
  activeFile = "html";
  projectSelect.value = project.manifest.id;
  projectTitle.textContent = project.manifest.title;
  projectSummary.textContent = project.manifest.summary;
  projectCoverage.textContent = project.manifest.coverage;
  projectError.hidden = true;
  sourceLink.hidden = false;
  if (project.manifest.liveDemoUrl === undefined) {
    liveLink.hidden = true;
    liveLink.removeAttribute("href");
  } else {
    liveLink.hidden = false;
    liveLink.href = project.manifest.liveDemoUrl;
  }
  for (const button of [runButton, resetButton, stopButton, copyButton]) {
    button.disabled = false;
  }
  editor = new EditorView({
    state: createEditorState(activeFile),
    parent: editorHost,
  });
  updateTabs();
  draftStatus.textContent = "Maintained source loaded.";
  previewStatus.textContent = "Preparing preview.";
  clearDiagnostics();
}

function showInvalidProject(requestedId: string): void {
  stopPreview("");
  editor?.destroy();
  editor = undefined;
  editorHost.replaceChildren();
  activeProject = undefined;
  drafts = undefined;
  projectSelect.value = "";
  projectTitle.textContent = "Choose a maintained project";
  projectSummary.textContent =
    "The requested project is not part of this editor catalog.";
  projectCoverage.textContent = "No project source has been executed.";
  projectError.hidden = false;
  projectError.textContent = `Unknown project "${requestedId}". Choose a maintained project to continue.`;
  sourceLink.hidden = true;
  liveLink.hidden = true;
  liveLink.removeAttribute("href");
  for (const button of [runButton, resetButton, stopButton, copyButton]) {
    button.disabled = true;
  }
  updateTabs();
  draftStatus.textContent = "Invalid project. No source loaded.";
  previewStatus.textContent = "No preview is running.";
  clearDiagnostics();
}

function requireDrafts(): Record<FileKind, string> {
  if (drafts === undefined) {
    throw new Error("No playground project is selected.");
  }
  return drafts;
}

function validateRuntimeGraph(value: unknown): RuntimeGraph {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.imports)) {
    throw new Error("The runtime graph has an invalid shape.");
  }
  for (const [specifier, url] of Object.entries(value.imports)) {
    if (
      !specifier ||
      typeof url !== "string" ||
      !url.startsWith("data:text/javascript;base64,")
    ) {
      throw new Error(
        `The runtime graph contains an invalid entry for ${specifier || "(empty)"}.`,
      );
    }
  }
  return value as unknown as RuntimeGraph;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToBase64(new Uint8Array(digest));
}

function toDataUrl(value: string): string {
  return `data:text/javascript;base64,${bytesToBase64(new TextEncoder().encode(value))}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function escapeInline(value: string): string {
  return value.replaceAll("<", "\\u003c");
}

function escapeStyle(value: string): string {
  return value.replaceAll("</style", "<\\/style");
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function isCategory(value: unknown): value is DiagnosticCategory {
  return (
    value === "csp" ||
    value === "import" ||
    value === "runtime" ||
    value === "syntax"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`The playground requires ${selector}.`);
  return element;
}
