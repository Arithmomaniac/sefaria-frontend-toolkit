import Alpine from "alpinejs";
import {
  createSefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { afterEach, expect, test, vi } from "vitest";

import { createMicahFixtureFetch } from "./fixture-transport.js";
import payload from "./micah-6-8.json";
import { createAlpineSourceCardExample } from "./source-card-example.js";

const fixture = zCoreV3TextsResponse.parse(payload);
let provider = () => createAlpineSourceCardExample();
Alpine.data("testedSourceCardExample", () => provider());
let root: HTMLElement | undefined;

afterEach(() => {
  if (root !== undefined) {
    Alpine.destroyTree(root);
    root.remove();
  }
  root = undefined;
  vi.restoreAllMocks();
});

test("assigns declarative data and acquisition, receives selection, and loads only on submit", async () => {
  const fetch = vi.fn(createMicahFixtureFetch(fixture));
  provider = () => createAlpineSourceCardExample(fixtureClient(fetch));
  root = mountExample();
  const card = await requireReadyCard(root);

  expect(fetch).not.toHaveBeenCalled();
  expect(card.data).toEqual(fixture);
  expect(card.sref).toBe("");
  expect(card.acquisition).toEqual(
    expect.objectContaining({ kind: "capability" }),
  );

  setSelect(root, "#layout", "stacked");
  setSelect(root, "#side-order", "translation-first");
  setSelect(root, "#vocalization-mode", "none");
  await waitForAlpine();
  expect(card.getAttribute("layout")).toBe("stacked");
  expect(card.getAttribute("side-order")).toBe("translation-first");
  expect(card.getAttribute("vocalization-mode")).toBe("none");
  expect(card.hasAttribute("selectable")).toBe(true);
  expect(fetch).not.toHaveBeenCalled();

  card.shadowRoot
    ?.querySelector<HTMLButtonElement>(
      'button[aria-label="Show connections for Micah 6:8"]',
    )
    ?.click();
  await waitForAlpine();
  expect(root.querySelector("#selected-ref")?.textContent).toContain(
    "Alpine received selection: Micah 6:8.",
  );
  expect(card.selectedPosition).toEqual([]);

  setText(root, 'input[name="tref"]', "micah 6:8");
  click(root, "#load-live");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(card.data).toBeUndefined();
  expect(card.getAttribute("sref")).toBe("micah 6:8");
  await waitForCardReady(card);
  await vi.waitFor(() =>
    expect(root?.querySelector("#request-status")?.textContent).toBe(
      "Committed canonical reference Micah 6:8.",
    ),
  );
  expect(root.querySelector("#request-count")?.textContent).toContain("1");
  expect(root.querySelector("#selected-ref")?.textContent).toContain(
    "Select the rendered segment",
  );
});

test("lets the element report acquisition errors without a duplicate Alpine alert", async () => {
  const error = new Error("Network unavailable.");
  const fetch = vi.fn(async () => {
    throw error;
  });
  provider = () => createAlpineSourceCardExample(fixtureClient(fetch));
  root = mountExample();
  const card = await requireReadyCard(root);
  const errors: unknown[] = [];
  card.addEventListener("sefaria-source-card-error", (event) => {
    errors.push(
      (event as CustomEvent<{ readonly error: unknown }>).detail.error,
    );
  });

  click(root, "#load-live");
  await vi.waitFor(() => expect(errors).toEqual([error]));
  await card.updateComplete;
  expect(card.status).toBe("error");
  expect(root.querySelector("#load-error")).toBeNull();
});

test("destroying the Alpine tree clears inputs and aborts pending element work", async () => {
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = new Request(input, init).signal;
    return await new Promise<Response>(() => undefined);
  });
  provider = () => createAlpineSourceCardExample(fixtureClient(fetch));
  root = mountExample();
  const card = await requireReadyCard(root);
  click(root, "#load-live");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

  Alpine.destroyTree(root);
  await card.updateComplete;

  expect(requestSignal?.aborted).toBe(true);
  expect(card.getAttribute("sref")).toBe("");
  root.remove();
  root = undefined;
});

function fixtureClient(
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  return createSefariaClient({
    baseUrl: "https://example.invalid",
    cache: false,
    fetch,
  });
}

function mountExample(): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("x-data", "testedSourceCardExample");
  element.innerHTML = `
    <form @submit.prevent="loadReference">
      <input name="tref" x-model="tref">
      <button id="load-live" type="submit">Load reference</button>
    </form>
    <select id="layout" x-model="layout">
      <option value="auto">Automatic</option>
      <option value="stacked">Stacked</option>
    </select>
    <select id="side-order" x-model="sideOrder">
      <option value="primary-first">Primary first</option>
      <option value="translation-first">Translation first</option>
    </select>
    <select id="vocalization-mode" x-model="vocalizationMode">
      <option value="taamim_and_nikkud">Full</option>
      <option value="nikkud">Vowels</option>
      <option value="none">None</option>
    </select>
    <p id="request-status" x-text="status"></p>
    <p id="request-count">Live load attempts: <span x-text="loadAttempts"></span></p>
    <sefaria-source-card
      x-init="$nextTick(() => attach($el, $data))"
      :sref="sref"
      :content-language="contentLanguage"
      :layout="layout"
      :side-order="sideOrder"
      :vocalization-mode="vocalizationMode"
      :selectable="selectable"
      x-effect="syncPresentation($el, selectedPosition)"
      @sefaria-source-select="selectSource($event)"
    ></sefaria-source-card>
    <p id="selected-ref" x-text="selectedRef === undefined
      ? 'Select the rendered segment.'
      : \`Alpine received selection: \${selectedRef}.\`"></p>
  `;
  document.body.append(element);
  Alpine.initTree(element);
  return element;
}

async function requireReadyCard(
  rootElement: ParentNode,
): Promise<SefariaSourceCard> {
  const card = rootElement.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!card) throw new Error("The Alpine source card is missing.");
  await waitForCardReady(card);
  return card;
}

async function waitForCardReady(card: SefariaSourceCard): Promise<void> {
  await vi.waitFor(async () => {
    await card.updateComplete;
    expect(card.status).toBe("ready");
  });
}

function click(rootElement: ParentNode, selector: string): void {
  const button = rootElement.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`${selector} is missing.`);
  button.click();
}

function setText(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const input = rootElement.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setSelect(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const select = rootElement.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`${selector} is missing.`);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForAlpine(): Promise<void> {
  await Promise.resolve();
  await new Promise(requestAnimationFrame);
}
