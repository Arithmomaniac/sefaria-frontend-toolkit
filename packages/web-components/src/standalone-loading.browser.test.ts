import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { html } from "lit";
import { render } from "vitest-browser-lit";
import { afterEach, expect, test, vi } from "vitest";

import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import { SefariaTextSegment, type SefariaAcquisition } from "./index.js";

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

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test("renders authoritative supplied response data with zero requests", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const screen = render(html`
    <sefaria-text-segment
      sref="Micah 6:8"
      .data=${textPayload()}
    ></sefaria-text-segment>
  `);

  await expect
    .element(screen.getByText("הִגִּיד", { exact: false }))
    .toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("renders an already-selected raw fragment with zero requests", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const screen = render(html`
    <sefaria-text-segment
      .data=${{
        kind: "selected",
        ref: "Micah 6:8",
        heRef: "מיכה ו׳:ח׳",
        version: {
          versionTitle: "Selected English",
          language: "en",
          actualLanguage: "en",
          languageFamilyName: "english",
          direction: "ltr",
          text: "Do justice and love mercy.",
        },
      }}
    ></sefaria-text-segment>
  `);

  await expect
    .element(screen.getByText("Do justice and love mercy."))
    .toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("loads sref through an explicit client using the primary API default", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    jsonResponse(textPayload()),
  );
  const acquisition: SefariaAcquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  const screen = render(html`
    <sefaria-text-segment
      sref="Micah 6:8"
      .acquisition=${acquisition}
    ></sefaria-text-segment>
  `);

  await expect
    .element(screen.getByText("הִגִּיד", { exact: false }))
    .toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const requestInput = fetchMock.mock.calls[0]?.[0];
  const requestUrl = new URL(
    requestInput instanceof Request ? requestInput.url : String(requestInput),
  );
  expect(requestUrl.pathname).toBe("/api/v3/texts/Micah%206%3A8");
  expect(requestUrl.searchParams.getAll("version")).toEqual(["primary"]);
  expect(requestUrl.searchParams.get("return_format")).toBe("default");
});

test("loads through an explicit host capability without browser fallback", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const getText = vi.fn(async () => ({
    payload: textPayload(),
    status: 200,
  }));
  const screen = render(html`
    <sefaria-text-segment
      sref="Micah 6:8"
      .acquisition=${{
        kind: "capability",
        capability: { getText },
      }}
    ></sefaria-text-segment>
  `);

  await expect
    .element(screen.getByText("הִגִּיד", { exact: false }))
    .toBeVisible();
  expect(getText).toHaveBeenCalledWith(
    {
      sref: "Micah 6:8",
      versions: ["primary"],
      returnFormat: "default",
    },
    expect.any(AbortSignal),
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("reports an unsupported explicit capability without browser fallback", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const screen = render(html`
    <sefaria-text-segment
      sref="Micah 6:8"
      .acquisition=${{
        kind: "capability",
        capability: {},
      }}
    ></sefaria-text-segment>
  `);

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("does not support text");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("invalid supplied data supersedes pending live work without fallback", async () => {
  let resolveRequest!: (response: Response) => void;
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
  );
  const acquisition: SefariaAcquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  const element = new SefariaTextSegment();
  element.sref = "Micah 6:8";
  element.acquisition = acquisition;
  document.body.append(element);
  await element.updateComplete;
  expect(fetchMock).toHaveBeenCalledTimes(1);

  element.data = { versions: [{ text: 42 }] } as never;
  await element.updateComplete;

  expect(element.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  resolveRequest(jsonResponse(textPayload()));
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
  expect(element.shadowRoot?.textContent).not.toContain("הִגִּיד");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("reconnect resumes an interrupted load without accepting the old completion", async () => {
  const resolvers: Array<(response: Response) => void> = [];
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      await new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  const element = new SefariaTextSegment();
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
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
  expect(fetchMock).toHaveBeenCalledTimes(2);

  resolvers[0]?.(jsonResponse(textPayload()));
  await new Promise((resolve) => setTimeout(resolve));
  expect(element.shadowRoot?.textContent).not.toContain("הִגִּיד");

  resolvers[1]?.(jsonResponse(textPayload()));
  await new Promise((resolve) => setTimeout(resolve, 100));
  await element.updateComplete;
  expect(element.shadowRoot?.textContent).toContain("הִגִּיד");
});

test("detached input changes reconcile exactly once after reconnect", async () => {
  const getText = vi.fn(async () => ({
    payload: textPayload(),
    status: 200,
  }));
  const element = new SefariaTextSegment();
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
  expect(getText).toHaveBeenCalledWith(
    expect.objectContaining({ sref: "Micah 6:9" }),
    expect.any(AbortSignal),
  );
});

test("preserves a network failure cause and does not retry it on reconnect", async () => {
  const failure = new TypeError("network unavailable");
  const fetchMock = vi.fn<typeof fetch>(async () => {
    throw failure;
  });
  const element = new SefariaTextSegment();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  const errors: unknown[] = [];
  element.addEventListener("sefaria-text-segment-error", (event) => {
    errors.push(
      (event as CustomEvent<{ readonly error: unknown }>).detail.error,
    );
  });
  document.body.append(element);
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;

  expect(element.shadowRoot?.textContent).toContain("network unavailable");
  expect(errors).toEqual([failure]);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  element.remove();
  document.body.append(element);
  await new Promise((resolve) => setTimeout(resolve));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("restores committed content after a rejected live replacement", async () => {
  const failure = new TypeError("replacement unavailable");
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: {
      getText: vi.fn(async () => {
        throw failure;
      }),
    },
  };
  const element = new SefariaTextSegment();
  element.data = {
    kind: "selected",
    ref: "Micah 6:8",
    heRef: "מיכה ו׳:ח׳",
    version: {
      versionTitle: "Selected English",
      language: "en",
      actualLanguage: "en",
      languageFamilyName: "english",
      direction: "ltr",
      text: "Do justice and love mercy.",
    },
  };
  document.body.append(element);
  await element.updateComplete;
  expect(element.status).toBe("ready");

  const errors: unknown[] = [];
  element.addEventListener("sefaria-text-segment-error", (event) => {
    errors.push(
      (event as CustomEvent<{ readonly error: unknown }>).detail.error,
    );
  });
  element.data = undefined;
  element.sref = "Micah 6:9";
  element.acquisition = acquisition;
  await element.updateComplete;
  expect(element.status).toBe("loading");
  expect(element.shadowRoot?.textContent).toContain("Loading Micah 6:9");

  await vi.waitFor(() => {
    expect(element.status).toBe("error");
  });
  await element.updateComplete;
  expect(element.shadowRoot?.textContent).toContain(
    "Do justice and love mercy.",
  );
  expect(element.shadowRoot?.textContent).not.toContain(
    "replacement unavailable",
  );
  expect(errors).toEqual([failure]);
});
