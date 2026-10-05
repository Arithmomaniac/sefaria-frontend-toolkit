import {
  createSefariaClient,
  zCoreLinkResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
} from "@sefaria/api-client";
import { afterEach, expect, test, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
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

test("Connections Panel does not expose public data", () => {
  const element = new SefariaConnectionsPanel();
  expect("data" in element).toBe(false);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test("explicit clients use getLinks with the default withText request", async () => {
  const linksFetch = vi.fn<typeof fetch>(async () =>
    jsonResponse(linksPayload()),
  );
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.source = {
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
  connections.source = { kind: "custom", loader: { getLinks } };
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
  connections.source = {
    kind: "custom",
    loader: {
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

test("unsupported source produces an explicit accessible error", async () => {
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.source = { kind: "custom", loader: {} };
  document.body.append(connections);

  await settle();
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("does not support links");
});

test("network failures do not retry after reconnect", async () => {
  const failure = new Error("offline");
  const linksFetch = vi.fn<typeof fetch>(async () => {
    throw failure;
  });
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.source = {
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
