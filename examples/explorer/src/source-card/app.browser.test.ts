import type {
  SefariaSourceCard,
  SourceCardController,
  SourceCardControllerSnapshot,
  SourceCardDataViewModel,
  SourceCardRequest,
  SourceCardTerminalViewModel,
  SourceCardViewModel,
} from "@arithmomaniac/sefaria-web-components";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { startSourceCardLiveDemo } from "./app.js";
import v3Fixture from "../../../../packages/client/test/fixtures/v3-text-spanning-2026-08-29.json" with { type: "json" };

const FIRST_RESULT = createDataViewModel("First");
const SECOND_RESULT = createDataViewModel("Second");
type SourceCardLoader = (
  request: SourceCardRequest,
  signal: AbortSignal,
) => Promise<SourceCardViewModel>;

beforeEach(() => {
  document.body.innerHTML = `
    <form id="source-card-form">
      <input name="tref" value="Genesis 1:1-3">
      <input name="primaryVersionTitle" value="">
      <input name="translationVersionTitle" value="">
      <button type="submit">Load</button>
    </form>
    <button type="button" data-demo-request data-tref="Likutei Moharan 1">Preset</button>
    <form id="display-form">
      <select name="contentLanguage"><option value="both">Both</option><option value="primary">Primary</option></select>
      <select name="layout"><option value="auto">Auto</option><option value="stacked">Stacked</option></select>
      <select name="sideOrder"><option value="primary-first">Primary</option><option value="translation-first">Translation</option></select>
    </form>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <div id="source-card-content">
      <sefaria-source-card id="source-card-result"></sefaria-source-card>
    </div>
  `;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("reuses the default client's cached response when revisiting a request", async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(v3Fixture), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const demo = startSourceCardLiveDemo(document);

  await demo.loadCurrentRequest();
  await demo.loadCurrentRequest();

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(resultElement().viewModel.state).not.toBe("loading");
});

test("loads a preset and supplies the result to the request-free element", async () => {
  const loader = vi.fn<SourceCardLoader>(async () => FIRST_RESULT);
  startSourceCardLiveDemo(document, controllerFromLoader(loader));

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() =>
    expect(requestState().textContent).toContain("1 items from one request"),
  );

  expect(loader.mock.calls[0]?.[0]).toEqual({ tref: "Likutei Moharan 1" });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(requestState().textContent).toContain("1 items from one request");
});

test("applies display settings without requesting", () => {
  const loader = vi.fn<SourceCardLoader>(async () => FIRST_RESULT);
  startSourceCardLiveDemo(document, controllerFromLoader(loader));
  const form = document.querySelector<HTMLFormElement>("#display-form");

  selectValue(form, "contentLanguage", "primary");
  selectValue(form, "layout", "stacked");
  selectValue(form, "sideOrder", "translation-first");
  form?.dispatchEvent(new Event("change", { bubbles: true }));

  expect(resultElement().contentLanguage).toBe("primary");
  expect(resultElement().layout).toBe("stacked");
  expect(resultElement().sideOrder).toBe("translation-first");
  expect(loader).not.toHaveBeenCalled();
});

test("enables selection and reports the real component event", () => {
  const loader = vi.fn<SourceCardLoader>(async () => FIRST_RESULT);
  startSourceCardLiveDemo(document, controllerFromLoader(loader));
  const result = resultElement();

  expect(result.selectable).toBe(true);
  result.dispatchEvent(
    new CustomEvent("sefaria-source-select", {
      detail: { position: [2, 1], ref: "Micah 6:8" },
    }),
  );

  expect(requestState().dataset.state).toBe("selected");
  expect(requestState().textContent).toContain("Selected Micah 6:8");
  expect(loader).not.toHaveBeenCalled();
});

