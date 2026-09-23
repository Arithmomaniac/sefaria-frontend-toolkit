import {
  createSefariaClient,
  zCoreV3TextsResponse,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import { getPreparedState } from "./prepared-state.js";
import type { ReaderViewModel } from "./reader.js";
import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import type { SefariaAcquisition } from "./acquisition.js";
import { SefariaReader } from "./reader-element.js";
import type { ReaderRawSeedData } from "./reader.js";

const micahTarget = zCoreV3TextsResponse.parse(
  micahFixture,
) as CoreV3TextsResponse;

function micahContext(): CoreV3TextsResponse {
  const payload = structuredClone(micahTarget);
  payload.ref = payload.sectionRef;
  payload.heRef = payload.heSectionRef;
  payload.sections = payload.sections.slice(0, -1);
  payload.toSections = payload.toSections.slice(0, -1);
  for (const version of payload.versions) {
    if (Array.isArray(version.text)) {
      throw new TypeError("Expected scalar Micah target text.");
    }
    const target = version.text;
    version.text = Array.from({ length: 8 }, (_, index) =>
      index === 7 ? target : `Synthetic Micah 6:${index + 1}.`,
    );
  }
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function micahVerse(verse: number): CoreV3TextsResponse {
  const payload = structuredClone(micahTarget);
  payload.ref = `Micah 6:${verse}`;
  payload.sections = ["6", String(verse)];
  payload.toSections = ["6", String(verse)];
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function micahSevenTarget(): CoreV3TextsResponse {
  const payload = structuredClone(micahTarget);
  payload.ref = "Micah 7:1";
  payload.heRef = "Micah 7:1";
  payload.sections = ["7", "1"];
  payload.toSections = ["7", "1"];
  payload.sectionRef = "Micah 7";
  payload.heSectionRef = "Micah 7";
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function micahSevenContext(): CoreV3TextsResponse {
  const payload = structuredClone(micahSevenTarget());
  payload.ref = payload.sectionRef;
  payload.heRef = payload.heSectionRef;
  payload.sections = ["7"];
  payload.toSections = ["7"];
  for (const version of payload.versions) {
    version.text = [version.text];
  }
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

function connectionsState(element: SefariaReader): string | undefined {
  const connections = getPreparedState<ReaderViewModel>(element)?.connections;
  return connections?.state === "component"
    ? connections.viewModel.state
    : connections?.state;
}

function rawSourceSeed(): NonNullable<ReaderRawSeedData["source"]> {
  return {
    payload: micahContext(),
    status: 200,
    effectiveRequest: { tref: "Micah 6" },
  };
}

function rawConnectionsSeed(): NonNullable<ReaderRawSeedData["connections"]> {
  return {
    payload: [],
    status: 200,
    effectiveRequest: { tref: "Micah 6:8", withText: true },
  };
}

test("loads Micah 6:8 progressively through an explicit client and preserves a failed root", async () => {
  let resolveLinks!: (response: Response) => void;
  const requests: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = decodeURIComponent(url.pathname);
    requests.push(path);
    if (path === "/api/v3/texts/Micah 6:8") {
      return jsonResponse(micahTarget);
    }
    if (path === "/api/v3/texts/Micah 6") {
      return jsonResponse(micahContext());
    }
    if (path === "/api/links/Micah 6:8") {
      return await new Promise<Response>((resolve) => {
        resolveLinks = resolve;
      });
    }
    if (path === "/api/links/Micah 6:7") {
      throw new Error("Links unavailable.");
    }
    if (path === "/api/v3/texts/Missing") {
      return jsonResponse({ error: "Unknown text." }, 404);
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "client",
    client: createSefariaClient({ cache: false, fetch: fetchMock }),
  };
  document.body.append(element);

  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:8");
  });
  expect(requests).toEqual([
    "/api/v3/texts/Micah 6:8",
    "/api/v3/texts/Micah 6",
    "/api/links/Micah 6:8",
  ]);
  expect(getPreparedState<ReaderViewModel>(element)?.connections?.state).toBe(
    "component",
  );
  expect(connectionsState(element)).toBe("loading");

  element.sref = "Micah 6:8";
  await element.updateComplete;
  expect(requests).toHaveLength(3);

  resolveLinks(jsonResponse([]));
  await vi.waitFor(() => {
    expect(connectionsState(element)).not.toBe("loading");
  });

  element.sref = "Micah 6:7";
  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:7");
    expect(getPreparedState<ReaderViewModel>(element)?.connections?.state).toBe(
      "unavailable",
    );
  });
  const committedEntry =
    getPreparedState<ReaderViewModel>(element)?.currentEntryId;

  const errors: Array<{ error: unknown; sref: string }> = [];
  element.addEventListener("sefaria-reader-error", (event) => {
    errors.push(
      (event as CustomEvent<{ error: unknown; sref: string }>).detail,
    );
  });
  element.sref = "Missing";
  await vi.waitFor(() => {
    expect(element.status).toBe("error");
    expect(element.shadowRoot?.textContent).toContain("Unknown text.");
  });
  expect(errors).toHaveLength(1);
  expect(errors[0]?.sref).toBe("Missing");
  expect(errors[0]?.error).toBeInstanceOf(Error);
  expect(getPreparedState<ReaderViewModel>(element)?.currentEntryId).toBe(
    committedEntry,
  );
  expect(getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref).toBe(
    "Micah 6:7",
  );
});

test("reports the original failure when a Reader root replacement fails", async () => {
  const failure = new Error("Root unavailable.");
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => {
    if (sref === "Micah 7:1") throw failure;
    return {
      payload: sref === "Micah 6" ? micahContext() : micahTarget,
      status: 200,
    };
  });
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));

  const errors: unknown[] = [];
  element.addEventListener("sefaria-reader-error", (event) => {
    errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
  });
  element.sref = "Micah 7:1";
  await vi.waitFor(() => expect(errors).toHaveLength(1));
  expect(errors[0]).toBe(failure);
});

