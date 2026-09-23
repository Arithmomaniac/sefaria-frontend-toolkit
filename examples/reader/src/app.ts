import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";
import {
  createSefariaReaderDataSource,
  resolveReaderSource,
} from "@arithmomaniac/sefaria-web-components/reader";
import {
  createReaderSession,
  type ReaderConnectionsRecord,
  type ReaderEntryInfo,
  type ReaderSession,
  type ReaderTransition,
} from "@arithmomaniac/sefaria-web-components/reader-session";

import {
  addConnectionsPane,
  addSourcePane,
  createWorkspaceState,
  pruneAfterPane,
  pruneFromPane,
  selectWorkspacePane,
  type WorkspacePane,
  type WorkspaceState,
} from "./workspace-state.js";

/** Read-only state exposed for browser qualification and demonstration. */
export interface ReaderWorkspaceView {
  /** Ordered visible panes and compact active pane. */
  readonly panes: readonly WorkspacePane[];
  /** Current semantic reader entry, when initialized. */
  readonly currentEntryId?: string;
}

/** Browser workspace controls used by the page and automated qualification. */
export interface ReaderWorkspace {
  /** Current spatial and semantic projection. */
  readonly view: ReaderWorkspaceView;
  /** Opens a new root reference and replaces the current workspace. */
  readonly navigate: (
    targetRef: string,
    revealSelection?: boolean,
  ) => Promise<void>;
  /** Selects a retained pane and cancels obsolete work. */
  readonly activatePane: (paneId: string) => void;
  /** Closes a non-root pane and its spatial descendants. */
  readonly closePane: (paneId: string) => void;
  /** Aborts active requests while retaining the last committed workspace. */
  readonly cancelPending: () => void;
  /** Removes listeners and aborts active work. */
  readonly dispose: () => void;
}

/** Demo-owned workspace limits rather than supported reader API policy. */
export interface ReaderWorkspaceOptions {
  /** Maximum simultaneously visible panes. */
  readonly maxPanes?: number;
}

interface PanePin {
  readonly pinId: string;
}

