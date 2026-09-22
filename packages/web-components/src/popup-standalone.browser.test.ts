import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import { getPreparedState } from "./prepared-state.js";
import type { PopupViewModel } from "./popup.js";
import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import type { SefariaAcquisition } from "./acquisition.js";
import { SefariaPopup } from "./popup-element.js";

function textPayload(): CoreV3TextsResponse {
  if (!validateGetV3Texts200(micahFixture)) {
    throw new TypeError("Expected a valid Micah 6:8 fixture.");
  }
  return structuredClone(micahFixture) as CoreV3TextsResponse;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function settle(element: SefariaPopup): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
}

async function waitForState(
  element: SefariaPopup,
  state: PopupViewModel["state"],
): Promise<void> {
  await vi.waitFor(() => {
    expect(getPreparedState<PopupViewModel>(element)?.state).toBe(state);
  });
  await element.updateComplete;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test("prepares Micah 6:8 while closed and visibility changes make no requests", async () => {
  let resolveRequest!: (response: Response) => void;
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const element = new SefariaPopup();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);

  expect(element.open).toBe(false);
  await vi.waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("loading");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const requestInput = fetchMock.mock.calls[0]?.[0];
  const requestUrl = new URL(
    requestInput instanceof Request ? requestInput.url : String(requestInput),
  );
  expect(requestUrl.pathname).toBe("/api/v3/texts/Micah%206%3A8");
  expect(requestUrl.searchParams.getAll("version")).toEqual([
    "primary",
    "translation",
  ]);
  expect(requestUrl.searchParams.get("return_format")).toBe("default");

  element.open = true;
  await element.updateComplete;
  element.open = false;
  await element.updateComplete;

  resolveRequest(jsonResponse(textPayload()));
  await waitForState(element, "data");

  element.open = true;
  await element.updateComplete;

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("data");
});

test("renders authoritative supplied Micah 6:8 data with zero requests", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaPopup();
  element.sref = "Micah 6:8";
  element.data = textPayload();
  element.open = true;
  document.body.append(element);

  await waitForState(element, "data");

  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("data");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("invalid supplied data supersedes pending work and never falls back", async () => {
  let resolveRequest!: (response: Response) => void;
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const element = new SefariaPopup();
  element.sref = "Micah 6:8";
  element.open = true;
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);
  await element.updateComplete;
  expect(fetchMock).toHaveBeenCalledTimes(1);

  element.data = { versions: [{ text: 42 }] };
  await element.updateComplete;

  expect(element.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  resolveRequest(jsonResponse(textPayload()));
  await settle(element);
  expect(element.shadowRoot?.textContent).not.toContain("הִגִּיד");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("loads through an explicit capability without browser fallback", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const getText = vi.fn<
    NonNullable<
      Extract<
        SefariaAcquisition,
        { kind: "capability" }
      >["capability"]["getText"]
    >
  >(async () => ({ payload: textPayload(), status: 200 }));
  const element = new SefariaPopup();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText },
  };
  document.body.append(element);

  await waitForState(element, "data");

  expect(getText).toHaveBeenCalledTimes(1);
  expect(getText.mock.calls[0]?.[0]).toEqual({
    sref: "Micah 6:8",
    versions: ["primary", "translation"],
    returnFormat: "default",
  });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("data");
});

test("suppresses stale results and resumes an interrupted load on reconnect", async () => {
  const resolvers: Array<(response: Response) => void> = [];
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  const element = new SefariaPopup();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);
  await element.updateComplete;
  expect(fetchMock).toHaveBeenCalledTimes(1);

  element.remove();
  document.body.append(element);
  await vi.waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  resolvers[0]?.(jsonResponse(textPayload()));
  await settle(element);
  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("loading");

  resolvers[1]?.(jsonResponse(textPayload()));
  await waitForState(element, "data");
  expect(getPreparedState<PopupViewModel>(element)?.state).toBe("data");

  element.remove();
  document.body.append(element);
  await settle(element);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("detached input changes reconcile exactly once after reconnect", async () => {
  const getText = vi.fn(async () => ({
    payload: textPayload(),
    status: 200,
  }));
  const element = new SefariaPopup();
  element.data = textPayload();
  document.body.append(element);
  await element.updateComplete;
  element.remove();

  element.data = undefined;
  element.sref = "Micah 6:9";
  element.acquisition = {
    kind: "capability",
    capability: { getText },
  };
  await element.updateComplete;
  expect(getText).not.toHaveBeenCalled();

  document.body.append(element);
  await vi.waitFor(() => {
    expect(getText).toHaveBeenCalledTimes(1);
  });
});