test("reports a root failure after resuming an interrupted replacement", async () => {
  const failure = new Error("Resumed root unavailable.");
  let rootAttempts = 0;
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => {
    if (sref === "Micah 7:1") {
      if (++rootAttempts === 1) {
        return await new Promise<{ payload: CoreV3TextsResponse; status: 200 }>(
          () => {},
        );
      }
      throw failure;
    }
    return {
      payload: sref === "Micah 6" ? micahContext() : micahTarget,
      status: 200,
    };
  });
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  const errors: unknown[] = [];
  element.addEventListener("sefaria-reader-error", (event) => {
    errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
  });

  element.sref = "Micah 7:1";
  await vi.waitFor(() => expect(rootAttempts).toBe(1));
  element.remove();
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("error"));
  expect(rootAttempts).toBe(2);
  expect(errors).toEqual([failure]);
});

test("resumes only interrupted links after reconnect through a host capability", async () => {
  const linkResolvers: Array<
    (value: { payload: unknown; status: number }) => void
  > = [];
  const getText = vi.fn<
    NonNullable<
      Extract<
        SefariaAcquisition,
        { kind: "capability" }
      >["capability"]["getText"]
    >
  >(async ({ sref }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn<
    NonNullable<
      Extract<
        SefariaAcquisition,
        { kind: "capability" }
      >["capability"]["getLinks"]
    >
  >(
    async () =>
      await new Promise((resolve) => {
        linkResolvers.push(resolve);
      }),
  );
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);

  await vi.waitFor(() => {
    expect(getLinks).toHaveBeenCalledTimes(1);
  });
  expect(getText).toHaveBeenCalledTimes(2);

  element.remove();
  document.body.append(element);
  await vi.waitFor(() => {
    expect(getLinks).toHaveBeenCalledTimes(2);
  });
  expect(getText).toHaveBeenCalledTimes(2);

  linkResolvers[0]?.({ payload: [], status: 200 });
  await Promise.resolve();
  expect(connectionsState(element)).toBe("loading");

  linkResolvers[1]?.({ payload: [], status: 200 });
  await vi.waitFor(() => {
    expect(connectionsState(element)).not.toBe("loading");
  });
  expect(getText).toHaveBeenCalledTimes(2);
});

test("reconciles a changed root instead of resuming disconnected links", async () => {
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload:
      sref === "Micah 6"
        ? micahContext()
        : sref === "Micah 7"
          ? micahSevenContext()
          : sref === "Micah 7:1"
            ? micahSevenTarget()
            : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn(
    async () =>
      await new Promise<{ payload: unknown; status: number }>(() => {}),
  );
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(getLinks).toHaveBeenCalledTimes(1));

  element.remove();
  element.sref = "Micah 7:1";
  document.body.append(element);
  await vi.waitFor(() => {
    expect(getText.mock.calls.map(([request]) => request.sref)).toContain(
      "Micah 7:1",
    );
    expect(element.selectedRef).toBe("Micah 7:1");
  });
});

