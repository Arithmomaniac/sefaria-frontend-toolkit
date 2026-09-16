import capturedLinks from "../../../../packages/client/test/fixtures/links-connections-preview-2026-09-06.json";
import textFixture from "../../../../packages/client/test/fixtures/v3-text-spanning-2026-08-29.json";
import { afterEach, expect, test, vi } from "vitest";

import packagedAppHtml from "../../dist/app/mcp-app.html?raw";
import { createLiveHost, type LiveHost } from "./live-host.js";

let host: LiveHost | undefined;

afterEach(async () => {
  await host?.close();
  host = undefined;
  document.body.replaceChildren();
});

test("waits for a click, then uses the real in-memory MCP resource and AppBridge path", async () => {
  const requests: string[] = [];
  const elements = mountHost();
  host = createLiveHost({
    ...elements,
    loadAppHtml: async () => packagedAppHtml,
    fetch: fixtureFetch(requests),
    timeoutMs: 4_000,
  });

  expect(requests).toEqual([]);
  expect(host.state.ready).toBe(false);

  elements.startButton.click();

  await vi.waitFor(() => expect(host?.state.ready).toBe(true), {
    timeout: 4_000,
  });
  await vi.waitFor(() => expect(requests).toHaveLength(2), {
    timeout: 4_000,
  });
  expect(host.state.tools).toEqual(["get_text", "get_links_between_texts"]);
  expect(host.state.resourceUri).toBe("ui://sefaria/source-card.html");
  expect(host.state.resourceMatchesPackagedApp).toBe(true);
  expect(
    requests.map((request) => {
      const url = new URL(request);
      return [url.pathname, url.searchParams.get("with_text")];
    }),
  ).toEqual([
    ["/api/v3/texts/Micah%206%3A8", null],
    ["/api/links/Micah%206%3A8", "1"],
  ]);
  expect(elements.frame.contentDocument).toBeNull();
  expect(elements.status.textContent).toContain("Live MCP demo started");
});

test("bounds initialization failure, cleans up, and makes no Sefaria request", async () => {
  const requests: string[] = [];
  const elements = mountHost();
  host = createLiveHost({
    ...elements,
    loadAppHtml: async () =>
      "<!doctype html><html><head></head><body>No MCP App script</body></html>",
    fetch: fixtureFetch(requests),
    timeoutMs: 1_000,
  });

  elements.startButton.click();

  await vi.waitFor(
    () => expect(elements.status.getAttribute("role")).toBe("alert"),
    { timeout: 4_000 },
  );
  expect(elements.status.textContent).toContain("did not initialize");
  expect(elements.startButton.disabled).toBe(false);
  expect(elements.frame.getAttribute("src")).toBeNull();
  expect(requests).toEqual([]);
});

test("closing during startup prevents requests and disposes the pending session", async () => {
  const requests: string[] = [];
  const elements = mountHost();
  let releaseApp: (() => void) | undefined;
  const appReady = new Promise<void>((resolve) => {
    releaseApp = resolve;
  });
  host = createLiveHost({
    ...elements,
    loadAppHtml: async () => {
      await appReady;
      return packagedAppHtml;
    },
    fetch: fixtureFetch(requests),
    timeoutMs: 4_000,
  });

  elements.startButton.click();
  await host.close();
  releaseApp?.();
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(requests).toEqual([]);
  expect(host.state.ready).toBe(false);
  expect(elements.frame.getAttribute("src")).toBeNull();
});

function mountHost() {
  document.body.innerHTML = `
    <main id="app">
      <button id="start-live-demo" type="button">Start live demo</button>
      <p id="status"></p>
      <iframe id="sandbox"></iframe>
    </main>`;
  return {
    startButton: requiredElement<HTMLButtonElement>("start-live-demo"),
    status: requiredElement<HTMLElement>("status"),
    frame: requiredElement<HTMLIFrameElement>("sandbox"),
  };
}

function fixtureFetch(requests: string[]) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    requests.push(url.href);
    if (url.pathname.startsWith("/api/v3/texts/")) {
      return Response.json(micahTextPayload());
    }
    if (url.pathname.startsWith("/api/links/")) {
      return Response.json(capturedLinks);
    }
    throw new Error(`Unexpected request: ${url.href}`);
  };
}

function micahTextPayload() {
  const payload = structuredClone(textFixture);
  return {
    ...payload,
    ref: "Micah 6:8",
    heRef: "Micah 6:8",
    sections: ["6", "8"],
    toSections: ["6", "8"],
    sectionRef: "Micah 6",
    heSectionRef: "Micah 6",
    firstAvailableSectionRef: "Micah 6:8",
    isSpanning: false,
    spanningRefs: [],
    next: null,
    prev: null,
    title: "Micah 6",
    book: "Micah",
    heTitle: "Micah",
    indexTitle: "Micah",
    heIndexTitle: "Micah",
    order: [14, 6],
    titleVariants: ["Micah"],
    heTitleVariants: ["Micah"],
    versions: payload.versions.map((version, index) => ({
      ...version,
      versionTitle: index === 0 ? "Micah source fixture" : version.versionTitle,
      text: ["What is good: do justice, love mercy, and walk humbly."],
    })),
  };
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}.`);
  return element;
}
