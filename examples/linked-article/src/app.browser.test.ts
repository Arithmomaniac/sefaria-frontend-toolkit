import { createSefariaClient } from "@sefaria/api-client";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { afterEach, expect, test, vi } from "vitest";

import micahPayload from "../../vanilla-vite/src/micah-6-8.json";
import { startLinkedArticle, type LinkedArticleApp } from "./app.js";
import { createLinkedArticleFixtureFetch } from "./fixture-transport.js";

let app: LinkedArticleApp | undefined;
afterEach(() => {
  app?.destroy();
  app = undefined;
  document.body.replaceChildren();
});

function renderArticle(): HTMLAnchorElement[] {
  document.body.innerHTML = `
    <main><article>
      <a href="https://www.sefaria.org/Micah.6.8" data-sefaria-ref="Micah 6:8">Micah 6:8</a>
      <a href="https://www.sefaria.org/Micah.6.8?lang=bi" data-sefaria-ref="Micah 6:8">the prophet's words</a>
    </article><p data-linked-article-status role="status"></p></main>`;
  return [
    ...document.querySelectorAll<HTMLAnchorElement>("[data-sefaria-ref]"),
  ];
}

function start(
  fetch: typeof globalThis.fetch = createLinkedArticleFixtureFetch(
    micahPayload,
  ),
) {
  app = startLinkedArticle(
    document,
    createSefariaClient({
      baseUrl: "https://example.invalid",
      cache: false,
      fetch,
    }),
  );
  return app;
}

function preview() {
  const dialog = document.querySelector("dialog");
  const card = dialog?.querySelector<SefariaSourceCard>("sefaria-source-card");
  const close = dialog?.querySelector("button");
  if (!dialog || !card || !close)
    throw new Error("Host dialog with Source Card is missing.");
  return { dialog, card, close };
}

test("loads one Source Card only after keyboard activation and restores focus on both close paths", async () => {
  const [anchor] = renderArticle();
  const fetch = vi.fn(createLinkedArticleFixtureFetch(micahPayload));
  start(fetch);
  expect(fetch).not.toHaveBeenCalled();
  anchor!.focus();
  const activation = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    detail: 0,
  });
  anchor!.dispatchEvent(activation);
  expect(activation.defaultPrevented).toBe(true);
  const { dialog, card, close } = preview();
  expect(dialog.matches(":modal")).toBe(true);
  expect(dialog.getAttribute("aria-label")).toBe("Sefaria source preview");
  expect(document.activeElement).toBe(close);
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(card.shadowRoot?.querySelectorAll(".item")).toHaveLength(1);
  expect(card.shadowRoot?.textContent).toContain(
    "Deterministic example translation",
  );
  dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  expect(dialog.open).toBe(false);
  expect(card.isConnected).toBe(false);
  expect(document.activeElement).toBe(anchor);
  anchor!.click();
  await vi.waitFor(() => expect(preview().card.status).toBe("ready"));
  expect(fetch).toHaveBeenCalledTimes(2);
  preview().close.click();
  expect(document.activeElement).toBe(anchor);
  expect(document.querySelector("dialog")).toBeNull();
});

test.each([
  { ctrlKey: true },
  { metaKey: true },
  { shiftKey: true },
  { altKey: true },
  { button: 1 },
  { button: 2 },
  { target: "_blank" },
  { download: "" },
  { prevented: true },
])("preserves native activation without requests: %j", async (options) => {
  const [anchor] = renderArticle();
  if ("target" in options) anchor!.target = options.target;
  if ("download" in options) anchor!.download = options.download;
  const fetch = vi.fn(createLinkedArticleFixtureFetch(micahPayload));
  start(fetch);
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  if ("prevented" in options) event.preventDefault();
  let intercepted = false;
  anchor!.addEventListener("click", (observed) => {
    intercepted = observed.defaultPrevented;
    observed.preventDefault();
  });
  anchor!.dispatchEvent(event);
  expect(intercepted).toBe("prevented" in options);
  await Promise.resolve();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector("dialog")).toBeNull();
  expect(anchor!.href).toBe("https://www.sefaria.org/Micah.6.8");
});

test.each(["", "   "])("does not enhance a missing reference %j", (ref) => {
  const [anchor] = renderArticle();
  anchor!.dataset.sefariaRef = ref;
  start();
  expect(anchor!.hasAttribute("aria-controls")).toBe(false);
});