test("honors an acquisition change made while disconnected after a completed load", async () => {
  const oldGetText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const oldGetLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const newGetText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const newGetLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText: oldGetText, getLinks: oldGetLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));

  element.remove();
  element.acquisition = {
    kind: "capability",
    capability: { getText: newGetText, getLinks: newGetLinks },
  };
  await element.updateComplete;
  document.body.append(element);
  await vi.waitFor(() => expect(newGetLinks).toHaveBeenCalledTimes(1));
  expect(newGetText).toHaveBeenCalledTimes(2);
  expect(oldGetText).toHaveBeenCalledTimes(2);
});

test("disabling acquisition stops the previous Reader controller", async () => {
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));

  element.acquisition = { kind: "disabled" };
  await vi.waitFor(() => expect(element.status).toBe("error"));
  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: {
        originEntryId: element.currentEntryId,
        targetRef: "Micah 6:7",
      },
    }),
  );
  await element.updateComplete;
  expect(getText).toHaveBeenCalledTimes(2);
  expect(getLinks).toHaveBeenCalledTimes(1);
  expect(element.status).toBe("error");
});

test("navigates and returns Back with zero additional capability calls", async () => {
  const getText = vi.fn<
    NonNullable<
      Extract<
        SefariaAcquisition,
        { kind: "capability" }
      >["capability"]["getText"]
    >
  >(async ({ sref }) => ({
    payload:
      sref === "Micah 6"
        ? micahContext()
        : sref === "Micah 6:7"
          ? micahVerse(7)
          : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn<
    NonNullable<
      Extract<
        SefariaAcquisition,
        { kind: "capability" }
      >["capability"]["getLinks"]
    >
  >(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:8");
  });

  const rootEntryId =
    getPreparedState<ReaderViewModel>(element)!.currentEntryId;
  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: { originEntryId: rootEntryId, targetRef: "Micah 6:7" },
    }),
  );
  await vi.waitFor(() => {
    expect(getPreparedState<ReaderViewModel>(element)?.currentEntryId).not.toBe(
      rootEntryId,
    );
  });
  const textCalls = getText.mock.calls.length;
  const linksCalls = getLinks.mock.calls.length;

  element.dispatchEvent(
    new CustomEvent("sefaria-reader-back", {
      detail: {
        originEntryId:
          getPreparedState<ReaderViewModel>(element)!.currentEntryId,
      },
    }),
  );
  await vi.waitFor(() => {
    expect(getPreparedState<ReaderViewModel>(element)?.currentEntryId).toBe(
      rootEntryId,
    );
  });
  expect(getText).toHaveBeenCalledTimes(textCalls);
  expect(getLinks).toHaveBeenCalledTimes(linksCalls);
});

test("admits source and links raw data transactionally with zero requests", async () => {
  const getText = vi.fn(async () => ({
    payload: micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const data: ReaderRawSeedData = {
    source: rawSourceSeed(),
    connections: rawConnectionsSeed(),
    selectedRef: "Micah 6:8",
    presentation: { layout: "stacked" },
  };
  const element = new SefariaReader();
  element.data = data;
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);

  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:8");
  });
  expect(element.layout).toBe("stacked");
  expect(getText).not.toHaveBeenCalled();
  expect(getLinks).not.toHaveBeenCalled();

  element.requestUpdate();
  await element.updateComplete;
  expect(getText).not.toHaveBeenCalled();
  expect(getLinks).not.toHaveBeenCalled();
});

