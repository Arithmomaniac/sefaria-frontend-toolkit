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

test("assigns typed properties, receives the canonical event, and loads an alias only on submit", async () => {
  const fetch = vi.fn(createMicahFixtureFetch(fixture));
  provider = () =>
    createAlpineSourceCardExample(
      createSefariaClient({
        baseUrl: "https://example.invalid",
        cache: false,
        fetch,
      }),
    );
  root = mountExample();
  const card = await requireReadyCard(root);

  expect(fetch).not.toHaveBeenCalled();
  expect(card.viewModel.state).toBe("data");
  expect(card.getAttribute("viewModel")).toBeNull();
  expect(card.getAttribute("selectedPosition")).toBeNull();

  setSelect(root, "#layout", "stacked");
  setSelect(root, "#side-order", "translation-first");
  setSelect(root, "#vocalization-mode", "none");
  await waitForAlpine();
  expect(card.layout).toBe("stacked");
  expect(card.sideOrder).toBe("translation-first");
  expect(card.vocalizationMode).toBe("none");
  expect(fetch).not.toHaveBeenCalled();

  await card.updateComplete;
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
  expect(fetch).not.toHaveBeenCalled();

  setText(root, 'input[name="tref"]', "micah 6:8");
  click(root, "#load-live");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await vi.waitFor(() =>
    expect(root?.querySelector("#request-status")?.textContent).toBe(
      "Committed canonical reference Micah 6:8.",
    ),
  );
  expect(root.querySelector("#request-count")?.textContent).toContain("1");
  expect(root.querySelector("#committed-ref")?.textContent).toContain(
    "Micah 6:8",
  );
  expect(root.querySelector("#committed-ref")?.textContent).not.toContain(
    "micah 6:8",
  );
  expect(root.querySelector("#selected-ref")?.textContent).toContain(
    "Select the rendered segment",
  );
});

test("labels a failed replacement as prior committed data", async () => {
  let rejectRequest!: (reason: unknown) => void;
  const fetch = vi.fn(
    async () =>
      await new Promise<Response>((_resolve, reject) => {
        rejectRequest = reject;
      }),
  );
  provider = () =>
    createAlpineSourceCardExample(
      createSefariaClient({
        baseUrl: "https://example.invalid",
        cache: false,
        fetch,
      }),
    );
  root = mountExample();
  const card = await requireReadyCard(root);

  click(root, "#load-live");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  rejectRequest(new Error("Network unavailable."));
  await vi.waitFor(() =>
    expect(root?.querySelector("#load-error")?.textContent).toContain(
      "prior committed Micah 6:8",
    ),
  );

  expect(card.viewModel.state).toBe("data");
  expect(root.querySelector("#request-status")?.textContent).toContain(
    "Showing the prior committed Micah 6:8 result",
  );
});

test("destroying the Alpine tree disposes pending controller work once", async () => {
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = new Request(input, init).signal;
    return await new Promise<Response>(() => undefined);
  });
  provider = () =>
    createAlpineSourceCardExample(
      createSefariaClient({
        baseUrl: "https://example.invalid",
        cache: false,
        fetch,
      }),
    );
  root = mountExample();
  await requireReadyCard(root);
  click(root, "#load-live");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

  Alpine.destroyTree(root);
  Alpine.destroyTree(root);

  expect(requestSignal?.aborted).toBe(true);
  expect(
    requestSignal?.reason instanceof Error
      ? requestSignal.reason.message
      : String(requestSignal?.reason),
  ).toContain("disposed");
  root.remove();
  root = undefined;
});

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
    <p id="committed-ref" x-text="committedRef === undefined
      ? 'Current result has no committed canonical reference.'
      : \`Current committed reference: \${committedRef}.\`"></p>
    <p id="load-error" x-text="failure ?? ''"></p>
    <sefaria-source-card
      x-init="$nextTick(() => attach($el, $data))"
      x-effect="syncCard($el, contentLanguage, layout, sideOrder, vocalizationMode, selectable, selectedPosition)"
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
  await vi.waitFor(() => expect(card.viewModel?.state).toBe("data"));
  return card;
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
