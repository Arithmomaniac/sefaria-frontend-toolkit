import type {
  SefariaTextSegment,
  TextSegmentController,
  TextSegmentControllerSnapshot,
  TextSegmentDataViewModel,
  TextSegmentRequest,
  TextSegmentTerminalViewModel,
  TextSegmentViewModel,
} from "@arithmomaniac/sefaria-web-components";
import { beforeEach, expect, test, vi } from "vitest";

import { startTextSegmentLiveDemo } from "./app.js";

const FIRST_RESULT = createDataViewModel("First result");
type TextSegmentLoader = (
  request: TextSegmentRequest,
  signal: AbortSignal,
) => Promise<TextSegmentViewModel>;

beforeEach(() => {
  document.body.innerHTML = '<div id="live-demo-root"></div>';
});

test("loads a preset through the host and supplies its view model to the element", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => FIRST_RESULT);
  startTextSegmentLiveDemo(document, controllerFromLoader(loader));

  document
    .querySelector<HTMLButtonElement>('[data-demo-id="english-footnote"]')
    ?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("data"));

  expect(loader.mock.calls[0]?.[0]).toEqual({
    tref: "Genesis 1:1",
    version: {
      language: "english",
      versionTitle: "The Contemporary Torah, Jewish Publication Society, 2006",
    },
  });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(requestState().dataset.state).toBe("data");
});

test("renders the text-segment controls and presets from its configuration", () => {
  startTextSegmentLiveDemo(
    document,
    controllerFromLoader(async () => FIRST_RESULT),
  );

  expect(document.querySelector("h1")?.textContent).toBe(
    "Live text-segment demo",
  );
  expect(document.querySelectorAll("[data-demo-request]")).toHaveLength(5);
  expect(
    document.querySelector<HTMLInputElement>('[name="language"]')?.value,
  ).toBe("hebrew");
  expect(resultElement().localName).toBe("sefaria-text-segment");
});

test("binds rejected operations to the host error element", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startTextSegmentLiveDemo(document, controllerFromLoader(loader));

  document.querySelector<HTMLButtonElement>('[data-demo-id="hebrew"]')?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
});

function controllerFromLoader(
  loader: TextSegmentLoader,
): TextSegmentController {
  let snapshot: TextSegmentControllerSnapshot = {
    attempt: { state: "idle" },
  };
  const listeners = new Set<(value: TextSegmentControllerSnapshot) => void>();
  let active: AbortController | undefined;
  let nextId = 1;
  const publish = (next: TextSegmentControllerSnapshot): void => {
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
        )) as TextSegmentTerminalViewModel;
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

function resultElement(): SefariaTextSegment {
  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  if (!element) {
    throw new Error("The text result element is missing.");
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

function createDataViewModel(versionTitle: string): TextSegmentDataViewModel {
  return {
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    language: "en",
    actualLanguage: "en",
    direction: "ltr",
    body: [{ kind: "html", html: versionTitle }],
    notes: [],
  };
}