test("supplied data supersedes an ignored-abort initial load", async () => {
  let resolveText!: (value: {
    readonly payload: CoreV3TextsResponse;
    readonly status: 200;
  }) => void;
  const getText = vi.fn(
    async () =>
      await new Promise<{
        readonly payload: CoreV3TextsResponse;
        readonly status: 200;
      }>((resolve) => {
        resolveText = resolve;
      }),
  );
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:7";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => {
    expect(getText).toHaveBeenCalledTimes(1);
  });
  expect(element.rootLoading).toBe(true);

  element.data = {
    source: rawSourceSeed(),
    connections: rawConnectionsSeed(),
    selectedRef: "Micah 6:8",
  };
  await vi.waitFor(() => {
    expect(element.selectedRef).toBe("Micah 6:8");
  });
  expect(element.rootLoading).toBe(false);

  resolveText({ payload: micahVerse(7), status: 200 });
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
  expect(element.selectedRef).toBe("Micah 6:8");
  expect(getLinks).not.toHaveBeenCalled();
});

test("invalid authoritative data never falls through after another input changes", async () => {
  const getText = vi.fn(async () => ({
    payload: micahTarget,
    status: 200,
  }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.data = { source: { payload: {}, status: 200 } } as never;
  document.body.append(element);
  await vi.waitFor(() => {
    expect(element.status).toBe("error");
  });

  element.acquisition = {
    kind: "capability",
    capability: { getText },
  };
  await element.updateComplete;
  expect(element.status).toBe("error");
  expect(getText).not.toHaveBeenCalled();
});

test("preserves host presentation through loading and navigation", async () => {
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload:
      sref === "Micah 6"
        ? micahContext()
        : sref === "Micah 6:8"
          ? micahTarget
          : micahVerse(7),
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.vocalizationMode = "none";
  element.layout = "stacked";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => {
    expect(element.status).toBe("ready");
  });
  expect(element.vocalizationMode).toBe("none");
  expect(element.layout).toBe("stacked");

  element.vocalizationMode = "nikkud";
  await element.updateComplete;
  const originEntryId = element.currentEntryId!;
  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: { originEntryId, targetRef: "Micah 6:7" },
    }),
  );
  await vi.waitFor(() => {
    expect(element.selectedRef).toBe("Micah 6:7");
  });
  expect(element.vocalizationMode).toBe("nikkud");
  expect(element.layout).toBe("stacked");

  element.vocalizationMode = "none";
  await element.updateComplete;
  element.shadowRoot
    ?.querySelector<HTMLButtonElement>('[data-action="back"]')
    ?.click();
  await vi.waitFor(() => {
    expect(element.selectedRef).toBe("Micah 6:8");
  });
  expect(element.vocalizationMode).toBe("nikkud");
  expect(element.layout).toBe("stacked");
});

test("preserves presentation changes made during initial and replacement root loads", async () => {
  let resolveInitial!: (value: {
    readonly payload: CoreV3TextsResponse;
    readonly status: 200;
  }) => void;
  let resolveReplacement!: (value: {
    readonly payload: CoreV3TextsResponse;
    readonly status: 200;
  }) => void;
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => {
    if (sref === "Micah 6:8") {
      return await new Promise<{
        readonly payload: CoreV3TextsResponse;
        readonly status: 200;
      }>((resolve) => {
        resolveInitial = resolve;
      });
    }
    if (sref === "Micah 7:1") {
      return await new Promise<{
        readonly payload: CoreV3TextsResponse;
        readonly status: 200;
      }>((resolve) => {
        resolveReplacement = resolve;
      });
    }
    if (sref === "Micah 7") {
      return { payload: micahSevenContext(), status: 200 as const };
    }
    return { payload: micahContext(), status: 200 as const };
  });
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => {
    expect(getText).toHaveBeenCalledTimes(1);
  });

  element.vocalizationMode = "none";
  element.layout = "stacked";
  await element.updateComplete;
  resolveInitial({ payload: micahTarget, status: 200 });
  await vi.waitFor(() => {
    expect(element.status).toBe("ready");
  });
  expect(element.vocalizationMode).toBe("none");
  expect(element.layout).toBe("stacked");

  element.sref = "Micah 7:1";
  await vi.waitFor(() => {
    expect(getText).toHaveBeenCalledTimes(3);
  });
  element.vocalizationMode = "nikkud";
  element.layout = "side-by-side";
  await element.updateComplete;
  resolveReplacement({ payload: micahSevenTarget(), status: 200 });
  await vi.waitFor(() => {
    expect(element.selectedRef).toBe("Micah 7:1");
  });
  expect(element.vocalizationMode).toBe("nikkud");
  expect(element.layout).toBe("side-by-side");
});

