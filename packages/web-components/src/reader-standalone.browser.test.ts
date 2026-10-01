import {
  createSefariaClient,
  zCoreV3TextsResponse,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";

import { getPreparedState } from "./prepared-state.js";
import type { ReaderViewModel } from "./reader.js";
import micahFixture from "../../../examples/react-vite/src/micah-6-8.json";
import type { SefariaDataSource } from "./data-source.js";
import { SefariaReader } from "./reader-element.js";

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

test("Reader does not expose public data", () => {
  const element = new SefariaReader();
  expect("data" in element).toBe(false);
});

test("Reader local-data loader serves a supported root without network", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const calls: string[] = [];
  const element = new SefariaReader();
  element.sref = "Micah 6";
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        calls.push(`text:${request.sref}`);
        if (request.sref !== "Micah 6")
          throw new Error(`Unsupported ${request.sref}.`);
        return { payload: micahContext(), status: 200 };
      },
      getLinks: async (request) => {
        calls.push(`links:${request.sref}`);
        if (request.sref !== "Micah 6:1")
          throw new Error(`Unsupported ${request.sref}.`);
        return { payload: [], status: 200 };
      },
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(calls).toEqual(["text:Micah 6", "links:Micah 6:1"]);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("Reader local-data loader reports unsupported roots without browser fallback", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const element = new SefariaReader();
  element.sref = "Micah 7";
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        throw new Error(`Unsupported local ref ${request.sref}.`);
      },
      getLinks: async () => ({ payload: [], status: 200 }),
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("error"));
  expect(element.readerError).toContain("Unsupported local ref Micah 7");
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("Reader forwards language and root editions and replaces an unchanged root after preference changes", async () => {
  const requests: string[][] = [];
  const element = new SefariaReader();
  element.setAttribute("translation-language", "french");
  element.setAttribute("primary-version-title", "Deterministic example Hebrew");
  element.setAttribute("sref", "Micah 6");
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        requests.push([...request.versions]);
        const payload = micahContext();
        const translation = payload.versions.find(
          (version) => !version.isSource,
        )!;
        if (request.versions.includes("french")) {
          translation.versionTitle = "French fixture edition";
          translation.languageFamilyName = "french";
          translation.actualLanguage = "fr";
        }
        payload.available_versions = payload.versions.map((version) => ({
          ...version,
          title: payload.indexTitle,
        }));
        return { payload, status: 200 };
      },
      getLinks: async () => ({ payload: [], status: 200 }),
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(requests).toEqual([
    ["primary|Deterministic example Hebrew", "french"],
  ]);
  element.removeAttribute("translation-language");
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[1]).toEqual([
    "primary|Deterministic example Hebrew",
    "translation",
  ]);
});

