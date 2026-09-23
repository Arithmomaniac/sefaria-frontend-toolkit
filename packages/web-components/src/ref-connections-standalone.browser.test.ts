import {
  createSefariaClient,
  validateGetRef200,
  zCoreLinkResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreRefResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import refFixture from "../../client/test/fixtures/ref-genesis-segment-2026-09-03.json";
import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import type { SefariaAcquisition } from "./acquisition.js";
import { SefariaConnectionsPanel } from "./connections-panel-element.js";
import { SefariaRefLabel } from "./ref-label-element.js";

function referencePayload(): CoreRefResponse {
  const payload = structuredClone(refFixture);
  Object.assign(payload, {
    normalized: "Micah 6:8",
    hebrew: "מיכה ו׳:ח׳",
    url_ref: "Micah.6.8",
    index_title: "Micah",
  });
  if (!validateGetRef200(payload)) {
    throw new TypeError("Expected a valid Micah 6:8 reference payload.");
  }
  return payload as CoreRefResponse;
}

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

test("authoritative supplied data renders both components with zero requests and local connections projection", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);

  const label = new SefariaRefLabel();
  label.data = referencePayload();
  document.body.append(label);

  const connections = new SefariaConnectionsPanel();
  connections.category = "Commentary";
  connections.data = linksPayload();
  document.body.append(connections);

  await Promise.all([label.updateComplete, connections.updateComplete]);
  expect(label.shadowRoot?.textContent).toContain("Micah 6:8");
  expect(connections.shadowRoot?.textContent).toContain("Rashi on Micah 6:8");
  connections.page = 1;
  await connections.updateComplete;
  expect(connections.shadowRoot?.textContent).toContain(
    "No entries on this page",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("detached input changes reconcile exactly once after reconnect", async () => {
  const resolveReference = vi.fn(async () => ({
    payload: referencePayload(),
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: { resolveReference, getLinks },
  };
  const label = new SefariaRefLabel();
  label.data = referencePayload();
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.data = linksPayload();
  document.body.append(connections);
  await Promise.all([label.updateComplete, connections.updateComplete]);
  label.remove();
  connections.remove();

  label.data = undefined;
  label.sref = "Micah 6:9";
  label.acquisition = acquisition;
  connections.data = undefined;
  connections.sref = "Micah 6:9";
  connections.acquisition = acquisition;
  await Promise.all([label.updateComplete, connections.updateComplete]);
  expect(resolveReference).not.toHaveBeenCalled();
  expect(getLinks).not.toHaveBeenCalled();

  document.body.append(label, connections);
  await vi.waitFor(() => {
    expect(resolveReference).toHaveBeenCalledTimes(1);
    expect(getLinks).toHaveBeenCalledTimes(1);
  });
});

test("explicit clients use getRef and getLinks with the default withText request", async () => {
  const refFetch = vi.fn<typeof fetch>(async () =>
    jsonResponse(referencePayload()),
  );
  const linksFetch = vi.fn<typeof fetch>(async () =>
    jsonResponse(linksPayload()),
  );
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: refFetch }),
  };
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: linksFetch }),
  };
  document.body.append(connections);

  await settle();
  await Promise.all([label.updateComplete, connections.updateComplete]);
  expect(label.shadowRoot?.textContent).toContain("Micah 6:8");
  expect(refFetch).toHaveBeenCalledTimes(1);
  const refRequest = refFetch.mock.calls[0]?.[0] as Request;
  expect(new URL(refRequest.url).pathname).toBe("/api/ref/Micah%206%3A8");
  expect(linksFetch).toHaveBeenCalledTimes(1);
  const linksRequest = linksFetch.mock.calls[0]?.[0] as Request;
  const linksUrl = new URL(linksRequest.url);
  expect(linksUrl.pathname).toBe("/api/links/Micah%206%3A8");
  expect(linksUrl.searchParams.get("with_text")).toBe("1");
  expect(linksUrl.searchParams.get("with_sheet_links")).toBe("0");
});

