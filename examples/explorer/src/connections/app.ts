import {
  createSefariaClient,
  related,
  text,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";

/** Host controls exposed for browser qualification and manual use. */
export interface ConnectionsDemo {
  /** Opens a target in its server-provided context and loads first-segment links. */
  readonly navigate: (
    targetRef: string,
    revealSelection?: boolean,
  ) => Promise<void>;
  /** Removes host listeners and aborts active operations. */
  readonly dispose: () => void;
}

interface RetainedLinks {
  readonly payload: CoreLinkResponse;
  readonly sref: string;
  readonly withText: boolean;
}

/** Starts the standalone reader/connections host with explicit request ownership. */
export function startConnectionsDemo(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): ConnectionsDemo {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const reader = requireElement<SefariaSourceCard>(root, "#reader");
  const connections = requireElement<SefariaConnectionsPanel>(
    root,
    "#connections",
  );
  const showPreviews = requireElement<HTMLInputElement>(root, "#show-previews");
  const metadataOnly = requireElement<HTMLInputElement>(root, "#metadata-only");
  const contentLanguage = requireElement<HTMLSelectElement>(
    root,
    "#content-language",
  );
  const showAddressLabels = requireElement<HTMLInputElement>(
    root,
    "#show-address-labels",
  );
  const layout = requireElement<HTMLSelectElement>(root, "#layout");
  const sideOrder = requireElement<HTMLSelectElement>(root, "#side-order");
  const vocalizationMode = requireElement<HTMLSelectElement>(
    root,
    "#vocalization-mode",
  );
  const status = requireElement<HTMLElement>(root, "#status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const requestCounts = requireElement<HTMLElement>(root, "#request-counts");
  const sourceProbe = document.createElement(
    "sefaria-source-card",
  ) as SefariaSourceCard;
  sourceProbe.hidden = true;
  root.body.append(sourceProbe);

  let controller: AbortController | undefined;
  let operation = 0;
  let textRequests = 0;
  let linksRequests = 0;
  let retainedLinks: RetainedLinks | undefined;
  let capturedSource:
    | {
        readonly sref: string;
        readonly payload: CoreV3TextsResponse;
      }
    | undefined;

  reader.selectable = true;
  const sourceAcquisition = {
    kind: "capability" as const,
    capability: {
      getText: async (
        request: {
          readonly sref: string;
          readonly versions: readonly string[];
          readonly returnFormat: "default";
        },
        signal: AbortSignal,
      ) => {
        textRequests += 1;
        updateCounts();
        const result = await text.getV3Texts({
          client,
          path: { tref: request.sref },
          query: {
            version: [...request.versions],
            return_format: request.returnFormat,
          },
          signal,
        });
        if (result.data !== undefined) {
          capturedSource = { sref: request.sref, payload: result.data };
          return { payload: result.data, status: 200 };
        }
        if (result.error !== undefined && result.response !== undefined) {
          return {
            payload: result.error,
            status: result.response.status,
          };
        }
        throw new Error("The v3 texts request returned no result.");
      },
    },
  };
  sourceProbe.acquisition = sourceAcquisition;
  connections.acquisition = {
    kind: "capability",
    capability: {
      getLinks: async (request, signal) => {
        const result = await related.getLinks({
          client,
          path: { tref: request.sref },
          query: {
            with_text: request.withText ? "1" : "0",
            with_sheet_links: "0",
          },
          signal,
        });
        if (result.data !== undefined) {
          retainedLinks = {
            payload: result.data,
            sref: request.sref,
            withText: request.withText,
          };
          return { payload: result.data, status: 200 };
        }
        if (result.error !== undefined && result.response.status === 400) {
          return { payload: result.error, status: 400 };
        }
        throw new Error(
          "The links request returned no data or documented error.",
        );
      },
    },
  };
  connections.showPreviews = showPreviews.checked;

  const updateCounts = (): void => {
    requestCounts.textContent =
      `${textRequests} text request${textRequests === 1 ? "" : "s"}; ` +
      `${linksRequests} links request${linksRequests === 1 ? "" : "s"}.`;
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };
  const onConnectionsError = (event: Event): void => {
    showError((event as CustomEvent<{ readonly error: unknown }>).detail.error);
    if (
      retainedLinks !== undefined &&
      retainedLinks.sref === connections.sref &&
      !retainedLinks.withText &&
      connections.withText
    ) {
      const retained = retainedLinks;
      const category = connections.category;
      const page = connections.page;
      queueMicrotask(() => {
        restoreLinks(retained, category, page);
      });
    }
  };
  const restoreLinks = (
    retained: RetainedLinks,
    category: string | undefined,
    page: number,
  ): void => {
    connections.sref = retained.sref;
    connections.withText = retained.withText;
    connections.category = category;
    connections.page = page;
    connections.data = retained.payload;
  };
  const loadLinks = async (
    ref: string,
    withText: boolean,
    expectedOperation: number,
    signal: AbortSignal,
  ): Promise<void> => {
    if (signal.aborted || expectedOperation !== operation) {
      return;
    }
    linksRequests += 1;
    updateCounts();
    const previous =
      retainedLinks === undefined
        ? undefined
        : {
            retained: retainedLinks,
            category: connections.category,
            page: connections.page,
          };
    connections.data = undefined;
    connections.category = undefined;
    connections.page = 0;
    if (connections.sref === ref && connections.withText === withText) {
      connections.sref = "";
      await connections.updateComplete;
    }
    connections.withText = withText;
    connections.sref = ref;
    try {
      await waitForConnections(
        connections,
        ref,
        expectedOperation,
        () => operation,
        signal,
      );
    } catch (error) {
      if (previous === undefined) {
        connections.sref = "";
      } else {
        restoreLinks(previous.retained, previous.category, previous.page);
      }
      await connections.updateComplete;
      throw error;
    }
  };

  const loadSource = async (
    ref: string,
    signal: AbortSignal,
  ): Promise<CoreV3TextsResponse> => {
    sourceProbe.data = undefined;
    if (sourceProbe.sref === ref) {
      sourceProbe.sref = "";
      await sourceProbe.updateComplete;
    }
    sourceProbe.sref = ref;
    await waitForSource(sourceProbe, ref, signal);
    if (capturedSource?.sref !== ref) {
      throw new Error(`Source acquisition did not retain ${ref}.`);
    }
    return capturedSource.payload;
  };

  const navigate = async (
    targetRef: string,
    revealSelection = true,
  ): Promise<void> => {
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const expectedOperation = ++operation;
    const normalizedTarget = targetRef.trim();
    let committedSection: string | undefined;
    let firstRef: string | undefined;
    clearError();
    status.textContent = `Opening ${normalizedTarget} in context.`;
    try {
      const target = await loadSource(
        normalizedTarget,
        currentController.signal,
      );
      if (expectedOperation !== operation) {
        return;
      }
      const resolvedFirstRef = firstCanonicalRef(target.ref);
      firstRef = resolvedFirstRef;
      const contextRef =
        target.isSpanning && target.spanningRefs?.[0] !== undefined
          ? target.spanningRefs[0]
          : target.sectionRef;
      if (contextRef === undefined) {
        throw new Error(
          `${target.ref} did not provide a contextual reference.`,
        );
      }
      let contextualPromise: Promise<CoreV3TextsResponse>;
      let linksOutcome:
        | Promise<
            | { readonly state: "success" }
            | { readonly state: "error"; readonly error: unknown }
          >
        | undefined;
      const startLinks = (ref: string) =>
        loadLinks(
          ref,
          !metadataOnly.checked,
          expectedOperation,
          currentController.signal,
        ).then(
          () => ({ state: "success" as const }),
          (error: unknown) => ({ state: "error" as const, error }),
        );
      if (target.isSpanning) {
        contextualPromise = loadSource(contextRef, currentController.signal);
      } else {
        contextualPromise =
          target.ref === contextRef
            ? Promise.resolve(target)
            : loadSource(contextRef, currentController.signal);
        linksOutcome = startLinks(resolvedFirstRef);
      }
      let contextual: CoreV3TextsResponse;
      try {
        contextual = await contextualPromise;
      } catch (error) {
        currentController.abort();
        connections.sref = "";
        await linksOutcome;
        if (expectedOperation === operation) {
          connections.data = undefined;
          connections.sref = "";
          status.textContent = `${normalizedTarget} could not be opened.`;
          showError(error);
        }
        return;
      }
      if (expectedOperation !== operation) {
        return;
      }
      linksOutcome ??= startLinks(resolvedFirstRef);
      const selectedPosition = selectedPositionFor(resolvedFirstRef);
      if (!hasTextAt(contextual, selectedPosition)) {
        const error = new Error(
          `${resolvedFirstRef} is not a selectable row in ${contextual.ref}.`,
        );
        currentController.abort();
        connections.sref = "";
        await linksOutcome;
        if (expectedOperation === operation) {
          connections.data = undefined;
          connections.sref = "";
          status.textContent = `${normalizedTarget} could not be opened.`;
          showError(error);
        }
        return;
      }

      reader.sref = contextual.ref;
      reader.data = contextual;
      reader.selectedPosition = selectedPosition;
      await reader.updateComplete;
      committedSection = contextual.ref;
      status.textContent = `Showing ${committedSection}; loading connections for ${resolvedFirstRef}.`;
      if (revealSelection) {
        await reader.revealSelection();
      }
      if (expectedOperation === operation) {
        const outcome = await linksOutcome;
        if (outcome.state === "error") throw outcome.error;
      }
      if (expectedOperation === operation) {
        tref.value = normalizedTarget;
        status.textContent = `Showing ${committedSection}; selected ${resolvedFirstRef}.`;
      }
    } catch (error) {
      if (currentController.signal.aborted || expectedOperation !== operation) {
        return;
      }
      status.textContent =
        committedSection === undefined || firstRef === undefined
          ? `${normalizedTarget} could not be opened.`
          : `Showing ${committedSection}; connections for ${firstRef} could not be loaded.`;
      showError(error);
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  const onSourceSelect = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        readonly position: readonly number[];
        readonly ref: string;
      }>
    ).detail;
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const expectedOperation = ++operation;
    clearError();
    reader.selectedPosition = detail.position;
    status.textContent = `Loading connections for ${detail.ref}.`;
    void loadLinks(
      detail.ref,
      !metadataOnly.checked,
      expectedOperation,
      currentController.signal,
    ).then(
      () => {
        if (expectedOperation === operation) {
          status.textContent = `Selected ${detail.ref}.`;
        }
      },
      (error: unknown) => {
        if (
          !currentController.signal.aborted &&
          expectedOperation === operation
        ) {
          status.textContent = `Connections for ${detail.ref} could not be loaded.`;
          showError(error);
        }
      },
    );
  };
  const onPreviewRequest = (): void => {
    if (connections.withText === false) {
      clearError();
      linksRequests += 1;
      updateCounts();
    }
  };
  const onConnectionSelect = (event: Event): void => {
    const detail = (event as CustomEvent<{ readonly targetRef: string }>)
      .detail;
    void navigate(detail.targetRef);
  };
  const onDisplayChange = (): void => {
    reader.contentLanguage =
      contentLanguage.value === "primary" ||
      contentLanguage.value === "translation"
        ? contentLanguage.value
        : "both";
    reader.layout =
      layout.value === "stacked" || layout.value === "side-by-side"
        ? layout.value
        : "auto";
    reader.sideOrder =
      sideOrder.value === "translation-first"
        ? "translation-first"
        : "primary-first";
    reader.showAddressLabels = showAddressLabels.checked;
    connections.showPreviews = showPreviews.checked;
    const mode =
      vocalizationMode.value === "nikkud" || vocalizationMode.value === "none"
        ? vocalizationMode.value
        : "taamim_and_nikkud";
    reader.vocalizationMode = mode;
    connections.vocalizationMode = mode;
  };

  form.addEventListener("submit", onSubmit);
  reader.addEventListener("sefaria-source-select", onSourceSelect);
  connections.addEventListener("sefaria-connection-select", onConnectionSelect);
  connections.addEventListener(
    "sefaria-connections-panel-error",
    onConnectionsError,
  );
  connections.addEventListener(
    "sefaria-connections-preview-request",
    onPreviewRequest,
  );
  const displayControls = [
    showPreviews,
    contentLanguage,
    showAddressLabels,
    layout,
    sideOrder,
    vocalizationMode,
  ];
  for (const control of displayControls) {
    control.addEventListener("change", onDisplayChange);
  }
  onDisplayChange();
  updateCounts();

  return {
    navigate,
    dispose: () => {
      controller?.abort();
      connections.sref = "";
      sourceProbe.remove();
      form.removeEventListener("submit", onSubmit);
      reader.removeEventListener("sefaria-source-select", onSourceSelect);
      connections.removeEventListener(
        "sefaria-connections-preview-request",
        onPreviewRequest,
      );
      connections.removeEventListener(
        "sefaria-connection-select",
        onConnectionSelect,
      );
      connections.removeEventListener(
        "sefaria-connections-panel-error",
        onConnectionsError,
      );
      for (const control of displayControls) {
        control.removeEventListener("change", onDisplayChange);
      }
    },
  };
}

async function waitForSource(
  source: SefariaSourceCard,
  expectedRef: string,
  signal: AbortSignal,
): Promise<void> {
  let acquisitionError: unknown;
  const onError = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        readonly error: unknown;
        readonly sref: string;
      }>
    ).detail;
    if (detail.sref === expectedRef) acquisitionError = detail.error;
  };
  const onAbort = (): void => {
    if (source.sref === expectedRef) source.sref = "";
  };
  source.addEventListener("sefaria-source-card-error", onError);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    while (!signal.aborted) {
      await source.updateComplete;
      if (source.status === "loading" || source.status === "empty") {
        await new Promise((resolve) => setTimeout(resolve));
        continue;
      }
      if (source.status === "error" && acquisitionError !== undefined) {
        throw acquisitionError;
      }
      return;
    }
  } finally {
    source.removeEventListener("sefaria-source-card-error", onError);
    signal.removeEventListener("abort", onAbort);
  }
  throw signal.reason;
}