test.each(["Micah 6:8", " Micah 6:8 "])(
  "shows original failures and only retries on new activation: %j",
  async (ref) => {
    const [anchor] = renderArticle();
    anchor!.dataset.sefariaRef = ref;
    const fetch = vi.fn(async () => {
      throw new TypeError("fixture network unavailable");
    });
    start(fetch);
    anchor!.click();
    const status = document.querySelector("[data-linked-article-status]");
    await vi.waitFor(() => expect(status?.getAttribute("role")).toBe("alert"));
    expect(status?.textContent).toContain("fixture network unavailable");
    expect(document.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(anchor);
    expect(fetch).toHaveBeenCalledTimes(1);
    anchor!.click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  },
);

test("close, reopen, ignored abort, and destroy cannot publish obsolete work", async () => {
  const anchors = renderArticle();
  anchors[0]!.setAttribute("aria-controls", "existing-host-control");
  const pending: Array<{
    signal: AbortSignal;
    resolve: (response: Response) => void;
  }> = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return await new Promise<Response>((resolve) =>
      pending.push({ signal: request.signal, resolve }),
    );
  });
  const instance = start(fetch);
  anchors[0]!.click();
  await vi.waitFor(() => expect(pending).toHaveLength(1));
  expect(preview().card.status).toBe("loading");
  anchors[1]!.click();
  await Promise.resolve();
  expect(pending).toHaveLength(1);
  const first = preview();
  first.close.click();
  expect(pending[0]!.signal.aborted).toBe(true);
  expect(document.activeElement).toBe(anchors[1]);
  anchors[1]!.click();
  await vi.waitFor(() => expect(pending).toHaveLength(2));
  const second = preview();
  first.dialog.dispatchEvent(new Event("close"));
  pending[0]!.resolve(Response.json({ malformed: true }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(second.dialog.open).toBe(true);
  expect(second.card.status).toBe("loading");
  expect(document.querySelector("[role=alert]")).toBeNull();
  instance.destroy();
  instance.destroy();
  expect(pending[1]!.signal.aborted).toBe(true);
  expect(document.querySelector("dialog")).toBeNull();
  expect(anchors[0]!.getAttribute("aria-controls")).toBe(
    "existing-host-control",
  );
  expect(anchors[1]!.hasAttribute("aria-controls")).toBe(false);
  pending[1]!.resolve(Response.json(micahPayload));
});

test("uses ordinary Source Card rendering beyond the retired preview limit", async () => {
  const [anchor] = renderArticle();
  const payload = {
    ...micahPayload,
    versions: micahPayload.versions.map((version) => ({
      ...version,
      text: Array.from({ length: 21 }, () => version.text),
    })),
  };
  start(async () => Response.json(payload));
  anchor!.click();
  const { card } = preview();
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  const supplied = document.createElement(
    "sefaria-source-card",
  ) as SefariaSourceCard;
  supplied.data = payload;
  document.body.append(supplied);
  await supplied.updateComplete;
  expect(card.shadowRoot?.querySelectorAll(".item")).toHaveLength(21);
  expect(card.shadowRoot?.textContent).toBe(supplied.shadowRoot?.textContent);
});

test("reports malformed current payload paths without a fallback or retry", async () => {
  const [anchor] = renderArticle();
  const fetch = vi.fn(async () => Response.json({ versions: "invalid" }));
  start(fetch);
  anchor!.click();
  const status = document.querySelector("[data-linked-article-status]");
  await vi.waitFor(() => expect(status?.getAttribute("role")).toBe("alert"));
  expect(status?.textContent).toContain("versions");
  expect(document.activeElement).toBe(anchor);
  expect(document.querySelector("dialog")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test.each([
  { versions: [], status: "empty" },
  { versions: micahPayload.versions.slice(0, 1), status: "ready" },
])(
  "preserves legitimate empty and partial card states: $status",
  async ({ versions, status }) => {
    const [anchor] = renderArticle();
    const fetch = vi.fn(async () =>
      Response.json({ ...micahPayload, versions }),
    );
    start(fetch);
    anchor!.click();
    const { card, dialog } = preview();
    await vi.waitFor(() => expect(card.status).toBe(status));
    expect(dialog.open).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector("[data-linked-article-status]")?.textContent,
    ).toBe("");
  },
);

test("preserves a documented HTTP error as visible card state", async () => {
  const [anchor] = renderArticle();
  start(async () =>
    Response.json({ error: "Reference not found" }, { status: 404 }),
  );
  anchor!.click();
  const { card, dialog } = preview();
  await vi.waitFor(() => expect(card.status).toBe("error"));
  await card.updateComplete;
  expect(dialog.open).toBe(true);
  expect(card.shadowRoot?.querySelector("[role=alert]")?.textContent).toContain(
    "Reference not found",
  );
});

test("supersedes a changed reference and safely closes after the originating link is removed", async () => {
  const anchors = renderArticle();
  anchors[1]!.dataset.sefariaRef = "Micah 6:7";
  const pending: Array<{
    signal: AbortSignal;
    resolve: (response: Response) => void;
  }> = [];
  start(async (input, init) => {
    const request = new Request(input, init);
    return await new Promise<Response>((resolve) =>
      pending.push({ signal: request.signal, resolve }),
    );
  });
  anchors[0]!.click();
  await vi.waitFor(() => expect(pending).toHaveLength(1));
  const { card } = preview();
  anchors[1]!.click();
  await vi.waitFor(() => expect(pending).toHaveLength(2));
  expect(pending[0]!.signal.aborted).toBe(true);
  pending[1]!.resolve(
    Response.json({
      ...micahPayload,
      ref: "Micah 6:7",
      sections: ["6", "7"],
      toSections: ["6", "7"],
    }),
  );
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  pending[0]!.resolve(Response.json(micahPayload));
  await card.updateComplete;
  expect(card.sref).toBe("Micah 6:7");
  anchors[1]!.remove();
  expect(() => preview().close.click()).not.toThrow();
  expect(document.querySelector("dialog")).toBeNull();
});

test.each([
  "http://www.sefaria.org/Micah.6.8",
  "https://example.org/Micah.6.8",
  "https://user@www.sefaria.org/Micah.6.8",
])("does not enhance an ineligible destination %s", (href) => {
  const [anchor] = renderArticle();
  anchor!.href = href;
  start();
  expect(anchor!.hasAttribute("aria-controls")).toBe(false);
});
