import type { SefariaBilingualSegment } from "./bilingual-segment-element.js";
import type {
  BilingualSegmentController,
  BilingualSegmentControllerSnapshot,
} from "./bilingual-segment.js";
import type { SefariaConnectionsPanel } from "./connections-panel-element.js";
import type {
  ConnectionsController,
  ConnectionsControllerSnapshot,
} from "./connections-panel.js";
import type { SefariaPopup } from "./popup-element.js";
import type { PopupController, PopupControllerSnapshot } from "./popup.js";
import type { ReaderPane } from "./reader.js";
import type {
  ReaderController,
  ReaderControllerSnapshot,
} from "./reader-controller.js";
import type { SefariaReader } from "./reader-element.js";
import type { SefariaRefLabel } from "./ref-label-element.js";
import type {
  RefLabelController,
  RefLabelControllerSnapshot,
} from "./ref-label.js";
import type { SefariaSourceCard } from "./source-card-element.js";
import type {
  SourceCardController,
  SourceCardControllerSnapshot,
} from "./source-card.js";
import type { SefariaTextSegment } from "./text-segment-element.js";
import type {
  TextSegmentController,
  TextSegmentControllerSnapshot,
} from "./text-segment.js";

const activeBindings = new WeakMap<EventTarget, object>();

/** Binds one text-segment controller to one request-free element. */
export function bindTextSegmentController(
  element: SefariaTextSegment,
  controller: TextSegmentController,
): () => void {
  return bindViewModel(element, controller, textSegmentViewModel);
}

/** Binds one bilingual-segment controller to one request-free element. */
export function bindBilingualSegmentController(
  element: SefariaBilingualSegment,
  controller: BilingualSegmentController,
): () => void {
  return bindViewModel(element, controller, bilingualSegmentViewModel);
}

/** Binds one reference-label controller to one request-free element. */
export function bindRefLabelController(
  element: SefariaRefLabel,
  controller: RefLabelController,
): () => void {
  return bindViewModel(element, controller, refLabelViewModel);
}

/** Binds one source-card controller to one request-free element. */
export function bindSourceCardController(
  element: SefariaSourceCard,
  controller: SourceCardController,
): () => void {
  return bindViewModel(element, controller, sourceCardViewModel);
}

/** Binds one popup controller to one request-free element. */
export function bindPopupController(
  element: SefariaPopup,
  controller: PopupController,
): () => void {
  const binding = reserveBinding(element);
  const onClose = (event: Event): void => {
    const origin = controller.snapshot.attempt;
    queueMicrotask(() => {
      if (
        !isActive(element, binding) ||
        event.defaultPrevented ||
        controller.snapshot.attempt !== origin
      ) {
        return;
      }
      controller.cancel();
    });
  };
  const listeners = [["sefaria-popup-close", onClose]] as const;
  return activateBinding(
    element,
    binding,
    () =>
      controller.subscribe((snapshot) => {
        element.viewModel = popupViewModel(snapshot);
      }),
    listeners,
  );
}

/** Binds one connections controller and its local data intents to one panel. */
export function bindConnectionsController(
  element: SefariaConnectionsPanel,
  controller: ConnectionsController,
): () => void {
  const binding = reserveBinding(element);
  const defer = (
    event: Event,
    action: (
      origin: NonNullable<ConnectionsControllerSnapshot["result"]>,
    ) => void,
  ): void => {
    const origin = controller.snapshot.result;
    if (origin === undefined) return;
    queueMicrotask(() => {
      if (
        event.defaultPrevented ||
        !isActive(element, binding) ||
        controller.snapshot.result !== origin
      ) {
        return;
      }
      action(origin);
    });
  };
  const onCategory = (event: Event): void => {
    defer(event, (_origin) => {
      const category = detail<{ readonly category: string | null }>(
        event,
      ).category;
      controller.setProjection(category === null ? {} : { category });
    });
  };
  const onPage = (event: Event): void => {
    defer(event, (origin) => {
      const category = origin.projection.category;
      controller.setProjection({
        ...(category === undefined ? {} : { category }),
        page: detail<{ readonly page: number }>(event).page,
      });
    });
  };
  const onPreviews = (event: Event): void => {
    defer(event, () => observe(controller.requestPreviews()));
  };
  const listeners = [
    ["sefaria-connections-category-change", onCategory],
    ["sefaria-connections-page-change", onPage],
    ["sefaria-connections-preview-request", onPreviews],
  ] as const;
  return activateBinding(
    element,
    binding,
    () =>
      controller.subscribe((snapshot) => {
        element.viewModel = connectionsViewModel(snapshot);
      }),
    listeners,
  );
}

