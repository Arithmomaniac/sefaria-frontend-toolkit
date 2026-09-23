import {
  createSefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import payload from "./micah-6-8.json";
import { ReactSourceCardExample } from "./app.js";
import { createMicahFixtureFetch } from "./fixture-transport.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const fixture = zCoreV3TextsResponse.parse(payload);
let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("supplies data declaratively, preserves presentation controls, and receives selection", async () => {
  const fetch = vi.fn(createMicahFixtureFetch(fixture));
  const container = mount(
    <ReactSourceCardExample client={fixtureClient(fetch)} />,
  );
  const card = requireCard(container);

  await waitForCardReady(card);
  expect(fetch).not.toHaveBeenCalled();
  expect(card.data).toEqual(fixture);
  expect(card.sref).toBe("");
  expect(card.acquisition).toEqual(
    expect.objectContaining({ kind: "capability" }),
  );
  expect(card.getAttribute("data")).toBeNull();

  await act(async () => {
    click(container, "#theme-toggle");
    setRange(container, "#preview-width", "520");
    setSelect(container, "#layout", "stacked");
    setSelect(container, "#side-order", "translation-first");
    setSelect(container, "#vocalization-mode", "none");
  });

  expect(requireCard(container)).toBe(card);
  expect(fetch).not.toHaveBeenCalled();
  expect(card.layout).toBe("stacked");
  expect(card.sideOrder).toBe("translation-first");
  expect(card.vocalizationMode).toBe("none");
  expect(container.querySelector<HTMLElement>("#preview")?.dataset.theme).toBe(
    "dark",
  );
  const withoutMarks = await renderedHebrew(card);

  await act(async () => {
    setSelect(container, "#vocalization-mode", "taamim_and_nikkud");
  });
  expect(await renderedHebrew(card)).not.toBe(withoutMarks);
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => {
    card.shadowRoot
      ?.querySelector<HTMLButtonElement>(
        'button[aria-label="Show connections for Micah 6:8"]',
      )
      ?.click();
  });
  expect(container.querySelector("#selected-ref")?.textContent).toContain(
    "Micah 6:8",
  );
  expect(card.selectedPosition).toEqual([]);
});

test("activates acquisition only on submit and rejects stale overlapping results", async () => {
  let firstSignal: AbortSignal | undefined;
  let resolveFirst!: (response: Response) => void;
  let requestNumber = 0;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (++requestNumber === 1) {
      firstSignal = request.signal;
      return await new Promise<Response>((resolve) => {
        resolveFirst = resolve;
      });
    }
    return Response.json(fixture);
  });
  const container = mount(
    <ReactSourceCardExample client={fixtureClient(fetch)} />,
  );
  const card = requireCard(container);
  await waitForCardReady(card);
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => {
    setTextInput(container, 'input[name="tref"]', "micah 6:8");
    click(container, "#load-live");
  });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(card.data).toBeUndefined();
  expect(card.sref).toBe("micah 6:8");

  await act(async () => {
    setTextInput(container, 'input[name="tref"]', "Micah 6:8");
    click(container, "#load-live");
  });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await waitForCardReady(card);
  await vi.waitFor(() =>
    expect(container.querySelector("#request-status")?.textContent).toBe(
      "Committed canonical reference Micah 6:8.",
    ),
  );
  expect(firstSignal?.aborted).toBe(true);
  expect(container.querySelector("#request-count")?.textContent).toContain("2");
  expect(container.querySelector("#selected-ref")?.textContent).toContain(
    "Select the rendered segment",
  );

  await act(async () => {
    resolveFirst(Response.json({ ...fixture, ref: "Obadiah 1:1" }));
    await waitForReact();
  });
  expect(container.querySelector("#request-status")?.textContent).toBe(
    "Committed canonical reference Micah 6:8.",
  );
});

test("keeps blank validation host-owned without changing an admitted request", async () => {
  let resolveRequest!: (response: Response) => void;
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requestSignal = request.signal;
    return await new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
  });
  const container = mount(
    <ReactSourceCardExample client={fixtureClient(fetch)} />,
  );

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => {
    setTextInput(container, 'input[name="tref"]', "   ");
    click(container, "#load-live");
  });

  expect(container.querySelector("#input-error")?.textContent).toBe(
    "Enter a non-blank Sefaria reference.",
  );
  expect(fetch).toHaveBeenCalledOnce();
  expect(requestSignal?.aborted).toBe(false);

  await act(async () => {
    resolveRequest(Response.json(fixture));
    await waitForReact();
  });
  await waitForCardReady(requireCard(container));
});

test("lets the element own acquisition failures without duplicate host announcements", async () => {
  const error = new Error("Network unavailable.");
  const fetch = vi.fn(async () => {
    throw error;
  });
  const container = mount(
    <ReactSourceCardExample client={fixtureClient(fetch)} />,
  );
  const card = requireCard(container);
  const errors: unknown[] = [];
  card.addEventListener("sefaria-source-card-error", (event) => {
    errors.push(
      (event as CustomEvent<{ readonly error: unknown }>).detail.error,
    );
  });

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(errors).toEqual([error]));
  await card.updateComplete;

  expect(
    card.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("Network unavailable.");
  expect(container.querySelector("#load-error")).toBeNull();
  expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
});

test("StrictMode makes no mount request and disconnection aborts pending work", async () => {
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = new Request(input, init).signal;
    return await new Promise<Response>(() => undefined);
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <StrictMode>
        <ReactSourceCardExample client={fixtureClient(fetch)} />
      </StrictMode>,
    );
  });
  expect(fetch).not.toHaveBeenCalled();

  await act(async () => click(container, "#load-live"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await act(async () => root?.unmount());
  root = undefined;

  expect(requestSignal?.aborted).toBe(true);
  expect(
    requestSignal?.reason instanceof Error
      ? requestSignal.reason.message
      : String(requestSignal?.reason),
  ).toContain("disconnected");
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

function mount(node: React.ReactNode): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

function requireCard(rootElement: ParentNode): SefariaSourceCard {
  const card = rootElement.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!card) throw new Error("The React source card is missing.");
  return card;
}

function click(rootElement: ParentNode, selector: string): void {
  const button = rootElement.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`${selector} is missing.`);
  button.click();
}

function setRange(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const input = rootElement.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  setNativeValue(HTMLInputElement.prototype, input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setTextInput(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const input = rootElement.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} is missing.`);
  setNativeValue(HTMLInputElement.prototype, input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setSelect(
  rootElement: ParentNode,
  selector: string,
  value: string,
): void {
  const select = rootElement.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`${selector} is missing.`);
  setNativeValue(HTMLSelectElement.prototype, select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeValue(
  prototype: object,
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
): void {
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) throw new Error("The native value setter is missing.");
  setter.call(element, value);
}

async function waitForReact(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise(requestAnimationFrame);
  }
}

async function waitForCardReady(card: SefariaSourceCard): Promise<void> {
  await act(async () => {
    await vi.waitFor(async () => {
      await card.updateComplete;
      expect(card.status).toBe("ready");
    });
  });
}

async function renderedHebrew(card: SefariaSourceCard): Promise<string> {
  await card.updateComplete;
  const segments = [
    ...(card.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ] as Array<
    HTMLElement & {
      readonly updateComplete: Promise<boolean>;
      readonly shadowRoot: ShadowRoot | null;
    }
  >;
  for (const segment of segments) {
    await segment.updateComplete;
  }
  return segments
    .map((segment) => segment.shadowRoot?.textContent ?? "")
    .join();
}
