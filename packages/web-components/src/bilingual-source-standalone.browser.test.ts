import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import { getPreparedState, setPreparedState } from "./prepared-state.js";
import type { BilingualSegmentViewModel } from "./bilingual-segment.js";
import type { SourceCardViewModel } from "./source-card.js";
import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import type {
  SefariaAcquisition,
  SefariaTextAcquisitionRequest,
} from "./acquisition.js";
import { SefariaBilingualSegment } from "./bilingual-segment-element.js";
import { SefariaSourceCard } from "./source-card-element.js";

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

async function settle(element: SefariaBilingualSegment | SefariaSourceCard) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  await element.updateComplete;
  await Promise.all(
    [
      ...(element.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
    ].map((child) => child.updateComplete),
  );
}

function renderedText(
  element: SefariaBilingualSegment | SefariaSourceCard,
): string {
  return [
    ...(element.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ]
    .map((child) => child.shadowRoot?.textContent ?? "")
    .join(" ");
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

test("supplied bilingual data is authoritative and reprojects exact selectors with zero requests", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaBilingualSegment();
  element.sref = "Micah 6:8";
  element.data = textPayload();
  document.body.append(element);
  await settle(element);

  expect(renderedText(element)).toContain("He has shown you");
  element.translationVersionTitle = "No Such Translation";
  await settle(element);
  expect(
    getPreparedState<BilingualSegmentViewModel | SourceCardViewModel>(element)
      ?.state,
  ).toBe("partial");
  expect(element.shadowRoot?.textContent).toContain(
    "No translation text is available.",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("standalone bilingual loading makes one request with both exact role selectors", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    jsonResponse(textPayload()),
  );
  const element = new SefariaBilingualSegment();
  element.sref = "Micah 6:8";
  element.primaryVersionTitle = "Deterministic example Hebrew";
  element.translationVersionTitle = "Deterministic example translation";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);
  await settle(element);

  expect(renderedText(element)).toContain("He has shown you");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const input = fetchMock.mock.calls[0]?.[0];
  const url = new URL(input instanceof Request ? input.url : String(input));
  expect(url.pathname).toBe("/api/v3/texts/Micah%206%3A8");
  expect(url.searchParams.getAll("version")).toEqual([
    "primary|Deterministic example Hebrew",
    "translation|Deterministic example translation",
  ]);
  expect(url.searchParams.get("return_format")).toBe("default");
});

test("removing optional selector attributes restores undefined selectors", async () => {
  const requests: SefariaTextAcquisitionRequest[] = [];
  const element = new SefariaBilingualSegment();
  element.acquisition = {
    kind: "capability",
    capability: {
      getText: async (request) => {
        requests.push(request);
        return { payload: textPayload(), status: 200 };
      },
    },
  };
  element.setAttribute("primary-version-title", "Deterministic example Hebrew");
  element.setAttribute(
    "translation-version-title",
    "Deterministic example translation",
  );
  element.setAttribute("sref", "Micah 6:8");
  document.body.append(element);
  await settle(element);

  element.removeAttribute("primary-version-title");
  element.removeAttribute("translation-version-title");
  element.setAttribute("sref", "");
  await settle(element);
  element.setAttribute("sref", "Micah 6:8");
  await settle(element);

  expect(element.primaryVersionTitle).toBeUndefined();
  expect(element.translationVersionTitle).toBeUndefined();
  expect(requests).toHaveLength(2);
  expect(requests[0]?.versions).toEqual([
    "primary|Deterministic example Hebrew",
    "translation|Deterministic example translation",
  ]);
  expect(requests[1]?.versions).toEqual(["primary", "translation"]);
});

test("removing sref restores the empty default and aborts active work", async () => {
  let requestSignal: AbortSignal | undefined;
  let resolveRequest:
    | ((value: { readonly payload: unknown; readonly status: number }) => void)
    | undefined;
  const response = new Promise<{
    readonly payload: unknown;
    readonly status: number;
  }>((resolve) => {
    resolveRequest = resolve;
  });
  const element = new SefariaBilingualSegment();
  element.acquisition = {
    kind: "capability",
    capability: {
      getText: async (_request, signal) => {
        requestSignal = signal;
        return await response;
      },
    },
  };
  element.setAttribute("sref", "Micah 6:8");
  document.body.append(element);
  await vi.waitFor(() => expect(requestSignal).toBeDefined());

  element.removeAttribute("sref");
  await element.updateComplete;

  expect(element.sref).toBe("");
  expect(requestSignal?.aborted).toBe(true);
  resolveRequest?.({ payload: textPayload(), status: 200 });
  await settle(element);
  expect(element.status).toBe("empty");
});

test("removing scalar presentation attributes restores their defaults", async () => {
  const element = new SefariaBilingualSegment();
  element.setAttribute("content-language", "primary");
  element.setAttribute("layout", "stacked");
  element.setAttribute("side-order", "translation-first");
  element.setAttribute("vocalization-mode", "none");
  document.body.append(element);
  await element.updateComplete;

  element.removeAttribute("content-language");
  element.removeAttribute("layout");
  element.removeAttribute("side-order");
  element.removeAttribute("vocalization-mode");
  await element.updateComplete;

  expect(element.contentLanguage).toBe("both");
  expect(element.layout).toBe("auto");
  expect(element.sideOrder).toBe("primary-first");
  expect(element.vocalizationMode).toBe("taamim_and_nikkud");
});

test("standalone source card uses one v3 request and gives captured children no sref", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    jsonResponse(textPayload()),
  );
  const element = new SefariaSourceCard();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);
  await settle(element);

  expect(renderedText(element)).toContain("He has shown you");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const children = [
    ...(element.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ];
  expect(children).toHaveLength(2);
  expect(children.every((child) => child.sref === "")).toBe(true);
  await Promise.all(children.map((child) => child.updateComplete));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("prepares ten source-card children from one parent request", async () => {
  const original = textPayload();
  const payload: CoreV3TextsResponse = {
    ...original,
    versions: original.versions.map((version) => ({
      ...version,
      text: Array.from({ length: 5 }, () => version.text),
    })),
  };
  const getText = vi.fn(async () => ({ payload, status: 200 }));
  const element = new SefariaSourceCard();
  element.sref = "Micah 6:8-12";
  element.acquisition = {
    kind: "capability",
    capability: { getText },
  };
  document.body.append(element);
  await settle(element);

  const children = [
    ...(element.shadowRoot?.querySelectorAll("sefaria-text-segment") ?? []),
  ];
  expect(children).toHaveLength(10);
  expect(children.every((child) => child.sref === "")).toBe(true);
  expect(getText).toHaveBeenCalledTimes(1);
});

test("supplied source-card candidates reproject exact editions locally with zero requests", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const element = new SefariaSourceCard();
  element.sref = "Micah 6:8";
  element.data = textPayload();
  document.body.append(element);
  await settle(element);

  expect(renderedText(element)).toContain("He has shown you");
  element.translationVersionTitle = "No Such Translation";
  await settle(element);
  const prepared = getPreparedState<SourceCardViewModel>(element);
  expect(prepared?.state).toBe("data");
  expect(prepared?.state === "data" && prepared.items[0]?.pair).toMatchObject({
    state: "partial",
    absent: { side: "translation" },
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("explicit capabilities serve both components without browser fallback", async () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const getText = vi.fn(
    async (_request: SefariaTextAcquisitionRequest, _signal: AbortSignal) => ({
      payload: textPayload(),
      status: 200,
    }),
  );
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability: { getText },
  };
  const bilingual = new SefariaBilingualSegment();
  bilingual.sref = "Micah 6:8";
  bilingual.acquisition = acquisition;
  const card = new SefariaSourceCard();
  card.sref = "Micah 6:8";
  card.acquisition = acquisition;
  document.body.append(bilingual, card);
  await Promise.all([settle(bilingual), settle(card)]);

  expect(getText).toHaveBeenCalledTimes(2);
  expect(getText.mock.calls.map(([request]) => request)).toEqual([
    {
      sref: "Micah 6:8",
      versions: ["primary", "translation"],
      returnFormat: "default",
    },
    {
      sref: "Micah 6:8",
      versions: ["primary", "translation"],
      returnFormat: "default",
    },
  ]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test.each([
  {
    name: "bilingual segment",
    create: () => new SefariaBilingualSegment(),
  },
  {
    name: "source card",
    create: () => new SefariaSourceCard(),
  },
])(
  "invalid supplied data supersedes active $name work without fallback",
  async ({ create }) => {
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        await new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const element = create();
    element.sref = "Micah 6:8";
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
    expect(renderedText(element)).not.toContain("He has shown you");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  },
);

test.each([
  {
    name: "bilingual segment",
    create: () => new SefariaBilingualSegment(),
  },
  {
    name: "source card",
    create: () => new SefariaSourceCard(),
  },
])(
  "invalid acquired data leaves $name in an error state and publishes its cause",
  async ({ create }) => {
    const failure = { versions: [{ text: 42 }] };
    const element = create();
    const errors = vi.fn();
    element.addEventListener(
      element instanceof SefariaBilingualSegment
        ? "sefaria-bilingual-segment-error"
        : "sefaria-source-card-error",
      errors,
    );
    element.sref = "Micah 6:8";
    element.acquisition = {
      kind: "capability",
      capability: {
        getText: async () => ({ payload: failure, status: 200 }),
      },
    };
    document.body.append(element);
    await settle(element);

    expect(
      getPreparedState<BilingualSegmentViewModel | SourceCardViewModel>(
        element,
      ),
    ).toMatchObject({
      state: "error",
      errorKind: "validation",
    });
    expect(element.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]?.[0].detail.error).toBeInstanceOf(Error);
  },
);

test.each([
  {
    name: "bilingual segment",
    create: () => new SefariaBilingualSegment(),
  },
  {
    name: "source card",
    create: () => new SefariaSourceCard(),
  },
])(
  "detached $name input changes reconcile exactly once after reconnect",
  async ({ create }) => {
    const getText = vi.fn(
      async (
        _request: SefariaTextAcquisitionRequest,
        _signal: AbortSignal,
      ) => ({
        payload: textPayload(),
        status: 200,
      }),
    );
    const element = create();
    element.data = textPayload();
    document.body.append(element);
    await settle(element);
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
    await settle(element);
    expect(getText).toHaveBeenCalledTimes(1);
    expect(getText.mock.calls[0]?.[0].sref).toBe("Micah 6:9");
  },
);

test.each([
  {
    name: "bilingual segment",
    create: () => new SefariaBilingualSegment(),
  },
  {
    name: "source card",
    create: () => new SefariaSourceCard(),
  },
])(
  "clearing declarative inputs preserves a synchronously supplied $name view model",
  async ({ create }) => {
    const element = create();
    element.data = textPayload();
    document.body.append(element);
    await settle(element);
    const compatibilityViewModel = {
      state: "loading" as const,
      message: "Host compatibility state.",
    };

    element.data = undefined;
    element.sref = "";
    setPreparedState(element, compatibilityViewModel);
    await element.updateComplete;

    expect(
      getPreparedState<BilingualSegmentViewModel | SourceCardViewModel>(
        element,
      ),
    ).toBe(compatibilityViewModel);
    expect(element.shadowRoot?.textContent).toContain(
      "Host compatibility state.",
    );
  },
);

test.each([
  {
    name: "bilingual segment",
    create: () => new SefariaBilingualSegment(),
  },
  {
    name: "source card",
    create: () => new SefariaSourceCard(),
  },
])(
  "reconnecting an interrupted $name starts one new phase and suppresses the old completion",
  async ({ create }) => {
    const resolvers: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        await new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const element = create();
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
    await settle(element);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolvers[0]?.(jsonResponse(textPayload()));
    await settle(element);
    expect(renderedText(element)).not.toContain("He has shown you");

    resolvers[1]?.(jsonResponse(textPayload()));
    await settle(element);
    expect(renderedText(element)).toContain("He has shown you");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);