/** Binds one stateful reader controller to one persistent request-free element. */
export function bindReaderController(
  element: SefariaReader,
  controller: ReaderController,
): () => void {
  const binding = reserveBinding(element);
  let activePane: ReaderPane = "source";
  let currentEntryId: string | undefined;
  const render = (snapshot: ReaderControllerSnapshot): void => {
    if (
      currentEntryId !== undefined &&
      currentEntryId !== snapshot.reader.currentEntryId
    ) {
      activePane = "source";
    }
    currentEntryId = snapshot.reader.currentEntryId;
    element.viewModel = snapshot.reader;
    element.contentLanguage = snapshot.presentation.contentLanguage;
    element.layout = snapshot.presentation.layout;
    element.sideOrder = snapshot.presentation.sideOrder;
    element.showConnectionPreviews =
      snapshot.presentation.showConnectionPreviews;
    element.rootLoading = snapshot.task.state === "loading-source";
    element.vocalizationMode = snapshot.presentation.vocalizationMode;
    element.activePane = activePane;
  };
  const defer = (event: Event, action: () => void): void => {
    const originEntryId = readerDetail(event).originEntryId;
    queueMicrotask(() => {
      if (
        event.defaultPrevented ||
        !isActive(element, binding) ||
        controller.snapshot.reader.currentEntryId !== originEntryId
      ) {
        return;
      }
      action();
    });
  };
  const onBack = (event: Event): void =>
    defer(event, () => controller.back(readerDetail(event)));
  const onHistory = (event: Event): void =>
    defer(event, () =>
      controller.activateHistory(
        readerDetail<{ readonly entryId: string }>(event),
      ),
    );
  const onPane = (event: Event): void =>
    defer(event, () => {
      activePane = readerDetail<{ readonly pane: ReaderPane }>(event).pane;
      element.activePane = activePane;
    });
  const onSource = (event: Event): void =>
    defer(event, () =>
      observe(
        controller.selectSource(
          readerDetail<{
            readonly position: readonly number[];
            readonly ref: string;
          }>(event),
        ),
      ),
    );
  const onCategory = (event: Event): void =>
    defer(event, () =>
      controller.setConnectionsCategory(
        readerDetail<{ readonly category: string | null }>(event),
      ),
    );
  const onPage = (event: Event): void =>
    defer(event, () =>
      controller.setConnectionsPage(
        readerDetail<{ readonly page: number }>(event),
      ),
    );
  const onConnection = (event: Event): void =>
    defer(event, () =>
      observe(
        controller.openConnection(
          readerDetail<{ readonly targetRef: string }>(event),
        ),
      ),
    );
  const onPreviews = (event: Event): void =>
    defer(event, () =>
      observe(controller.requestConnectionPreviews(readerDetail(event))),
    );
  const listeners = [
    ["sefaria-reader-back", onBack],
    ["sefaria-reader-history-activate", onHistory],
    ["sefaria-reader-pane-change", onPane],
    ["sefaria-reader-source-select", onSource],
    ["sefaria-reader-connections-category-change", onCategory],
    ["sefaria-reader-connections-page-change", onPage],
    ["sefaria-reader-connection-select", onConnection],
    ["sefaria-reader-connections-preview-request", onPreviews],
  ] as const;
  return activateBinding(
    element,
    binding,
    () => controller.subscribe(render),
    listeners,
    () => {
      element.rootLoading = false;
    },
  );
}

function bindViewModel<
  TElement extends EventTarget,
  TController extends {
    subscribe(listener: (snapshot: TSnapshot) => void): () => void;
  },
  TSnapshot,
  TViewModel,
>(
  element: TElement,
  controller: TController,
  select: (snapshot: TSnapshot) => TViewModel | undefined,
): () => void {
  const binding = reserveBinding(element);
  const target = element as TElement & {
    viewModel: TViewModel | undefined;
  };
  return activateBinding(
    element,
    binding,
    () =>
      controller.subscribe((snapshot) => {
        target.viewModel = select(snapshot);
      }),
    [],
  );
}

function textSegmentViewModel(snapshot: TextSegmentControllerSnapshot) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function bilingualSegmentViewModel(
  snapshot: BilingualSegmentControllerSnapshot,
) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function refLabelViewModel(snapshot: RefLabelControllerSnapshot) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function sourceCardViewModel(snapshot: SourceCardControllerSnapshot) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function popupViewModel(snapshot: PopupControllerSnapshot) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function connectionsViewModel(snapshot: ConnectionsControllerSnapshot) {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function reserveBinding(element: EventTarget): object {
  if (activeBindings.has(element)) {
    throw new Error("This element already has an active controller binding.");
  }
  const binding = {};
  activeBindings.set(element, binding);
  return binding;
}

function isActive(element: EventTarget, binding: object): boolean {
  return activeBindings.get(element) === binding;
}

function activateBinding(
  element: EventTarget,
  binding: object,
  subscribe: () => () => void,
  listeners: readonly (readonly [string, EventListener])[],
  deactivate?: () => void,
): () => void {
  let unsubscribe: (() => void) | undefined;
  const added: (readonly [string, EventListener])[] = [];
  try {
    unsubscribe = subscribe();
    for (const [name, listener] of listeners) {
      element.addEventListener(name, listener);
      added.push([name, listener]);
    }
    return cleanupBinding(element, binding, unsubscribe, listeners, deactivate);
  } catch (error) {
    for (const [name, listener] of added) {
      element.removeEventListener(name, listener);
    }
    deactivate?.();
    unsubscribe?.();
    if (isActive(element, binding)) activeBindings.delete(element);
    throw error;
  }
}

function cleanupBinding(
  element: EventTarget,
  binding: object,
  unsubscribe: () => void,
  listeners: readonly (readonly [string, EventListener])[],
  deactivate?: () => void,
): () => void {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (isActive(element, binding)) activeBindings.delete(element);
    for (const [name, listener] of listeners) {
      element.removeEventListener(name, listener);
    }
    deactivate?.();
    unsubscribe();
  };
}

function detail<T extends object>(event: Event): T {
  return (event as CustomEvent<T>).detail;
}

function readerDetail<T extends object = object>(
  event: Event,
): T & { readonly originEntryId: string } {
  return detail<T & { readonly originEntryId: string }>(event);
}

function observe(operation: Promise<unknown>): void {
  operation.catch((error: unknown) => {
    if (typeof globalThis.reportError === "function") {
      globalThis.reportError(error);
      return;
    }
    console.error(error);
  });
}
