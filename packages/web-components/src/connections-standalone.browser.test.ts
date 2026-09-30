import {
  createSefariaClient,
  zCoreLinkResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import type { SefariaAcquisition } from "./acquisition.js";
import { SefariaConnectionsPanel } from "./connections-panel-element.js";

function linksPayload(): CoreLinkResponse {
  const parsed = zCoreLinkResponse.parse(linksFixture);
  if (!Array.isArray(parsed) || !parsed[0] || "isSheet" in parsed[0]) {
    throw new TypeError("Expected a text-link fixture.");
  }
  const first = parsed[0] as CoreLinkObject;
  return [
    {
      ...first,
      _id: "micah-commentary",
      category: "Commentary",
      anchorRef: "Micah 6:8",
      anchorRefExpanded: ["Micah 6:8"],
      sourceRef: "Rashi on Micah 6:8",
      sourceHeRef: 'רש"י על מיכה ו׳:ח׳',
      index_title: "Rashi on Micah",
    },
  ];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test("authoritative supplied data renders with zero requests and local connections projection", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);

  const connections = new SefariaConnectionsPanel();
  connections.category = "Commentary";
  connections.data = linksPayload();
  document.body.append(connections);

  await connections.updateComplete;
  expect(connections.shadowRoot?.textContent).toContain("Rashi on Micah 6:8");
  connections.page = 1;
  await connections.updateComplete;
  expect(connections.shadowRoot?.textContent).toContain(
    "No entries on this page",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("detached input changes reconcile exactly once after reconnect", async () => {
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: { getLinks },
  };
  const connections = new SefariaConnectionsPanel();
  connections.data = linksPayload();
  document.body.append(connections);
  await connections.updateComplete;
  connections.remove();

  connections.data = undefined;
  connections.sref = "Micah 6:9";
  connections.acquisition = acquisition;
  await connections.updateComplete;
  expect(getLinks).not.toHaveBeenCalled();

  document.body.append(connections);
  await vi.waitFor(() => {
    expect(getLinks).toHaveBeenCalledTimes(1);
  });
});

test("explicit clients use getLinks with the default withText request", async () => {
  const linksFetch = vi.fn<typeof fetch>(async () =>
    jsonResponse(linksPayload()),
  );
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: linksFetch }),
  };
  document.body.append(connections);

  await settle();
  await connections.updateComplete;
  expect(linksFetch).toHaveBeenCalledTimes(1);
  const linksRequest = linksFetch.mock.calls[0]?.[0] as Request;
  const linksUrl = new URL(linksRequest.url);
  expect(linksUrl.pathname).toBe("/api/links/Micah%206%3A8");
  expect(linksUrl.searchParams.get("with_text")).toBe("1");
  expect(linksUrl.searchParams.get("with_sheet_links")).toBe("0");
});

test("explicit capabilities receive getLinks operations", async () => {
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.withText = false;
  connections.acquisition = { kind: "capability", capability: { getLinks } };
  document.body.append(connections);

  await settle();
  expect(getLinks).toHaveBeenCalledWith(
    { sref: "Micah 6:8", withText: false },
    expect.any(AbortSignal),
  );
});

test("invalid acquired data leaves the panel in an error state and publishes the cause", async () => {
  const connectionsErrors = vi.fn();
  const connections = new SefariaConnectionsPanel();
  connections.addEventListener(
    "sefaria-connections-panel-error",
    connectionsErrors,
  );
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "capability",
    capability: {
      getLinks: async () => ({
        payload: [{ _id: 42 }],
        status: 200,
      }),
    },
  };
  document.body.append(connections);

  await vi.waitFor(() => {
    expect(connections.status).toBe("error");
  });
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]'),
  ).not.toBeNull();
  expect(connectionsErrors).toHaveBeenCalledTimes(1);
  expect(connectionsErrors.mock.calls[0]?.[0].detail.error).toBeInstanceOf(
    Error,
  );
});

test("invalid supplied data immediately supersedes active work without live fallback", async () => {
  let resolveLinks!: (response: Response) => void;
  const linksFetch = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveLinks = resolve;
      }),
  );
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: linksFetch }),
  };
  document.body.append(connections);
  await connections.updateComplete;

  connections.data = [{ _id: 42 }];
  await connections.updateComplete;
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]'),
  ).not.toBeNull();

  resolveLinks(jsonResponse(linksPayload()));
  await settle();
  expect(connections.shadowRoot?.textContent).not.toContain("Rashi on Micah");
  expect(linksFetch).toHaveBeenCalledTimes(1);
});

test("unsupported acquisition produces an explicit accessible error", async () => {
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = { kind: "capability", capability: {} };
  document.body.append(connections);

  await settle();
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("does not support links");
});

test("clearing supplied data resumes retained references while clearing both inputs stays empty", async () => {
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.data = linksPayload();
  connections.acquisition = { kind: "capability", capability: { getLinks } };
  document.body.append(connections);
  await connections.updateComplete;

  connections.data = undefined;
  await settle();
  expect(getLinks).toHaveBeenCalledTimes(1);

  connections.data = linksPayload();
  await connections.updateComplete;
  connections.data = undefined;
  connections.sref = "";
  await connections.updateComplete;
  expect(connections.shadowRoot?.textContent).toBe("");
  expect(getLinks).toHaveBeenCalledTimes(1);
});

test("network failures do not retry after reconnect", async () => {
  const failure = new Error("offline");
  const linksFetch = vi.fn<typeof fetch>(async () => {
    throw failure;
  });
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: linksFetch }),
  };
  document.body.append(connections);
  await settle();
  expect(connections.shadowRoot?.textContent).toContain("offline");
  connections.remove();
  document.body.append(connections);
  await settle();
  expect(linksFetch).toHaveBeenCalledTimes(1);
});
