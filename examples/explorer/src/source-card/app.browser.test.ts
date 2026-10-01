import type {
  SefariaDataSource,
  SefariaDataLoaderResponse,
  SefariaSourceCard,
  SefariaTextLoadRequest,
} from "@arithmomaniac/sefaria-web-components";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import micahFixture from "../../../react-vite/src/micah-6-8.json";
import captures from "../../../../packages/web-components/test/fixtures/translation-preference-2026-09-27.json";
import { startSourceCardLiveDemo } from "./app.js";
import v3Fixture from "../../../../packages/client/test/fixtures/v3-text-spanning-2026-08-29.json" with { type: "json" };

type SourceCardLoader = (
  request: SefariaTextLoadRequest,
  signal: AbortSignal,
) => Promise<SefariaDataLoaderResponse>;

beforeEach(() => {
  document.body.innerHTML = `
    <form id="source-card-form">
      <input name="tref" value="Genesis 1:1-3">
      <input name="primaryVersionTitle" value="">
      <input name="translationVersionTitle" value="">
      <input name="translationLanguage" value="">
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

test.each(["micahFrench", "berakhotDefault"] as const)(
  "language controls acquire and attribute %s only after activation",
  async (name) => {
    const loader = vi.fn<SourceCardLoader>(
      async (): Promise<SefariaDataLoaderResponse> => ({
        payload:
          name === "berakhotDefault" && loader.mock.calls.length === 1
            ? captures.berakhotMissingFrench.payload
            : captures[name].payload,
        status: 200,
      }),
    );
    const demo = startSourceCardLiveDemo(document, sourceFromLoader(loader));
    const input = document.querySelector<HTMLInputElement>(
      'input[name="translationLanguage"]',
    )!;
    input.value = "french";
    document.querySelector<HTMLInputElement>('input[name="tref"]')!.value =
      captures[name].payload.ref;
    expect(loader).not.toHaveBeenCalled();
    await demo.loadCurrentRequest();
    expect(loader.mock.calls.map(([request]) => request.versions)).toEqual(
      name === "micahFrench"
        ? [["primary", "french"]]
        : [
            ["primary", "french"],
            ["primary", "translation"],
          ],
    );
    expect(resultElement().shadowRoot?.textContent).toContain(
      captures[name].payload.versions[1]!.versionTitle,
    );
    const form = document.querySelector<HTMLFormElement>("#display-form");
    selectValue(form, "contentLanguage", "primary");
    form?.dispatchEvent(new Event("change"));
    await resultElement().updateComplete;
    expect(loader).toHaveBeenCalledTimes(name === "micahFrench" ? 1 : 2);
  },
);

test("reuses the completed declarative request", async () => {
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
  expect(resultElement().status).not.toBe("loading");
});

test("loads a preset through declarative public inputs", async () => {
  const loader = vi.fn<SourceCardLoader>(async () => response("First"));
  startSourceCardLiveDemo(document, sourceFromLoader(loader));

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() =>
    expect(requestState().textContent).toContain(
      "1 items. See the edition attribution",
    ),
  );

  expect(loader.mock.calls[0]?.[0]).toEqual({
    sref: "Likutei Moharan 1",
    versions: ["primary", "translation"],
    returnFormat: "default",
  });
  expect(renderedText()).toContain("First");
});

test("applies display settings without requesting", () => {
  const loader = vi.fn<SourceCardLoader>(async () => response("First"));
  startSourceCardLiveDemo(document, sourceFromLoader(loader));
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
  const loader = vi.fn<SourceCardLoader>(async () => response("First"));
  startSourceCardLiveDemo(document, sourceFromLoader(loader));
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
    if (loader.mock.calls.length === 1) return response("First");
    return await new Promise<SefariaDataLoaderResponse>((_resolve, reject) => {
      rejectSecond = reject;
    });
  });
  const demo = startSourceCardLiveDemo(document, sourceFromLoader(loader));

  await demo.loadCurrentRequest();
  const committed = resultElement().shadowRoot?.textContent;
  const form = document.querySelector<HTMLFormElement>("#source-card-form");
  const tref = form?.elements.namedItem("tref");
  if (!(tref instanceof HTMLInputElement)) {
    throw new Error("The tref input is missing.");
  }
  tref.value = "Micah 6:8";
  const failedLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  rejectSecond(new Error("Network unavailable."));
  await failedLoad;

  expect(resultElement().shadowRoot?.textContent).toBe(committed);
  expect(resultElement().status).toBe("error");
  expect(requestState().dataset.state).toBe("error");
  expect(document.querySelector<HTMLElement>("#host-error")?.textContent).toBe(
    "Network unavailable.",
  );
});

test("hides an initial loading placeholder after a transport failure", async () => {
  const loader = vi.fn<SourceCardLoader>(async () => {
    throw new Error("Network unavailable.");
  });
  const demo = startSourceCardLiveDemo(document, sourceFromLoader(loader));

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
  let resolveFirst!: (value: SefariaDataLoaderResponse) => void;
  let resolveSecond!: (value: SefariaDataLoaderResponse) => void;
  const first = new Promise<SefariaDataLoaderResponse>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<SefariaDataLoaderResponse>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<SourceCardLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  const demo = startSourceCardLiveDemo(document, sourceFromLoader(loader));
  const form = document.querySelector<HTMLFormElement>("#source-card-form");
  const tref = form?.elements.namedItem("tref");
  if (!(tref instanceof HTMLInputElement)) {
    throw new Error("The tref input is missing.");
  }

  const firstLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  tref.value = "Micah 6:8";
  const secondLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond(response("Second"));
  await secondLoad;
  resolveFirst(response("First"));
  await firstLoad;
  expect(renderedText()).toContain("Second");
  expect(renderedText()).not.toContain("First");
});

function sourceFromLoader(loader: SourceCardLoader): SefariaDataSource {
  return { kind: "custom", loader: { getText: loader } };
}

function response(label: string): SefariaDataLoaderResponse {
  const payload = structuredClone(micahFixture);
  payload.versions[0]!.text = `${label} primary`;
  payload.versions[1]!.text = `${label} translation`;
  return { payload, status: 200 };
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

function renderedText(): string {
  return [
    ...(resultElement().shadowRoot?.querySelectorAll("sefaria-text-segment") ??
      []),
  ]
    .map((segment) => segment.shadowRoot?.textContent ?? "")
    .join(" ");
}