async function waitForConnections(
  connections: SefariaConnectionsPanel,
  expectedRef: string,
  expectedOperation: number,
  currentOperation: () => number,
  signal: AbortSignal,
): Promise<void> {
  let acquisitionError: unknown;
  const onError = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        readonly error: unknown;
        readonly sref: string;
      }>
    ).detail;
    if (detail.sref === expectedRef) acquisitionError = detail.error;
  };
  connections.addEventListener("sefaria-connections-panel-error", onError);
  try {
    while (!signal.aborted && expectedOperation === currentOperation()) {
      await connections.updateComplete;
      if (connections.status === "loading" || connections.status === "empty") {
        await new Promise((resolve) => setTimeout(resolve));
        continue;
      }
      if (connections.status === "error" && acquisitionError !== undefined) {
        throw acquisitionError;
      }
      return;
    }
  } finally {
    connections.removeEventListener("sefaria-connections-panel-error", onError);
  }
}

function firstCanonicalRef(ref: string): string {
  return ref.replace(/-\d+(?::\d+)*$/u, "");
}

function selectedPositionFor(ref: string): readonly number[] {
  const match = /:(\d+)$/u.exec(ref);
  return match === null ? [] : [Number(match[1]) - 1];
}

function hasTextAt(
  payload: CoreV3TextsResponse,
  position: readonly number[],
): boolean {
  return payload.versions.some((version) => {
    let value: unknown = version.text;
    for (const index of position) {
      if (!Array.isArray(value)) return false;
      value = value[index];
    }
    return typeof value === "string" && value.trim().length > 0;
  });
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
  if (!element) {
    throw new Error(`The demo requires ${selector}.`);
  }
  return element;
}
