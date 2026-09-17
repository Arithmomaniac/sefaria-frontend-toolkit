import type {
  RefLabelController,
  RefLabelControllerSnapshot,
  RefLabelDataViewModel,
  RefLabelRequest,
  RefLabelTerminalViewModel,
  RefLabelViewModel,
  SefariaRefLabel,
} from "@arithmomaniac/sefaria-web-components";
import { beforeEach, expect, test, vi } from "vitest";

import { startRefLabelLiveDemo } from "./app.js";

const FIRST_RESULT = createDataViewModel("Genesis 1:1");
type RefLabelLoader = (
  request: RefLabelRequest,
  signal: AbortSignal,
) => Promise<RefLabelViewModel>;

beforeEach(() => {
  document.body.innerHTML = '<div id="live-demo-root"></div>';
});

test("loads a preset and supplies presentation plus view-model state", async () => {
  const loader = vi.fn<RefLabelLoader>(async () => FIRST_RESULT);
  startRefLabelLiveDemo(document, controllerFromLoader(loader));

  document.querySelector<HTMLButtonElement>('[data-demo-id="range"]')?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("data"));

  expect(loader.mock.calls[0]?.[0]).toEqual({ tref: "Genesis 1:1-3" });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(resultElement().labelLanguage).toBe("both");
  expect(resultElement().linked).toBe(true);
  expect(requestState().dataset.state).toBe("data");
});

test("renders the reference-label controls and presets from its configuration", () => {
  startRefLabelLiveDemo(
    document,
    controllerFromLoader(async () => FIRST_RESULT),
  );

  expect(document.querySelector("h1")?.textContent).toBe(
    "Live reference-label demo",
  );
  expect(document.querySelectorAll("[data-demo-request]")).toHaveLength(5);
  expect(
    document.querySelector<HTMLSelectElement>('[name="labelLanguage"]')?.value,
  ).toBe("both");
  expect(resultElement().localName).toBe("sefaria-ref-label");
});

test("binds rejected operations to the host error element", async () => {
  const loader = vi.fn<RefLabelLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startRefLabelLiveDemo(document, controllerFromLoader(loader));

  document
    .querySelector<HTMLButtonElement>('[data-demo-id="segment"]')
    ?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
});

function controllerFromLoader(loader: RefLabelLoader): RefLabelController {
  let snapshot: RefLabelControllerSnapshot = {
    attempt: { state: "idle" },
  };
  const listeners = new Set<(value: RefLabelControllerSnapshot) => void>();
  let active: AbortController | undefined;
  let nextId = 1;
  const publish = (next: RefLabelControllerSnapshot): void => {
    snapshot = next;
    for (const listener of listeners) listener(snapshot);
  };
  return {
    get snapshot() {
      return snapshot;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    load: async (request) => {
      active?.abort();
      const current = new AbortController();
      active = current;
      const id = nextId++;
      publish({
        ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
        attempt: {
          state: "loading",
          id,
          request,
          viewModel: {
            state: "loading",
            message: `Loading ${request.tref}.`,
          },
        },
      });
      try {
        const terminal = (await loader(
          request,
          current.signal,
        )) as RefLabelTerminalViewModel;
        active = undefined;
        publish({
          result: { request, viewModel: terminal },
          attempt: { state: "idle" },
        });
        return terminal;
      } catch (error) {
        active = undefined;
        publish({
          ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
          attempt: { state: "failed", id, request, error },
        });
        throw error;
      }
    },
    setSuppliedData: () => {
      throw new Error("Not used by this test controller.");
    },
    cancel: (reason = new DOMException("Cancelled", "AbortError")) => {
      active?.abort(reason);
    },
    dispose: () => {
      active?.abort();
      listeners.clear();
      snapshot = { attempt: { state: "idle" } };
    },
  };
}

function resultElement(): SefariaRefLabel {
  const element = document.querySelector<SefariaRefLabel>("sefaria-ref-label");
  if (!element) {
    throw new Error("The reference result element is missing.");
  }
  return element;
}

function requestState(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#request-state");
  if (!element) {
    throw new Error("The request state element is missing.");
  }
  return element;
}

function createDataViewModel(normalized: string): RefLabelDataViewModel {
  return {
    state: "data",
    normalized,
    hebrew: "בראשית א׳:א׳",
    urlRef: "Genesis.1.1",
    url: "https://www.sefaria.org/Genesis.1.1",
    indexTitle: "Genesis",
    nodeType: "JaggedArrayNode",
  };
}
