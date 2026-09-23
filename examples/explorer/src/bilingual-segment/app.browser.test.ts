import type {
  SefariaAcquisition,
  SefariaAcquisitionResponse,
  SefariaBilingualSegment,
  SefariaTextAcquisitionRequest,
} from "@arithmomaniac/sefaria-web-components";
import { beforeEach, expect, test, vi } from "vitest";

import micahFixture from "../../../react-vite/src/micah-6-8.json";
import { startBilingualSegmentLiveDemo } from "./app.js";

type BilingualLoader = (
  request: SefariaTextAcquisitionRequest,
  signal: AbortSignal,
) => Promise<SefariaAcquisitionResponse>;

beforeEach(() => {
  document.body.innerHTML = `
    <form id="bilingual-request-form">
      <input name="tref" value="Genesis 1:1">
      <input name="primaryVersionTitle" value="">
      <input name="translationVersionTitle" value="">
      <button type="submit">Load pair</button>
    </form>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1:1"
      data-primary-version-title="Miqra according to the Masorah"
      data-translation-version-title="The Contemporary Torah, Jewish Publication Society, 2006"
    >Exact editions</button>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1"
    >Wrong granularity</button>
    <form id="display-form">
      <select name="contentLanguage">
        <option value="both" selected>Both</option>
        <option value="primary">Primary</option>
      </select>
      <select name="layout">
        <option value="auto" selected>Auto</option>
        <option value="stacked">Stacked</option>
      </select>
      <select name="sideOrder">
        <option value="primary-first" selected>Primary first</option>
        <option value="translation-first">Translation first</option>
      </select>
    </form>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <sefaria-bilingual-segment id="bilingual-result"></sefaria-bilingual-segment>
  `;
});

test("loads a preset through declarative public inputs", async () => {
  const loader = vi.fn<BilingualLoader>(async () => response("First result"));
  startBilingualSegmentLiveDemo(document, acquisitionFromLoader(loader));

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("ready"));

  expect(loader.mock.calls[0]?.[0]).toEqual({
    sref: "Genesis 1:1",
    versions: [
      "primary|Miqra according to the Masorah",
      "translation|The Contemporary Torah, Jewish Publication Society, 2006",
    ],
    returnFormat: "default",
  });
  expect(renderedText()).toContain("First result");
});

test("omits an unfilled edition instead of requesting a blank title", async () => {
  const loader = vi.fn<BilingualLoader>(async () => response("Result"));
  startBilingualSegmentLiveDemo(document, acquisitionFromLoader(loader));

  const presets = document.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  );
  presets[1]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({
    sref: "Genesis 1",
    versions: ["primary", "translation"],
    returnFormat: "default",
  });
});

test("applies display settings without requesting", () => {
  const loader = vi.fn<BilingualLoader>(async () => response("Result"));
  startBilingualSegmentLiveDemo(document, acquisitionFromLoader(loader));

  const displayForm = document.querySelector<HTMLFormElement>("#display-form");
  selectValue(displayForm, "contentLanguage", "primary");
  selectValue(displayForm, "layout", "stacked");
  selectValue(displayForm, "sideOrder", "translation-first");
  displayForm?.dispatchEvent(new Event("change", { bubbles: true }));

  expect(resultElement().contentLanguage).toBe("primary");
  expect(resultElement().layout).toBe("stacked");
  expect(resultElement().sideOrder).toBe("translation-first");
  expect(loader).not.toHaveBeenCalled();
});

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: SefariaAcquisitionResponse) => void;
  let resolveSecond!: (value: SefariaAcquisitionResponse) => void;
  const first = new Promise<SefariaAcquisitionResponse>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<SefariaAcquisitionResponse>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<BilingualLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  startBilingualSegmentLiveDemo(document, acquisitionFromLoader(loader));

  const presets = document.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  );
  presets[0]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  presets[1]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond(response("Second result"));
  await vi.waitFor(() => expect(renderedText()).toContain("Second result"));
  resolveFirst(response("First result"));
  await Promise.resolve();
  expect(renderedText()).not.toContain("First result");
});

test("shows a network failure outside the cleared component", async () => {
  const loader = vi.fn<BilingualLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startBilingualSegmentLiveDemo(document, acquisitionFromLoader(loader));

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toContain("Network unavailable");
  expect(resultElement().status).toBe("error");
});

function acquisitionFromLoader(loader: BilingualLoader): SefariaAcquisition {
  return { kind: "capability", capability: { getText: loader } };
}

function response(label: string): SefariaAcquisitionResponse {
  const payload = structuredClone(micahFixture);
  payload.ref = "Genesis 1:1";
  payload.heRef = "בראשית א׳:א׳";
  payload.versions[0]!.versionTitle = "Miqra according to the Masorah";
  payload.versions[0]!.text = `${label} primary`;
  payload.versions[1]!.versionTitle =
    "The Contemporary Torah, Jewish Publication Society, 2006";
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

function resultElement(): SefariaBilingualSegment {
  const element =
    document.querySelector<SefariaBilingualSegment>("#bilingual-result");
  if (!element) {
    throw new Error("The bilingual result element is missing.");
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
