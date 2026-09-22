import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaAcquisition,
  SefariaReader,
} from "@arithmomaniac/sefaria-web-components";

/** Browser controls exposed for qualification of the supported reader path. */
export interface ControlledReaderDemo {
  /** Opens an initial or replacement root on one persistent controller. */
  readonly navigate: (targetRef: string) => Promise<void>;
  /** Removes host listeners and disposes controller-owned work. */
  readonly dispose: () => void;
}

/** Starts the ordinary-website demonstration of the supported reader API. */
export function startControlledReader(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): ControlledReaderDemo {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const status = requireElement<HTMLElement>(root, "#status");
  const bookmarkStatus = requireElement<HTMLElement>(root, "#bookmark-status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const vocalizationMode = requireElement<HTMLSelectElement>(
    root,
    "#vocalization-mode",
  );
  const workspace = requireElement<HTMLElement>(root, "#workspace");
  const reader = document.createElement("sefaria-reader") as SefariaReader;
  const bookmarkAction = document.createElement("button");
  bookmarkAction.type = "button";
  bookmarkAction.slot = "toolbar-actions";
  bookmarkAction.className = "reader-bookmark";
  bookmarkAction.disabled = true;
  bookmarkAction.textContent = "Bookmark selected text";
  reader.append(bookmarkAction);
  workspace.dataset.surface = "reader";
  workspace.replaceChildren(reader);

  const acquisition: SefariaAcquisition = { kind: "client", client };
  reader.acquisition = acquisition;
  let generation = 0;
  let disposed = false;
  let readerFailure: string | undefined;

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const renderStatus = (attemptedRoot?: string): void => {
    const bookmarkTarget = reader.selectedRef;
    bookmarkAction.disabled =
      reader.status === "loading" || bookmarkTarget === undefined;
    bookmarkAction.textContent =
      bookmarkTarget === undefined
        ? "Bookmark selected text"
        : `Bookmark ${bookmarkTarget}`;
    if (reader.status === "error") {
      status.textContent =
        reader.currentEntryId !== undefined
          ? `${reader.selectedRef ?? "Reader"} remains open.`
          : `${attemptedRoot ?? reader.sref} could not be opened.`;
      showError(
        readerFailure ?? readerAlert(reader) ?? "Reader acquisition failed.",
      );
    } else if (reader.status === "loading") {
      status.textContent = `Opening ${reader.sref}.`;
    } else if (reader.status === "ready") {
      status.textContent = `Showing ${reader.selectedRef ?? "Reader"}.`;
      readerFailure = undefined;
      clearError();
    }
  };
  const synchronizeSelection = async (
    targetRef: string,
    actionGeneration: number,
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    while (!disposed && actionGeneration === generation) {
      await reader.updateComplete;
      if (
        reader.status === "error" ||
        (reader.status === "ready" && reader.selectedRef === targetRef)
      ) {
        renderStatus(targetRef);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve));
    }
  };
  const onSourceSelect = (event: Event): void => {
    const targetRef = (event as CustomEvent<{ readonly ref: string }>).detail
      .ref;
    status.textContent = `Opening ${targetRef}.`;
    void synchronizeSelection(targetRef, generation);
  };
  const onConnectionSelect = (event: Event): void => {
    const targetRef = (event as CustomEvent<{ readonly targetRef: string }>)
      .detail.targetRef;
    status.textContent = `Opening ${targetRef}.`;
    void synchronizeSelection(targetRef, generation);
  };
  const onHistoryActivate = (event: Event): void => {
    const label = (event as CustomEvent<{ readonly label?: string }>).detail
      .label;
    queueMicrotask(() => {
      void reader.updateComplete.then(() => {
        if (!disposed) {
          status.textContent = `Showing ${label ?? reader.selectedRef ?? "Reader"}.`;
        }
      });
    });
  };
  const onReaderError = (event: Event): void => {
    const detail = (
      event as CustomEvent<{ readonly error: unknown; readonly sref: string }>
    ).detail;
    readerFailure =
      detail.error instanceof Error
        ? detail.error.message
        : "Reader acquisition failed.";
    renderStatus(detail.sref);
  };
  reader.addEventListener("sefaria-reader-source-select", onSourceSelect);
  reader.addEventListener(
    "sefaria-reader-connection-select",
    onConnectionSelect,
  );
  reader.addEventListener("sefaria-reader-history-activate", onHistoryActivate);
  reader.addEventListener("sefaria-reader-error", onReaderError);

  const navigate = async (targetRef: string): Promise<void> => {
    const normalized = targetRef.trim();
    const currentGeneration = ++generation;
    readerFailure = undefined;
    clearError();
    bookmarkAction.disabled = true;
    status.textContent = `Opening ${normalized}.`;
    reader.vocalizationMode = readVocalizationMode(vocalizationMode.value);
    reader.sref = normalized;
    await waitForReader(
      reader,
      normalized,
      currentGeneration,
      () => generation,
    );
    if (currentGeneration !== generation) return;
    renderStatus(normalized);
    if (generation === currentGeneration && reader.status === "ready") {
      tref.value = normalized;
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  form.addEventListener("submit", onSubmit);
  const onVocalizationChange = (): void => {
    reader.vocalizationMode = readVocalizationMode(vocalizationMode.value);
  };
  vocalizationMode.addEventListener("change", onVocalizationChange);
  const onBookmark = (): void => {
    if (reader.status === "loading") return;
    const targetRef = reader.selectedRef;
    if (targetRef === undefined) return;
    bookmarkStatus.textContent = `Bookmarked ${targetRef} in this page.`;
  };
  bookmarkAction.addEventListener("click", onBookmark);

  return {
    navigate,
    dispose: () => {
      disposed = true;
      generation += 1;
      form.removeEventListener("submit", onSubmit);
      vocalizationMode.removeEventListener("change", onVocalizationChange);
      bookmarkAction.removeEventListener("click", onBookmark);
      reader.removeEventListener(
        "sefaria-reader-source-select",
        onSourceSelect,
      );
      reader.removeEventListener(
        "sefaria-reader-connection-select",
        onConnectionSelect,
      );
      reader.removeEventListener(
        "sefaria-reader-history-activate",
        onHistoryActivate,
      );
      reader.removeEventListener("sefaria-reader-error", onReaderError);
      workspace.replaceChildren();
    },
  };
}

async function waitForReader(
  reader: SefariaReader,
  requestedRoot: string,
  generation: number,
  currentGeneration: () => number,
): Promise<void> {
  while (generation === currentGeneration()) {
    await reader.updateComplete;
    if (reader.status === "error") return;
    if (
      reader.selectedRef !== undefined &&
      reader.sref === requestedRoot &&
      reader.status === "ready"
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve));
  }
}

function readerAlert(reader: SefariaReader): string | undefined {
  return (
    reader as SefariaReader & {
      readonly readerError: string | undefined;
    }
  ).readerError;
}

function readVocalizationMode(
  value: string,
): SefariaReader["vocalizationMode"] {
  return value === "nikkud" || value === "none" ? value : "taamim_and_nikkud";
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
  if (!element) throw new Error(`The controlled reader requires ${selector}.`);
  return element;
}