test("Reader keeps its committed root when a new language fails or is invalid", async () => {
  const getText = vi.fn(async () => {
    if (getText.mock.calls.length > 1)
      throw new Error("Selection unavailable.");
    return { payload: micahContext(), status: 200 };
  });
  const element = new SefariaReader();
  element.sref = "Micah 6";
  element.source = {
    kind: "custom",
    loader: {
      getText,
      getLinks: async () => ({ payload: [], status: 200 }),
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  const source = getPreparedState<ReaderViewModel>(element)?.source;
  element.translationLanguage = "french";
  await vi.waitFor(() =>
    expect(element.readerError).toContain("Selection unavailable"),
  );
  expect(getPreparedState<ReaderViewModel>(element)?.source).toEqual(source);
  element.translationLanguage = " ";
  await vi.waitFor(() =>
    expect(element.readerError).toContain("language-family"),
  );
  expect(getText).toHaveBeenCalledTimes(2);
  expect(getPreparedState<ReaderViewModel>(element)?.source).toEqual(source);
});

test.each([false, true])(
  "invalid Reader language cancels pending selection (committed=%s)",
  async (committed) => {
    let complete:
      | ((value: { payload: CoreV3TextsResponse; status: number }) => void)
      | undefined;
    let pendingSignal: AbortSignal | undefined;
    let count = 0;
    const element = new SefariaReader();
    element.sref = "Micah 6";
    if (!committed) element.translationLanguage = "french";
    element.source = {
      kind: "custom",
      loader: {
        getText: async (_request, signal) => {
          count += 1;
          if (committed && count === 1)
            return { payload: micahContext(), status: 200 };
          pendingSignal = signal;
          return await new Promise((resolve) => {
            complete = resolve;
          });
        },
        getLinks: async () => ({ payload: [], status: 200 }),
      },
    };
    document.body.append(element);
    if (committed) {
      await vi.waitFor(() => expect(element.status).toBe("ready"));
      element.translationLanguage = "french";
    }
    await vi.waitFor(() => expect(complete).toBeDefined());
    const entryId = element.currentEntryId;
    element.translationLanguage = " ";
    await vi.waitFor(() =>
      expect(element.readerError).toContain("language-family"),
    );
    expect(pendingSignal?.aborted).toBe(true);
    const payload = micahContext();
    payload.versions[1]!.languageFamilyName = "french";
    payload.versions[1]!.actualLanguage = "fr";
    complete?.({ payload, status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.currentEntryId).toBe(entryId);
    expect(element.readerError).toContain("language-family");
    expect(element.status).toBe("error");
  },
);

test("Reader bounds target/context fallback to four text requests and one links request", async () => {
  const requests: { sref: string; versions: readonly string[] }[] = [];
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.translationLanguage = "french";
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        requests.push({ sref: request.sref, versions: request.versions });
        const payload =
          request.sref === "Micah 6:8"
            ? structuredClone(micahTarget)
            : micahContext();
        if (request.versions.includes("french")) {
          payload.versions = payload.versions.filter(
            (version) => version.isPrimary,
          );
          payload.warnings = [
            {
              french: {
                warning_code: 102,
                message: "Synthetic absence for both qualification phases.",
              },
            },
          ];
        }
        return { payload, status: 200 };
      },
      getLinks,
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(requests).toEqual([
    { sref: "Micah 6:8", versions: ["primary", "french"] },
    { sref: "Micah 6:8", versions: ["primary", "translation"] },
    { sref: "Micah 6", versions: ["primary", "french"] },
    { sref: "Micah 6", versions: ["primary", "translation"] },
  ]);
  expect(getLinks).toHaveBeenCalledTimes(1);
});

test("Reader disables fallback and propagates the policy to navigated sources", async () => {
  const requests: { sref: string; versions: readonly string[] }[] = [];
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.translationLanguage = "french";
  element.translationFallback = "none";
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        requests.push({ sref: request.sref, versions: request.versions });
        const payload =
          request.sref === "Micah 6:8"
            ? structuredClone(micahTarget)
            : micahContext();
        payload.versions = payload.versions.filter(
          (version) => version.isPrimary,
        );
        payload.warnings = [
          {
            french: {
              warning_code: 102,
              message: "Synthetic missing language.",
            },
          },
        ];
        return { payload, status: 200 };
      },
      getLinks,
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(JSON.stringify(getPreparedState(element))).toContain(
    "No french text.",
  );
  element.dispatchEvent(
    new CustomEvent("sefaria-reader-connection-select", {
      detail: { originEntryId: element.currentEntryId, targetRef: "Micah 6" },
    }),
  );
  await vi.waitFor(() =>
    expect(requests.map((request) => request.sref)).toContain("Micah 6"),
  );
  expect(requests).toEqual([
    { sref: "Micah 6:8", versions: ["primary", "french"] },
    { sref: "Micah 6", versions: ["primary", "french"] },
    { sref: "Micah 6", versions: ["primary", "french"] },
  ]);
  expect(getLinks).toHaveBeenCalledTimes(1);
});

test("Reader preserves its language and interrupted fallback across reconnect", async () => {
  const requests: string[][] = [];
  const element = new SefariaReader();
  element.sref = "Micah 6";
  element.translationLanguage = "french";
  element.source = {
    kind: "custom",
    loader: {
      getText: async (request) => {
        requests.push([...request.versions]);
        const payload = micahContext();
        if (requests.length === 1) {
          payload.versions = payload.versions.filter(
            (version) => version.isPrimary,
          );
          payload.warnings = [
            {
              french: {
                warning_code: 102,
                message: "Synthetic missing language.",
              },
            },
          ];
          return { payload, status: 200 };
        }
        if (requests.length === 2) return await new Promise(() => undefined);
        return { payload, status: 200 };
      },
      getLinks: async () => ({ payload: [], status: 200 }),
    },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  element.remove();
  document.body.append(element);
  await vi.waitFor(() => expect(requests).toHaveLength(3));
  expect(requests[2]).toEqual(["primary", "translation"]);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
});

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
  element.source = {
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
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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

test("resumes only interrupted links after reconnect through a host loader", async () => {
  const linkResolvers: Array<
    (value: { payload: unknown; status: number }) => void
  > = [];
  const getText = vi.fn<
    NonNullable<
      Extract<SefariaDataSource, { kind: "custom" }>["loader"]["getText"]
    >
  >(async ({ sref }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn<
    NonNullable<
      Extract<SefariaDataSource, { kind: "custom" }>["loader"]["getLinks"]
    >
  >(
    async () =>
      await new Promise((resolve) => {
        linkResolvers.push(resolve);
      }),
  );
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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

test("honors an source change made while disconnected after a completed load", async () => {
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
  element.source = {
    kind: "custom",
    loader: { getText: oldGetText, getLinks: oldGetLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));

  element.remove();
  element.source = {
    kind: "custom",
    loader: { getText: newGetText, getLinks: newGetLinks },
  };
  await element.updateComplete;
  document.body.append(element);
  await vi.waitFor(() => expect(newGetLinks).toHaveBeenCalledTimes(1));
  expect(newGetText).toHaveBeenCalledTimes(2);
  expect(oldGetText).toHaveBeenCalledTimes(2);
});

test("disabling source stops the previous Reader controller", async () => {
  const getText = vi.fn(async ({ sref }: { readonly sref: string }) => ({
    payload: sref === "Micah 6" ? micahContext() : micahTarget,
    status: 200,
  }));
  const getLinks = vi.fn(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
  };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));

  element.source = { kind: "disabled" };
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

test("navigates and returns Back with zero additional loader calls", async () => {
  const getText = vi.fn<
    NonNullable<
      Extract<SefariaDataSource, { kind: "custom" }>["loader"]["getText"]
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
      Extract<SefariaDataSource, { kind: "custom" }>["loader"]["getLinks"]
    >
  >(async () => ({ payload: [], status: 200 }));
  const element = new SefariaReader();
  element.sref = "Micah 6:8";
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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
  element.source = {
    kind: "custom",
    loader: { getText, getLinks },
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