/** Starts the realistic multi-pane website reader workspace. */
export function startReaderWorkspace(
  root: Document,
  client: SefariaClient = createSefariaClient(),
  options: ReaderWorkspaceOptions = {},
): ReaderWorkspace {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const vocalizationMode = requireElement<HTMLSelectElement>(
    root,
    "#vocalization-mode",
  );
  const panePath = requireElement<HTMLElement>(root, "#pane-path");
  const status = requireElement<HTMLElement>(root, "#status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const workspace = requireElement<HTMLElement>(root, "#workspace");
  const dataSource = createSefariaReaderDataSource(client);

  let session: ReaderSession | undefined;
  let spatial: WorkspaceState | undefined;
  let panePins = new Map<string, PanePin>();
  let activeAbort: AbortController | undefined;
  let generation = 0;
  let pendingOperationId: string | undefined;
  const connectionsErrors = new Map<string, string>();
  workspace.dataset.surface = "workspace";

  const currentView = (): ReaderWorkspaceView => ({
    panes: spatial?.panes ?? [],
    ...(session === undefined
      ? {}
      : { currentEntryId: session.state.currentEntryId }),
  });

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const cancelActive = (): void => {
    activeAbort?.abort();
    activeAbort = undefined;
    generation += 1;
    if (session && pendingOperationId) {
      session = session.cancelOperation(pendingOperationId).session;
    }
    pendingOperationId = undefined;
  };

  const finishActive = (
    completedController: AbortController,
    completedGeneration: number,
  ): void => {
    if (
      activeAbort === completedController &&
      generation === completedGeneration
    ) {
      activeAbort = undefined;
    }
  };

  const releasePanes = (panes: readonly WorkspacePane[]): void => {
    if (!session) return;
    for (const pane of panes) {
      const pin = panePins.get(pane.id);
      if (!pin) continue;
      session = session.release(pin.pinId).session;
      panePins.delete(pane.id);
    }
  };

  const pinPane = (pane: WorkspacePane): void => {
    if (!session) throw new Error("Reader session is not initialized.");
    const pinned = requireApplied(session.pin(pane.entryId));
    session = pinned.session;
    panePins.set(pane.id, { pinId: pinned.value.pinId });
  };

  const pruneAfter = (paneId: string): void => {
    if (!spatial) return;
    const pruned = pruneAfterPane(spatial, paneId);
    releasePanes(pruned.removed);
    spatial = pruned.state;
  };

  const activateEntry = (entryId: string): void => {
    if (!session || session.state.currentEntryId === entryId) return;
    session = requireApplied(session.activate(entryId)).session;
  };

  const render = (): void => {
    panePath.replaceChildren();
    if (!session || !spatial) {
      delete workspace.dataset.paneCount;
      workspace.replaceChildren();
      return;
    }
    workspace.dataset.paneCount = String(spatial.panes.length);
    workspace.replaceChildren();
    for (const pane of spatial.panes) {
      let entry: ReaderEntryInfo;
      try {
        entry = session.entryInfo(pane.entryId);
      } catch {
        continue;
      }
      panePath.append(createPathButton(pane, entry));
      workspace.append(createPane(pane, entry));
    }
    workspace
      .querySelector<HTMLElement>(`[data-pane-id="${spatial.activePaneId}"]`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  };

  const createPathButton = (
    pane: WorkspacePane,
    entry: ReaderEntryInfo,
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent =
      pane.kind === "source" ? entry.label : `${entry.label} connections`;
    button.dataset.paneId = pane.id;
    if (pane.id === spatial?.activePaneId) {
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => activatePane(pane.id));
    return button;
  };

  const createPane = (
    pane: WorkspacePane,
    entry: ReaderEntryInfo,
  ): HTMLElement => {
    const section = document.createElement("section");
    section.className = "reader-pane";
    section.dataset.paneId = pane.id;
    section.dataset.paneKind = pane.kind;
    section.dataset.active = String(pane.id === spatial?.activePaneId);
    section.setAttribute(
      "aria-label",
      pane.kind === "source"
        ? `Source: ${entry.label}`
        : `Connections: ${entry.label}`,
    );
    if (pane.id !== spatial?.panes[0]?.id) {
      const toolbar = document.createElement("div");
      toolbar.className = "pane-toolbar";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "×";
      close.setAttribute(
        "aria-label",
        `Close ${
          pane.kind === "source" ? entry.label : `${entry.label} connections`
        } and later panes`,
      );
      close.addEventListener("click", () => closePane(pane.id));
      toolbar.append(close);
      section.append(toolbar);
    }
    if (pane.kind === "source") {
      section.append(createSourceElement(pane, entry));
    } else {
      section.append(createConnectionsElement(pane, entry));
    }
    return section;
  };

  const createSourceElement = (
    pane: WorkspacePane,
    entry: ReaderEntryInfo,
  ): HTMLElement => {
    const record = session?.sourceRecord(entry.entryId);
    if (!record) {
      const message = document.createElement("p");
      message.className = "pane-message";
      message.setAttribute("role", "status");
      message.textContent = "Source text is not available for this entry.";
      return message;
    }
    const source = document.createElement(
      "sefaria-source-card",
    ) as SefariaSourceCard;
    source.data = record.payload;
    source.selectedPosition = entry.selectedPosition;
    source.setAttribute("content-language", entry.presentation.contentLanguage);
    source.setAttribute("layout", entry.presentation.layout);
    source.setAttribute("side-order", entry.presentation.sideOrder);
    source.setAttribute(
      "vocalization-mode",
      entry.presentation.vocalizationMode,
    );
    source.setAttribute("selectable", "");
    source.addEventListener("sefaria-source-select", (event) => {
      const detail = (
        event as CustomEvent<{
          readonly position: readonly number[];
          readonly ref: string;
        }>
      ).detail;
      void selectSource(pane, detail.position, detail.ref);
    });
    return source;
  };

  const createConnectionsElement = (
    pane: WorkspacePane,
    entry: ReaderEntryInfo,
  ): HTMLElement => {
    if (entry.connections === "failed" || entry.connections === "interrupted") {
      const message = document.createElement("p");
      message.className = "pane-message";
      message.setAttribute(
        "role",
        entry.connections === "failed" ? "alert" : "status",
      );
      message.textContent =
        entry.connections === "failed"
          ? (connectionsErrors.get(entry.entryId) ??
            "Connections could not be loaded.")
          : "Connections loading was interrupted.";
      return message;
    }
    const connections = document.createElement(
      "sefaria-connections-panel",
    ) as SefariaConnectionsPanel;
    const record = session?.connectionsRecord(entry.entryId);
    if (record !== undefined) {
      connections.data = record.payload;
    }
    const projection = record?.projection;
    if (projection?.category === undefined) {
      connections.removeAttribute("category");
    } else {
      connections.setAttribute("category", projection.category);
    }
    connections.setAttribute("page", String(projection?.page ?? 0));
    connections.showPreviews = entry.presentation.showConnectionPreviews;
    connections.setAttribute(
      "vocalization-mode",
      entry.presentation.vocalizationMode,
    );
    connections.addEventListener(
      "sefaria-connections-category-change",
      (event) => {
        const category = (
          event as CustomEvent<{ readonly category: string | null }>
        ).detail.category;
        projectConnections(pane, category === null ? {} : { category });
      },
    );
    connections.addEventListener("sefaria-connections-page-change", (event) => {
      const page = (event as CustomEvent<{ readonly page: number }>).detail
        .page;
      const category = session?.connectionsRecord(entry.entryId)?.projection
        .category;
      projectConnections(pane, {
        ...(category === undefined ? {} : { category }),
        page,
      });
    });
    connections.addEventListener("sefaria-connection-select", (event) => {
      const targetRef = (event as CustomEvent<{ readonly targetRef: string }>)
        .detail.targetRef;
      void openConnectedSource(pane, targetRef).catch((error: unknown) => {
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
      });
    });
    return connections;
  };

  const addPinnedConnectionsPane = (
    sourcePaneId: string,
    entryId: string,
  ): WorkspacePane => {
    if (!spatial) throw new Error("Workspace is not initialized.");
    spatial = addConnectionsPane(spatial, sourcePaneId, entryId);
    const pane = spatial.panes.find(
      (candidate) => candidate.id === spatial?.activePaneId,
    );
    if (!pane) throw new Error("Connections pane was not created.");
    pinPane(pane);
    return pane;
  };

  const loadConnections = async (
    sourcePaneId: string,
    entryId: string,
    ref: string,
    expectedGeneration: number,
    signal: AbortSignal,
  ): Promise<void> => {
    if (!session) throw new Error("Reader session is not initialized.");
    requirePaneCapacity(1);
    const request: ConnectionsRequest = { tref: ref, withText: true };
    const begun = requireApplied(
      session.beginConnections(
        entryId,
        request,
        {},
        `Loading connections for ${ref}.`,
      ),
    );
    session = begun.session;
    pendingOperationId = begun.value.operationId;
    addPinnedConnectionsPane(sourcePaneId, entryId);
    render();
    let record: ReaderConnectionsRecord;
    try {
      record = await dataSource.loadConnections(request, {}, signal);
    } catch (error) {
      if (!signal.aborted && expectedGeneration === generation) {
        const message = error instanceof Error ? error.message : String(error);
        connectionsErrors.set(entryId, message);
        session = session.failConnections(
          begun.value.operationId,
          message,
        ).session;
        pendingOperationId = undefined;
        render();
      }
      throw error;
    }
    if (signal.aborted || expectedGeneration !== generation) return;
    const completed = session.completeConnections(
      begun.value.operationId,
      record,
    );
    session = completed.session;
    pendingOperationId = undefined;
    if (completed.state === "rejected") throw new Error(completed.message);
    connectionsErrors.delete(entryId);
    status.textContent = `Showing connections for ${ref}.`;
    render();
  };

  const navigate = async (
    targetRef: string,
    revealSelection = true,
  ): Promise<void> => {
    cancelActive();
    const currentGeneration = generation;
    const currentController = new AbortController();
    activeAbort = currentController;
    clearError();
    status.textContent = `Opening ${targetRef}.`;
    try {
      const destination = await resolveReaderSource(
        { tref: targetRef.trim() },
        dataSource,
        currentController.signal,
      );
      if (
        currentController.signal.aborted ||
        currentGeneration !== generation
      ) {
        return;
      }
      releasePanes(spatial?.panes ?? []);
      session = createReaderSession({
        source: {
          record: destination.record,
          selectedPosition: destination.selectedPosition,
        },
        presentation: {
          vocalizationMode: readVocalizationMode(vocalizationMode.value),
        },
      });
      connectionsErrors.clear();
      spatial = createWorkspaceState(
        session.state.currentEntryId,
        options.maxPanes,
      );
      panePins = new Map();
      pinPane(spatial.panes[0]!);
      tref.value = targetRef.trim();
      render();
      if (revealSelection) {
        await workspace
          .querySelector<SefariaSourceCard>("sefaria-source-card")
          ?.revealSelection();
      }
      await loadConnections(
        spatial.panes[0]!.id,
        session.state.currentEntryId,
        destination.selectedRef,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
      }
    } finally {
      finishActive(currentController, currentGeneration);
    }
  };

  const openConnectedSource = async (
    originPane: WorkspacePane,
    targetRef: string,
  ): Promise<void> => {
    if (!session || !spatial) return;
    cancelActive();
    const currentGeneration = generation;
    const currentController = new AbortController();
    activeAbort = currentController;
    clearError();
    const sourcePane = [...spatial.panes]
      .reverse()
      .find(
        (pane) => pane.kind === "source" && pane.entryId === originPane.entryId,
      );
    if (!sourcePane) throw new Error("Connection origin source was removed.");
    requirePaneCapacity(1);
    activateEntry(originPane.entryId);
    try {
      const destination = await resolveReaderSource(
        { tref: targetRef },
        dataSource,
        currentController.signal,
      );
      if (
        currentController.signal.aborted ||
        currentGeneration !== generation
      ) {
        return;
      }
      if (!session) throw new Error("Reader session was disposed.");
      const begun = requireApplied(
        session.beginSourceNavigation(
          originPane.entryId,
          destination.effectiveRequest,
        ),
      );
      session = begun.session;
      pendingOperationId = begun.value.operationId;
      render();
      session = requireApplied(
        session.completeSourceNavigation(begun.value.operationId, {
          source: {
            record: destination.record,
            selectedPosition: destination.selectedPosition,
          },
        }),
      ).session;
      pendingOperationId = undefined;
      pruneAfter(sourcePane.id);
      requirePaneCapacity(2);
      spatial = addSourcePane(
        spatial,
        sourcePane.id,
        session.state.currentEntryId,
      );
      const childPane = spatial.panes.find(
        (pane) => pane.id === spatial?.activePaneId,
      );
      if (!childPane) throw new Error("Child source pane was not created.");
      pinPane(childPane);
      render();
      await loadConnections(
        childPane.id,
        childPane.entryId,
        destination.selectedRef,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        if (pendingOperationId) {
          session = session.cancelOperation(pendingOperationId).session;
          pendingOperationId = undefined;
        }
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
        render();
      }
    } finally {
      finishActive(currentController, currentGeneration);
    }
  };

  const selectSource = async (
    pane: WorkspacePane,
    position: readonly number[],
    ref: string,
  ): Promise<void> => {
    if (!session) return;
    cancelActive();
    pruneAfter(pane.id);
    activateEntry(pane.entryId);
    session = requireApplied(
      session.selectSourcePosition(pane.entryId, position),
    ).session;
    const currentGeneration = generation;
    const currentController = new AbortController();
    activeAbort = currentController;
    render();
    try {
      await loadConnections(
        pane.id,
        pane.entryId,
        ref,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        showError(error);
      }
    } finally {
      finishActive(currentController, currentGeneration);
    }
  };

  const projectConnections = (
    pane: WorkspacePane,
    projection: ConnectionsProjection,
  ): void => {
    if (!session || !spatial) return;
    cancelActive();
    activateEntry(pane.entryId);
    session = requireApplied(
      session.projectConnections(pane.entryId, projection),
    ).session;
    spatial = selectWorkspacePane(spatial, pane.id);
    render();
  };

  const activatePane = (paneId: string): void => {
    if (!session || !spatial) return;
    cancelActive();
    const pane = spatial.panes.find((candidate) => candidate.id === paneId);
    if (!pane) throw new Error(`Workspace pane ${paneId} was not found.`);
    const lastEntryPane = [...spatial.panes]
      .reverse()
      .find((candidate) => candidate.entryId === pane.entryId);
    if (lastEntryPane) pruneAfter(lastEntryPane.id);
    activateEntry(pane.entryId);
    spatial = selectWorkspacePane(spatial, pane.id);
    render();
  };

  const closePane = (paneId: string): void => {
    if (!session || !spatial) return;
    cancelActive();
    const pruned = pruneFromPane(spatial, paneId);
    releasePanes(pruned.removed);
    spatial = pruned.state;
    const lastSource = [...spatial.panes]
      .reverse()
      .find((pane) => pane.kind === "source");
    if (!lastSource) throw new Error("Workspace must retain a source pane.");
    activateEntry(lastSource.entryId);
    render();
  };

  const requirePaneCapacity = (count: number): void => {
    if (!spatial) return;
    if (spatial.panes.length + count > spatial.maxPanes) {
      throw new RangeError(
        `Close a pane before opening another; this workspace allows ${spatial.maxPanes} visible panes.`,
      );
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  form.addEventListener("submit", onSubmit);
  const onVocalizationChange = (): void => {
    if (!session) return;
    session = requireApplied(
      session.setPresentation(session.state.currentEntryId, {
        vocalizationMode: readVocalizationMode(vocalizationMode.value),
      }),
    ).session;
    render();
  };
  vocalizationMode.addEventListener("change", onVocalizationChange);

  return {
    get view() {
      return currentView();
    },
    navigate,
    activatePane,
    closePane,
    cancelPending: () => {
      const hadPending =
        activeAbort !== undefined || pendingOperationId !== undefined;
      cancelActive();
      if (!hadPending) return;
      render();
      status.textContent = "Reader loading was interrupted.";
    },
    dispose: () => {
      cancelActive();
      releasePanes(spatial?.panes ?? []);
      form.removeEventListener("submit", onSubmit);
      vocalizationMode.removeEventListener("change", onVocalizationChange);
      workspace.replaceChildren();
      panePath.replaceChildren();
    },
  };
}

function readVocalizationMode(
  value: string,
): SefariaSourceCard["vocalizationMode"] {
  return value === "nikkud" || value === "none" ? value : "taamim_and_nikkud";
}

function requireApplied<T>(
  transition: ReaderTransition<T>,
): Extract<ReaderTransition<T>, { readonly state: "applied" }> {
  if (transition.state === "rejected") {
    throw new Error(transition.message);
  }
  return transition;
}

function requireInput(form: HTMLFormElement, name: string): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`The reader workspace requires ${selector}.`);
  return element;
}