test("explicit capabilities receive resolveReference and getLinks operations", async () => {
  const resolveReference = vi.fn(async () => ({
    payload: referencePayload(),
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: { resolveReference, getLinks },
  };
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.acquisition = acquisition;
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.withText = false;
  connections.acquisition = acquisition;
  document.body.append(connections);

  await settle();
  expect(resolveReference).toHaveBeenCalledWith(
    { sref: "Micah 6:8" },
    expect.any(AbortSignal),
  );
  expect(getLinks).toHaveBeenCalledWith(
    { sref: "Micah 6:8", withText: false },
    expect.any(AbortSignal),
  );
});

test("invalid acquired data leaves both components in error states and publishes each cause", async () => {
  const labelErrors = vi.fn();
  const label = new SefariaRefLabel();
  label.addEventListener("sefaria-ref-label-error", labelErrors);
  label.sref = "Micah 6:8";
  label.acquisition = {
    kind: "capability",
    capability: {
      resolveReference: async () => ({
        payload: { normalized: 42 },
        status: 200,
      }),
    },
  };
  document.body.append(label);

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
    expect(label.status).toBe("error");
    expect(connections.status).toBe("error");
  });
  expect(label.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]'),
  ).not.toBeNull();
  expect(labelErrors).toHaveBeenCalledTimes(1);
  expect(connectionsErrors).toHaveBeenCalledTimes(1);
  expect(labelErrors.mock.calls[0]?.[0].detail.error).toBeInstanceOf(Error);
  expect(connectionsErrors.mock.calls[0]?.[0].detail.error).toBeInstanceOf(
    Error,
  );
});

test("invalid supplied data immediately supersedes active work without live fallback", async () => {
  let resolveRef!: (response: Response) => void;
  let resolveLinks!: (response: Response) => void;
  const refFetch = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveRef = resolve;
      }),
  );
  const linksFetch = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveLinks = resolve;
      }),
  );
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: refFetch }),
  };
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: linksFetch }),
  };
  document.body.append(connections);
  await Promise.all([label.updateComplete, connections.updateComplete]);

  label.data = { normalized: 42 };
  connections.data = [{ _id: 42 }];
  await Promise.all([label.updateComplete, connections.updateComplete]);
  expect(label.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]'),
  ).not.toBeNull();

  resolveRef(jsonResponse(referencePayload()));
  resolveLinks(jsonResponse(linksPayload()));
  await settle();
  expect(label.shadowRoot?.textContent).not.toContain("מיכה");
  expect(connections.shadowRoot?.textContent).not.toContain("Rashi on Micah");
  expect(refFetch).toHaveBeenCalledTimes(1);
  expect(linksFetch).toHaveBeenCalledTimes(1);
});

test("disabled and unsupported acquisition produce explicit accessible errors", async () => {
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.acquisition = { kind: "disabled" };
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.acquisition = { kind: "capability", capability: {} };
  document.body.append(connections);

  await settle();
  expect(
    label.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("disabled");
  expect(
    connections.shadowRoot?.querySelector('[role="alert"]')?.textContent,
  ).toContain("does not support links");
});

test("clearing supplied data resumes retained references while clearing both inputs stays empty", async () => {
  const resolveReference = vi.fn(async () => ({
    payload: referencePayload(),
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({
    payload: linksPayload(),
    status: 200,
  }));
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: { resolveReference, getLinks },
  };
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.data = referencePayload();
  label.acquisition = acquisition;
  document.body.append(label);
  const connections = new SefariaConnectionsPanel();
  connections.sref = "Micah 6:8";
  connections.data = linksPayload();
  connections.acquisition = acquisition;
  document.body.append(connections);
  await Promise.all([label.updateComplete, connections.updateComplete]);

  label.data = undefined;
  connections.data = undefined;
  await settle();
  expect(resolveReference).toHaveBeenCalledTimes(1);
  expect(getLinks).toHaveBeenCalledTimes(1);

  label.data = referencePayload();
  connections.data = linksPayload();
  await Promise.all([label.updateComplete, connections.updateComplete]);
  label.data = undefined;
  label.sref = "";
  connections.data = undefined;
  connections.sref = "";
  await Promise.all([label.updateComplete, connections.updateComplete]);
  expect(label.shadowRoot?.textContent).toBe("");
  expect(connections.shadowRoot?.textContent).toBe("");
  expect(resolveReference).toHaveBeenCalledTimes(1);
  expect(getLinks).toHaveBeenCalledTimes(1);
});

test("disconnect and reconnect resume interrupted work while network failures do not retry", async () => {
  const refResolvers: Array<(response: Response) => void> = [];
  const refFetch = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        refResolvers.push(resolve);
      }),
  );
  const label = new SefariaRefLabel();
  label.sref = "Micah 6:8";
  label.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: refFetch }),
  };
  document.body.append(label);
  await label.updateComplete;
  label.remove();
  document.body.append(label);
  await settle();
  expect(refFetch).toHaveBeenCalledTimes(2);
  refResolvers[0]?.(jsonResponse(referencePayload()));
  await settle();
  expect(label.shadowRoot?.textContent).not.toContain("מיכה");
  refResolvers[1]?.(jsonResponse(referencePayload()));
  await settle();
  expect(label.shadowRoot?.textContent).toContain("Micah 6:8");

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