test("restores committed content after a transport failure", async () => {
  let rejectSecond!: (reason: unknown) => void;
  const loader = vi.fn<SourceCardLoader>(async () => {
    if (loader.mock.calls.length === 1) return FIRST_RESULT;
    return await new Promise<SourceCardViewModel>((_resolve, reject) => {
      rejectSecond = reject;
    });
  });
  const demo = startSourceCardLiveDemo(document, controllerFromLoader(loader));
  const result = resultElement();

  await demo.loadCurrentRequest();
  const failedLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  rejectSecond(new Error("Network unavailable."));
  await failedLoad;

  expect(result.viewModel).toBe(FIRST_RESULT);
  expect(requestState().dataset.state).toBe("error");
  expect(document.querySelector<HTMLElement>("#host-error")?.textContent).toBe(
    "Network unavailable.",
  );
});

test("hides an initial loading placeholder after a transport failure", async () => {
  const loader = vi.fn<SourceCardLoader>(async () => {
    throw new Error("Network unavailable.");
  });
  const demo = startSourceCardLiveDemo(document, controllerFromLoader(loader));

  await demo.loadCurrentRequest();

  const resultContent = document.querySelector<HTMLElement>(
    "#source-card-content",
  );
  if (!resultContent) throw new Error("The source-card content is missing.");
  expect(resultContent.hidden).toBe(true);
  expect(getComputedStyle(resultContent).display).toBe("none");
  expect(requestState().dataset.state).toBe("error");
});

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: SourceCardViewModel) => void;
  let resolveSecond!: (value: SourceCardViewModel) => void;
  const first = new Promise<SourceCardViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<SourceCardViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<SourceCardLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  const demo = startSourceCardLiveDemo(document, controllerFromLoader(loader));

  const firstLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  const secondLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond(SECOND_RESULT);
  await secondLoad;
  resolveFirst(FIRST_RESULT);
  await firstLoad;
  expect(resultElement().viewModel).toEqual(SECOND_RESULT);
});

function controllerFromLoader(loader: SourceCardLoader): SourceCardController {
  let snapshot: SourceCardControllerSnapshot = {
    attempt: { state: "idle" },
  };
  const listeners = new Set<(value: SourceCardControllerSnapshot) => void>();
  let active: AbortController | undefined;
  let nextId = 1;
  const publish = (next: SourceCardControllerSnapshot): void => {
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
        const viewModel = await loader(request, current.signal);
        if (active !== current || current.signal.aborted) {
          throw current.signal.reason;
        }
        const terminal = viewModel as SourceCardTerminalViewModel;
        active = undefined;
        publish({
          result: { request, viewModel: terminal },
          attempt: { state: "idle" },
        });
        return terminal;
      } catch (error) {
        if (active !== current || current.signal.aborted) {
          throw current.signal.reason;
        }
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
      active = undefined;
      publish({
        ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
        attempt: { state: "idle" },
      });
    },
    dispose: () => {
      active?.abort();
      active = undefined;
      listeners.clear();
      snapshot = { attempt: { state: "idle" } };
    },
  };
}

function selectValue(
  form: HTMLFormElement | null,
  name: string,
  value: string,
): void {
  const select = form?.elements.namedItem(name);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`The ${name} select is missing.`);
  }
  select.value = value;
}

function resultElement(): SefariaSourceCard {
  const element = document.querySelector<SefariaSourceCard>(
    "#source-card-result",
  );
  if (!element) {
    throw new Error("The source-card result element is missing.");
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

function createDataViewModel(label: string): SourceCardDataViewModel {
  return {
    state: "data",
    header: {
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      indexTitle: "Genesis",
      heIndexTitle: "בראשית",
      primaryCategory: "Tanakh",
      categories: ["Tanakh", "Torah"],
    },
    attributions: [
      {
        side: "primary",
        versionTitle: label,
        versionSource: null,
        versionSourceUrl: null,
      },
    ],
    items: [
      {
        position: [],
        pair: {
          state: "partial",
          present: {
            side: "primary",
            view: {
              state: "data",
              ref: "Genesis 1:1",
              heRef: "בראשית א׳:א׳",
              language: "he",
              actualLanguage: "he",
              direction: "rtl",
              bodyHtml: label,
              notes: [],
            },
          },
          absent: { side: "translation", message: "No translation." },
        },
      },
    ],
  };
}