test("continues a source-only seed with one links call and never duplicates source I/O", async () => {
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahVerse(7),
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const data: ReaderRawSeedData = {
    source: rawSourceSeed(),
    selectedRef: "Micah 6:8",
  };
  const element = new SefariaReader();
  element.data = data;
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);

  await vi.waitFor(() => {
    expect(getLinks).toHaveBeenCalledTimes(1);
    expect(connectionsState(element)).not.toBe("loading");
  });
  expect(getText).not.toHaveBeenCalled();

  element.data = undefined;
  element.sref = "Micah 6:7";
  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:7");
  });
  expect(getText).not.toHaveBeenCalled();
  expect(getLinks).toHaveBeenCalledTimes(2);
});

test("keeps an unchanged raw seed when sref changes while connected", async () => {
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.data = { source: rawSourceSeed(), selectedRef: "Micah 6:8" };
  element.acquisition = {
    kind: "capability",
    capability: { getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(getLinks).toHaveBeenCalledTimes(1);

  element.sref = "Micah 7:1";
  await element.updateComplete;
  expect(element.status).toBe("ready");
  expect(element.selectedRef).toBe("Micah 6:8");
  expect(getLinks).toHaveBeenCalledTimes(1);
});

test("admits a links-only seed without continuation", async () => {
  const getText = vi.fn(async () => ({
    payload: micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.data = { connections: rawConnectionsSeed() };
  element.acquisition = {
    kind: "capability",
    capability: { getText, getLinks },
  };
  document.body.append(element);

  await vi.waitFor(() => {
    expect(getPreparedState<ReaderViewModel>(element)?.connections?.state).toBe(
      "component",
    );
  });
  expect(getPreparedState<ReaderViewModel>(element)?.source).toBeUndefined();
  expect(getText).not.toHaveBeenCalled();
  expect(getLinks).not.toHaveBeenCalled();
});

test("invalid or conflicting raw data cannot replace committed content", async () => {
  const element = new SefariaReader();
  element.data = {
    source: rawSourceSeed(),
    connections: rawConnectionsSeed(),
    selectedRef: "Micah 6:8",
  };
  document.body.append(element);
  await vi.waitFor(() => {
    expect(
      getPreparedState<ReaderViewModel>(element)?.selectedTarget?.ref,
    ).toBe("Micah 6:8");
  });
  const committed = getPreparedState<ReaderViewModel>(element);

  element.data = {
    source: {
      payload: { versions: [{ text: 42 }] },
      status: 200,
      effectiveRequest: { tref: "Micah 6" },
    },
    selectedRef: "Micah 6:8",
  };
  await vi.waitFor(() => {
    expect(element.status).toBe("error");
    expect(element.shadowRoot?.textContent).toContain("versions");
  });
  expect(getPreparedState<ReaderViewModel>(element)).toBe(committed);

  element.sref = "Micah 7:1";
  element.data = {
    source: rawSourceSeed(),
    connections: rawConnectionsSeed(),
    selectedRef: "Micah 6:8",
  };
  await vi.waitFor(() => {
    expect(element.status).toBe("error");
    expect(element.shadowRoot?.textContent).toContain("conflicts with sref");
  });
  expect(getPreparedState<ReaderViewModel>(element)).toBe(committed);
});
