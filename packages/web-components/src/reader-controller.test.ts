import {
  createSefariaClient,
  zCoreLinkResponse,
  zCoreV3TextsResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { describe, expect, it, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-connections-preview-2026-09-06.json";
import sectionFixture from "../../client/test/fixtures/v3-connections-genesis-section-2026-09-06.json";
import targetFixture from "../../client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import micahTargetFixture from "../../../examples/react-vite/src/micah-6-8.json";
import {
  createReaderConnectionsContent,
  createReaderSourceContent,
  type ReaderConnectionsContent,
  type ReaderSourceContent,
} from "./reader-session.js";
import type { SourceCardRequest } from "./source-card.js";
import {
  createReaderController,
  loadReaderController,
  type ReaderControllerDataSource,
  type ReaderControllerError,
} from "./reader-controller.js";

const contextualTarget = zCoreV3TextsResponse.parse(
  targetFixture,
) as CoreV3TextsResponse;
const contextualSection = zCoreV3TextsResponse.parse(
  sectionFixture,
) as CoreV3TextsResponse;
const micahTarget = zCoreV3TextsResponse.parse(
  micahTargetFixture,
) as CoreV3TextsResponse;
const syntheticMicahContext = createSyntheticMicahContext();
const parsedLinks = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
if (
  !Array.isArray(parsedLinks) ||
  !parsedLinks[0] ||
  "isSheet" in parsedLinks[0]
) {
  throw new TypeError("Expected one text-link fixture.");
}
const baseLink: CoreLinkObject = parsedLinks[0];

describe("reader controller initialization", () => {
  it("retains a server-qualified segment target when an alias requires context", async () => {
    const requests: {
      readonly path: string;
      readonly versions: readonly string[];
      readonly returnFormat: string | null;
    }[] = [];
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        const url = new URL(request.url);
        const path = decodeURIComponent(url.pathname);
        requests.push({
          path,
          versions: url.searchParams.getAll("version"),
          returnFormat: url.searchParams.get("return_format"),
        });
        if (path === "/api/v3/texts/micah 6:8") {
          return Response.json(micahTarget);
        }
        if (path === "/api/v3/texts/Micah 6") {
          return Response.json(syntheticMicahContext);
        }
        if (path === "/api/links/Micah 6:8") {
          return Response.json([]);
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    });

    const controller = await loadReaderController(
      { tref: "micah 6:8" },
      client,
    );

    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:8");
    expect(controller.snapshot.reader.source?.viewModel).toMatchObject({
      state: "data",
      header: { ref: "Micah 6" },
    });
    expect(requests).toEqual([
      {
        path: "/api/v3/texts/micah 6:8",
        versions: ["primary", "translation"],
        returnFormat: "default",
      },
      {
        path: "/api/v3/texts/Micah 6",
        versions: ["primary", "translation"],
        returnFormat: "default",
      },
      {
        path: "/api/links/Micah 6:8",
        versions: [],
        returnFormat: null,
      },
    ]);
  });

  it("uses source-card defaults, qualifies context once, and selects the exact returned row", async () => {
    const requests: URL[] = [];
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const request = input instanceof Request ? input : new Request(input);
        const url = new URL(request.url);
        requests.push(url);
        if (decodeURIComponent(url.pathname) === "/api/v3/texts/Genesis 1:2") {
          return Response.json(contextualTarget);
        }
        if (decodeURIComponent(url.pathname) === "/api/v3/texts/Genesis 1") {
          return Response.json(contextualSection);
        }
        if (decodeURIComponent(url.pathname) === "/api/links/Genesis 1:2") {
          return Response.json(parsedLinks);
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      },
    });

    const controller = await loadReaderController(
      { tref: "Genesis 1:2" },
      client,
    );

    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Genesis 1:2");
    expect(controller.snapshot.reader.source?.viewModel).toMatchObject({
      state: "data",
      header: { ref: "Genesis 1" },
    });
    expect(
      requests
        .filter((url) => url.pathname.includes("/api/v3/texts/"))
        .map((url) => ({
          versions: url.searchParams.getAll("version"),
          format: url.searchParams.get("return_format"),
        })),
    ).toEqual([
      { versions: ["primary", "translation"], format: "default" },
      { versions: ["primary", "translation"], format: "default" },
    ]);
    expect(requests.map((url) => decodeURIComponent(url.pathname))).toEqual([
      "/api/v3/texts/Genesis 1:2",
      "/api/v3/texts/Genesis 1",
      "/api/links/Genesis 1:2",
    ]);
  });

  it("rejects a failed required context request without a target-only fallback", async () => {
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = decodeURIComponent(
          new URL(input instanceof Request ? input.url : input).pathname,
        );
        if (path === "/api/v3/texts/Genesis 1:2") {
          return Response.json(contextualTarget);
        }
        return Response.json(
          { error: "Context unavailable." },
          { status: 404 },
        );
      },
    });

    await expect(
      loadReaderController({ tref: "Genesis 1:2" }, client),
    ).rejects.toMatchObject({
      name: "ReaderControllerError",
      code: "source-http",
      status: 404,
    });
  });

  it("distinguishes source HTTP errors, empty source, and abort", async () => {
    const notFoundClient = createSefariaClient({
      cache: false,
      fetch: async () =>
        Response.json({ error: "Unknown text." }, { status: 404 }),
    });
    const emptyPayload = sectionSourcePayload("Micah 6");
    emptyPayload.versions = [];
    const emptyClient = createSefariaClient({
      cache: false,
      fetch: async () => Response.json(emptyPayload),
    });
    const abortController = new AbortController();
    const abortedClient = createSefariaClient({
      cache: false,
      fetch: async (input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const request =
            input instanceof Request ? input : new Request(input, init);
          request.signal.addEventListener(
            "abort",
            () => reject(request.signal.reason),
            { once: true },
          );
        }),
    });

    await expect(
      loadReaderController({ tref: "Micah 6:8" }, notFoundClient),
    ).rejects.toMatchObject({ code: "source-http", status: 404 });
    await expect(
      loadReaderController({ tref: "Micah 6:8" }, emptyClient),
    ).rejects.toMatchObject({ code: "source-unavailable" });
    const aborted = loadReaderController({ tref: "Micah 6:8" }, abortedClient, {
      signal: abortController.signal,
    });
    abortController.abort(new DOMException("Stopped.", "AbortError"));
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
  });

  it("admits a documented links 400 but exposes a links transport failure", async () => {
    const sourcePayload = sectionSourcePayload("Micah 6");
    const documentedClient = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input)
          .pathname;
        return path.startsWith("/api/links/")
          ? Response.json(
              { error: "No links.", ref: "Micah 6:8" },
              { status: 400 },
            )
          : Response.json(sourcePayload);
      },
    });
    const failedClient = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input)
          .pathname;
        if (path.startsWith("/api/links/")) {
          throw new TypeError("Network unavailable.");
        }
        return Response.json(sourcePayload);
      },
    });

    const documented = await loadReaderController(
      { tref: "Micah 6:8" },
      documentedClient,
    );
    const failed = await loadReaderController(
      { tref: "Micah 6:8" },
      failedClient,
    );

    expect(documented.snapshot.reader.connections).toMatchObject({
      state: "component",
      viewModel: { state: "error" },
    });
    expect(failed.snapshot.reader.connections).toMatchObject({
      state: "unavailable",
      reason: "failed",
      message: "Network unavailable.",
    });
  });

  it("uses the client response cache without coalescing in the controller", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(
        input instanceof Request ? input.url : input.toString(),
      ).pathname;
      return path.startsWith("/api/links/")
        ? Response.json(readerLinks("Micah 6:8"))
        : Response.json(sectionSourcePayload("Micah 6"));
    });
    const client = createSefariaClient({ fetch });

    await loadReaderController({ tref: "Micah 6:8" }, client);
    await loadReaderController({ tref: "Micah 6:8" }, client);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      request: "Micah 6",
      target: syntheticMicahContext,
      expectedSourceRequests: ["Micah 6"],
      expectedSelectedRef: "Micah 6:1",
    },
    {
      request: "Micah 6:7-8",
      target: createSyntheticMicahRange(),
      expectedSourceRequests: ["Micah 6:7-8", "Micah 6"],
      expectedSelectedRef: "Micah 6:7",
    },
  ])(
    "preserves the canonical $request first-segment contract",
    async ({
      request,
      target,
      expectedSourceRequests,
      expectedSelectedRef,
    }) => {
      const sourceRequests: string[] = [];
      const linksRequests: string[] = [];
      const client = createSefariaClient({
        cache: false,
        fetch: async (input) => {
          const path = decodeURIComponent(
            new URL(input instanceof Request ? input.url : input).pathname,
          );
          if (path.startsWith("/api/v3/texts/")) {
            const tref = path.slice("/api/v3/texts/".length);
            sourceRequests.push(tref);
            return Response.json(
              tref === request ? target : syntheticMicahContext,
            );
          }
          if (path.startsWith("/api/links/")) {
            linksRequests.push(path.slice("/api/links/".length));
            return Response.json([]);
          }
          throw new Error(`Unexpected request: ${path}`);
        },
      });

      const controller = await loadReaderController({ tref: request }, client);

      expect(controller.snapshot.reader.selectedTarget?.ref).toBe(
        expectedSelectedRef,
      );
      expect(sourceRequests).toEqual(expectedSourceRequests);
      expect(linksRequests).toEqual([expectedSelectedRef]);
    },
  );

  it("reuses the validated current capture with cache disabled", async () => {
    const sourceRequests: string[] = [];
    const linksRequests: string[] = [];
    const client = createSefariaClient({
      cache: false,
      fetch: async (input) => {
        const path = decodeURIComponent(
          new URL(input instanceof Request ? input.url : input).pathname,
        );
        if (path.startsWith("/api/v3/texts/")) {
          sourceRequests.push(path.slice("/api/v3/texts/".length));
          return Response.json(syntheticMicahContext);
        }
        if (path.startsWith("/api/links/")) {
          linksRequests.push(path.slice("/api/links/".length));
          return Response.json([]);
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    });
    const controller = await loadReaderController({ tref: "Micah 6" }, client);

    await controller.replaceRoot({ tref: "Micah 6:7" });

    expect(sourceRequests).toEqual(["Micah 6"]);
    expect(linksRequests).toEqual(["Micah 6:1", "Micah 6:7"]);
    expect(controller.snapshot.reader).toMatchObject({
      currentEntryId: "entry-2",
      breadcrumbs: [{ entryId: "entry-2", current: true }],
      selectedTarget: { ref: "Micah 6:7" },
    });
  });
});

describe("reader controller state and operations", () => {
  it("starts from admitted source-only, links-only, or paired content without I/O", () => {
    const dataSource: ReaderControllerDataSource = {
      loadSource: vi.fn(),
      loadConnections: vi.fn(),
    };
    const source = sourceContent("Micah 6");
    const connections = connectionsContent("Micah 6:8");

    const sourceOnly = createReaderController({ source }, dataSource);
    const linksOnly = createReaderController({ connections }, dataSource);
    const paired = createReaderController(
      { source, selectedPosition: [7], connections },
      dataSource,
    );

    expect(sourceOnly.snapshot.reader.source).toBeDefined();
    expect(linksOnly.snapshot.reader.connections).toBeDefined();
    expect(paired.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:8");
    expect(dataSource.loadSource).not.toHaveBeenCalled();
    expect(dataSource.loadConnections).not.toHaveBeenCalled();
  });

  it("replaces the external root transactionally and publishes source before connections", async () => {
    const loadSource = vi.fn(async (request: SourceCardRequest) =>
      createReaderSourceContent(sectionSourcePayload(request.tref), request),
    );
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        presentation: { vocalizationMode: "none" },
      },
      { loadSource, loadConnections },
    );
    const publications: {
      readonly task: string;
      readonly entryId: string;
      readonly breadcrumbs: number;
      readonly vocalizationMode: string;
      readonly connections: string;
    }[] = [];
    controller.subscribe((snapshot) => {
      publications.push({
        task: snapshot.task.state,
        entryId: snapshot.reader.currentEntryId,
        breadcrumbs: snapshot.reader.breadcrumbs.length,
        vocalizationMode: snapshot.presentation.vocalizationMode,
        connections: snapshot.reader.connections?.state ?? "none",
      });
    });

    await controller.replaceRoot(
      {
        tref: "Rashi on Micah 6",
        primary: {
          versionTitle: "Explicit source-backed compatibility composition",
        },
      },
      {
        presentation: { vocalizationMode: "nikkud" },
        connections: {
          withText: false,
          projection: { category: "Commentary" },
        },
      },
    );

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(controller.snapshot.reader.breadcrumbs).toHaveLength(1);
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe(
      "Rashi on Micah 6:1",
    );
    expect(controller.snapshot.presentation.vocalizationMode).toBe("nikkud");
    expect(loadSource).toHaveBeenCalledWith(
      {
        tref: "Rashi on Micah 6",
        primary: {
          versionTitle: "Explicit source-backed compatibility composition",
        },
      },
      expect.any(AbortSignal),
    );
    expect(loadConnections).toHaveBeenCalledWith(
      { tref: "Rashi on Micah 6:1", withText: false },
      { category: "Commentary" },
      expect.any(AbortSignal),
    );
    expect(publications).toEqual([
      {
        task: "idle",
        entryId: "entry-1",
        breadcrumbs: 1,
        vocalizationMode: "none",
        connections: "none",
      },
      {
        task: "loading-source",
        entryId: "entry-1",
        breadcrumbs: 1,
        vocalizationMode: "none",
        connections: "none",
      },
      {
        task: "idle",
        entryId: "entry-2",
        breadcrumbs: 1,
        vocalizationMode: "nikkud",
        connections: "none",
      },
      {
        task: "loading-connections",
        entryId: "entry-2",
        breadcrumbs: 1,
        vocalizationMode: "nikkud",
        connections: "component",
      },
      {
        task: "idle",
        entryId: "entry-2",
        breadcrumbs: 1,
        vocalizationMode: "nikkud",
        connections: "component",
      },
    ]);
  });

  it("reuses an exact addressable current source for an external root", async () => {
    const loadSource = vi.fn(async (request) => sourceContent(request.tref));
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8"),
      },
      { loadSource, loadConnections },
    );
    const tasks: string[] = [];
    controller.subscribe((snapshot) => tasks.push(snapshot.task.state));

    await controller.replaceRoot({ tref: "Micah 6:7" });

    expect(loadSource).not.toHaveBeenCalled();
    expect(loadConnections).toHaveBeenCalledOnce();
    expect(tasks).not.toContain("loading-source");
    expect(tasks).toContain("loading-connections");
    expect(loadConnections).toHaveBeenCalledWith(
      { tref: "Micah 6:7", withText: true },
      {},
      expect.any(AbortSignal),
    );
    expect(controller.snapshot.reader).toMatchObject({
      currentEntryId: "entry-2",
      breadcrumbs: [{ entryId: "entry-2", current: true }],
      selectedTarget: { ref: "Micah 6:7" },
    });

    await controller.replaceRoot({
      tref: "Micah 6:8",
      primary: { versionTitle: "Different edition" },
    });

    expect(loadSource).toHaveBeenCalledOnce();
    expect(loadSource).toHaveBeenLastCalledWith(
      {
        tref: "Micah 6:8",
        primary: { versionTitle: "Different edition" },
      },
      expect.any(AbortSignal),
    );

    await controller.replaceRoot({ tref: "Micah 7:1" });

    expect(loadSource).toHaveBeenCalledTimes(2);
    expect(loadSource).toHaveBeenLastCalledWith(
      { tref: "Micah 7:1" },
      expect.any(AbortSignal),
    );
  });

  it("keeps a reused root when its connections request fails", async () => {
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8"),
      },
      {
        loadSource: vi.fn(),
        loadConnections: vi.fn().mockRejectedValue(new TypeError("offline")),
      },
    );

    await controller.replaceRoot({ tref: "Micah 6:7" });

    expect(controller.snapshot).toMatchObject({
      task: { state: "idle" },
      reader: {
        currentEntryId: "entry-2",
        breadcrumbs: [{ entryId: "entry-2", current: true }],
        selectedTarget: { ref: "Micah 6:7" },
        connections: {
          state: "unavailable",
          reason: "failed",
          message: "offline",
        },
      },
    });
  });

  it("qualifies an alias instead of treating it as current-capture coverage", async () => {
    const loadSource = vi.fn(async () =>
      createReaderSourceContent(syntheticMicahContext, {
        tref: "micah 6:7",
      }),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8"),
      },
      {
        loadSource,
        loadConnections: vi.fn(async (request, projection) =>
          createReaderConnectionsContent(
            readerLinks(request.tref),
            request,
            projection,
          ),
        ),
      },
    );

    await controller.replaceRoot({ tref: "micah 6:7" });

    expect(loadSource).toHaveBeenCalledOnce();
    expect(loadSource).toHaveBeenCalledWith(
      { tref: "micah 6:7" },
      expect.any(AbortSignal),
    );
  });

  it("lets a retained-source root supersede an ignored-abort source load", async () => {
    const late = deferred<ReaderSourceContent>();
    let signal: AbortSignal | undefined;
    const loadSource = vi.fn(
      (request: SourceCardRequest, nextSignal: AbortSignal) => {
        signal = nextSignal;
        return late.promise;
      },
    );
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8"),
      },
      { loadSource, loadConnections },
    );

    const first = controller.replaceRoot({ tref: "Micah 7:1" });
    await vi.waitFor(() => expect(signal).toBeDefined());
    await controller.replaceRoot({ tref: "Micah 6:7" });
    expect(signal?.aborted).toBe(true);
    late.resolve(sourceContent("Micah 7"));
    await first;

    expect(controller.snapshot.reader).toMatchObject({
      currentEntryId: "entry-2",
      selectedTarget: { ref: "Micah 6:7" },
    });
    expect(loadSource).toHaveBeenCalledOnce();
    expect(loadConnections).toHaveBeenCalledOnce();
  });

  it("preserves the old root on source or budget failure and the new root on links failure", async () => {
    const root = sourceContent("Micah 6");
    const sourceFailure = createReaderController(
      {
        source: root,
        selectedPosition: [7],
        presentation: { vocalizationMode: "none" },
      },
      {
        loadSource: vi
          .fn()
          .mockResolvedValueOnce(
            createReaderSourceContent(micahTarget, { tref: "micah 6:8" }),
          )
          .mockRejectedValueOnce(new TypeError("Context unavailable.")),
        loadConnections: vi.fn(),
      },
    );
    await sourceFailure.replaceRoot({ tref: "micah 6:8" });
    expect(sourceFailure.snapshot).toMatchObject({
      reader: {
        currentEntryId: "entry-1",
        selectedTarget: { ref: "Micah 6:8" },
      },
      presentation: { vocalizationMode: "none" },
      task: {
        state: "error",
        code: "source-transport",
        message: "Context unavailable.",
      },
    });

    const budgetFailure = createReaderController(
      { source: root, selectedPosition: [7] },
      {
        loadSource: async (request) => sourceContent(request.tref, 10_000),
        loadConnections: vi.fn(),
      },
      { maxCaptureBytes: root.capture.byteSize + 20 },
    );
    await budgetFailure.replaceRoot({ tref: "Rashi on Micah 6" });
    expect(budgetFailure.snapshot).toMatchObject({
      reader: {
        currentEntryId: "entry-1",
        selectedTarget: { ref: "Micah 6:8" },
      },
      task: { state: "error", code: "budget-exceeded" },
    });

    const linksFailure = createReaderController(
      { source: root, selectedPosition: [7] },
      {
        loadSource: async (request) => sourceContent(request.tref),
        loadConnections: async () => {
          throw new TypeError("Links unavailable.");
        },
      },
    );
    await linksFailure.replaceRoot({ tref: "Rashi on Micah 6" });
    expect(linksFailure.snapshot).toMatchObject({
      reader: {
        currentEntryId: "entry-2",
        breadcrumbs: [{ entryId: "entry-2", current: true }],
        selectedTarget: { ref: "Rashi on Micah 6:1" },
        connections: {
          state: "unavailable",
          reason: "failed",
          message: "Links unavailable.",
        },
      },
      presentation: { vocalizationMode: "taamim_and_nikkud" },
      task: { state: "idle" },
    });
  });

  it.each(["source-only", "links-only"] as const)(
    "replaces a %s admitted seed through the same data source",
    async (kind) => {
      const dataSource = fixtureDataSource();
      const controller = createReaderController(
        kind === "source-only"
          ? { source: sourceContent("Micah 6"), selectedPosition: [7] }
          : { connections: connectionsContent("Micah 6:8") },
        dataSource,
      );

      await controller.replaceRoot({ tref: "Rashi on Micah 6" });

      expect(controller.snapshot.reader).toMatchObject({
        currentEntryId: "entry-2",
        breadcrumbs: [{ entryId: "entry-2", current: true }],
        selectedTarget: { ref: "Rashi on Micah 6:1" },
      });
      expect(dataSource.loadSource).toHaveBeenCalledOnce();
      expect(dataSource.loadConnections).toHaveBeenCalledOnce();
    },
  );

  it("lets a newer root supersede an ignored-abort completion", async () => {
    const late = deferred<ReaderSourceContent>();
    let firstSignal: AbortSignal | undefined;
    const loadSource = vi.fn(
      (request: SourceCardRequest, signal: AbortSignal) => {
        if (request.tref === "Rashi on Micah 6") {
          firstSignal = signal;
          return late.promise;
        }
        return Promise.resolve(sourceContent(request.tref));
      },
    );
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource, loadConnections },
    );

    const first = controller.replaceRoot({ tref: "Rashi on Micah 6" });
    await vi.waitFor(() => expect(firstSignal).toBeDefined());
    const second = controller.replaceRoot({ tref: "Ibn Ezra on Micah 6" });
    await second;
    expect(firstSignal?.aborted).toBe(true);
    late.resolve(sourceContent("Rashi on Micah 6"));
    await first;

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe(
      "Ibn Ezra on Micah 6:1",
    );
    expect(loadSource).toHaveBeenCalledTimes(2);
    expect(loadConnections).toHaveBeenCalledOnce();
  });

  it("validates a replacement before superseding active work", async () => {
    const pending = deferred<ReaderConnectionsContent>();
    let signal: AbortSignal | undefined;
    const loadConnections = vi.fn(
      (
        _request: { readonly tref: string },
        _projection: object,
        operationSignal: AbortSignal,
      ) => {
        signal = operationSignal;
        return pending.promise;
      },
    );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections },
    );
    const valid = controller.selectSource({
      originEntryId: "entry-1",
      position: [7],
      ref: "Micah 6:8",
    });
    await vi.waitFor(() => expect(signal).toBeDefined());
    const snapshot = controller.snapshot;

    await expect(controller.replaceRoot({ tref: " " })).rejects.toThrow(
      "Source reference must not be blank.",
    );
    expect(signal?.aborted).toBe(false);
    expect(controller.snapshot).toBe(snapshot);

    await expect(
      controller.replaceRoot({ tref: "Micah 6:7" }, {
        presentation: {
          vocalizationMode: "unsupported",
        },
      } as never),
    ).rejects.toThrow("Reader presentation contains an unsupported value.");
    expect(signal?.aborted).toBe(false);
    expect(controller.snapshot).toBe(snapshot);

    pending.resolve(connectionsContent("Micah 6:8"));
    await valid;
  });

  it("preserves the current entry when later required context fails", async () => {
    const dataSource: ReaderControllerDataSource = {
      loadSource: vi
        .fn()
        .mockResolvedValueOnce(
          createReaderSourceContent(contextualTarget, {
            tref: "Genesis 1:2",
          }),
        )
        .mockRejectedValueOnce(new TypeError("Context request failed.")),
      loadConnections: vi.fn(),
    };
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      dataSource,
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:8");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "source-transport",
      message: "Context request failed.",
    });
    expect(dataSource.loadConnections).not.toHaveBeenCalled();
  });

  it("terminates a mismatched connections completion and permits replacement work", async () => {
    const loadConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionsContent("Isaiah 1:17"))
      .mockResolvedValueOnce(connectionsContent("Micah 6:8"));
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections },
    );

    await controller.selectSource({
      originEntryId: "entry-1",
      position: [7],
      ref: "Micah 6:8",
    });

    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "invalid-completion",
    });
    expect(controller.snapshot.reader.connections).toMatchObject({
      state: "unavailable",
      reason: "interrupted",
    });

    await controller.selectSource({
      originEntryId: "entry-1",
      position: [7],
      ref: "Micah 6:8",
    });
    expect(controller.snapshot.reader.connections?.state).toBe("component");
    expect(loadConnections).toHaveBeenCalledTimes(2);
  });

  it("rejects a mismatched source ref before mutation, cancellation, publication, or I/O", async () => {
    const pending = deferred<ReaderConnectionsContent>();
    let activeSignal: AbortSignal | undefined;
    const loadConnections = vi
      .fn()
      .mockImplementationOnce(
        (
          _request: { readonly tref: string },
          _projection: object,
          signal: AbortSignal,
        ) => {
          activeSignal = signal;
          return pending.promise;
        },
      )
      .mockResolvedValueOnce(connectionsContent("Micah 6:7"));
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections },
    );
    const snapshots: unknown[] = [];
    controller.subscribe((snapshot) => snapshots.push(snapshot));

    const valid = controller.selectSource({
      originEntryId: "entry-1",
      position: [6],
      ref: "Micah 6:7",
    });
    await vi.waitFor(() => expect(activeSignal).toBeDefined());
    const pendingSnapshot = controller.snapshot;
    const publicationCount = snapshots.length;

    await expect(
      controller.selectSource({
        originEntryId: "entry-1",
        position: [7],
        ref: "Micah 6:7",
      }),
    ).rejects.toMatchObject({
      code: "invalid-selection",
    });

    expect(activeSignal?.aborted).toBe(false);
    expect(controller.snapshot).toBe(pendingSnapshot);
    expect(snapshots).toHaveLength(publicationCount);
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:7");
    expect(controller.snapshot.task).toMatchObject({
      state: "loading-connections",
      request: { tref: "Micah 6:7", withText: true },
    });
    expect(loadConnections).toHaveBeenCalledOnce();

    pending.resolve(connectionsContent("Micah 6:7"));
    await valid;

    expect(controller.snapshot.reader.selectedTarget?.ref).toBe("Micah 6:7");
    expect(controller.snapshot.reader.connections).toMatchObject({
      state: "component",
    });
    expect(loadConnections.mock.calls[0]?.[0]).toEqual({
      tref: "Micah 6:7",
      withText: true,
    });
  });

  it("rejects stale, absent, and non-addressable source selections before I/O", async () => {
    const dataSource = fixtureDataSource();
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      dataSource,
    );

    await expect(
      controller.selectSource({
        originEntryId: "entry-0",
        position: [7],
        ref: "Micah 6:8",
      }),
    ).rejects.toMatchObject({ code: "stale-action" });
    await expect(
      controller.selectSource({
        originEntryId: "entry-1",
        position: [999],
        ref: "Micah 6:1000",
      }),
    ).rejects.toMatchObject({ code: "invalid-selection" });

    const spanningSource = createReaderSourceContent(
      createSyntheticSpanningMicah(),
      { tref: "Micah 6:8-7:1" },
    );
    const spanningController = createReaderController(
      { source: spanningSource },
      dataSource,
    );
    const item = spanningController.snapshot.reader.source?.viewModel;
    if (item?.state !== "data" || !item.items[0]) {
      throw new Error("Expected spanning source content.");
    }
    await expect(
      spanningController.selectSource({
        originEntryId: "entry-1",
        position: item.items[0].position,
        ref: "Micah 6:8",
      }),
    ).rejects.toMatchObject({ code: "invalid-selection" });

    expect(dataSource.loadConnections).not.toHaveBeenCalled();
  });

  it("reports a mismatched source request without committing a new entry", async () => {
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource: async () => sourceContent("Isaiah 1"),
        loadConnections: vi.fn(),
      },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "request-mismatch",
    });
  });

  it("terminates a contextual request mismatch and permits replacement work", async () => {
    const mismatchedRequest = {
      tref: "Genesis 1",
      unexpected: true,
    } as SourceCardRequest;
    const loadSource = vi
      .fn()
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualTarget, {
          tref: "Genesis 1:2",
        }),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualSection, mismatchedRequest),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualTarget, {
          tref: "Genesis 1:2",
        }),
      )
      .mockResolvedValueOnce(
        createReaderSourceContent(contextualSection, {
          tref: "Genesis 1",
        }),
      );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource,
        loadConnections: async (request, projection) =>
          createReaderConnectionsContent(
            readerLinks(request.tref),
            request,
            projection,
          ),
      },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "request-mismatch",
    });
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    expect(controller.snapshot.task.state).toBe("idle");
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(loadSource).toHaveBeenCalledTimes(4);
  });

  it("reprojects locally and upgrades metadata-only previews exactly once", async () => {
    const loadConnections = vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    );
    const controller = createReaderController(
      {
        source: sourceContent("Micah 6"),
        selectedPosition: [7],
        connections: connectionsContent("Micah 6:8", false, {
          category: "Commentary",
        }),
      },
      { loadSource: vi.fn(), loadConnections },
    );

    controller.setConnectionsCategory({
      originEntryId: "entry-1",
      category: "Commentary",
    });
    expect(loadConnections).not.toHaveBeenCalled();

    await controller.requestConnectionPreviews({
      originEntryId: "entry-1",
    });
    await controller.requestConnectionPreviews({
      originEntryId: "entry-1",
    });

    expect(loadConnections).toHaveBeenCalledOnce();
    expect(loadConnections.mock.calls[0]?.[0]).toEqual({
      tref: "Micah 6:8",
      withText: true,
    });
    expect(loadConnections.mock.calls[0]?.[1]).toEqual({
      category: "Commentary",
    });
    const connections = controller.snapshot.reader.connections;
    expect(connections?.state).toBe("component");
    if (
      connections?.state !== "component" ||
      connections.viewModel.state !== "data"
    ) {
      return;
    }
    expect(connections.viewModel.category).toBe("Commentary");
  });

  it("cancels the session operation before replacement and ignores a late completion", async () => {
    const lateSection = deferred<ReaderSourceContent>();
    let firstContextSignal: AbortSignal | undefined;
    const loadSource = vi.fn(
      async (request: { readonly tref: string }, signal: AbortSignal) => {
        if (request.tref === "Genesis 1:2") {
          return createReaderSourceContent(contextualTarget, request);
        }
        if (request.tref === "Genesis 1") {
          firstContextSignal = signal;
          return lateSection.promise;
        }
        return sourceContent(request.tref);
      },
    );
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource,
        loadConnections: async (request, projection) =>
          createReaderConnectionsContent(
            readerLinks(request.tref),
            request,
            projection,
          ),
      },
    );

    const first = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Genesis 1:2",
    });
    await vi.waitFor(() => expect(firstContextSignal).toBeDefined());
    const second = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    await second;
    expect(firstContextSignal?.aborted).toBe(true);
    lateSection.resolve(
      createReaderSourceContent(contextualSection, { tref: "Genesis 1" }),
    );
    await first;

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-2");
    expect(controller.snapshot.reader.selectedTarget?.ref).toBe(
      "Rashi on Micah 6:1",
    );
    expect(controller.snapshot.task.state).toBe("idle");
  });

  it("preserves the current entry when a new source exceeds the retention budget", async () => {
    const root = sourceContent("Micah 6");
    const controller = createReaderController(
      { source: root, selectedPosition: [7] },
      {
        loadSource: async (request) => sourceContent(request.tref, 10_000),
        loadConnections: vi.fn(),
      },
      { maxCaptureBytes: root.capture.byteSize + 20 },
    );

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });

    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
    expect(controller.snapshot.task).toMatchObject({
      state: "error",
      code: "budget-exceeded",
    });
  });

  it("rejects stale actions before I/O and keeps Back and activation local", async () => {
    const dataSource = fixtureDataSource();
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      dataSource,
    );

    await expect(
      controller.openConnection({
        originEntryId: "entry-0",
        targetRef: "Rashi on Micah 6",
      }),
    ).rejects.toMatchObject({ code: "stale-action" });
    expect(dataSource.loadSource).not.toHaveBeenCalled();

    await controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    const callCount =
      dataSource.loadSource.mock.calls.length +
      dataSource.loadConnections.mock.calls.length;
    controller.back({ originEntryId: "entry-2" });
    controller.activateHistory({
      originEntryId: "entry-1",
      entryId: "entry-1",
    });
    expect(
      dataSource.loadSource.mock.calls.length +
        dataSource.loadConnections.mock.calls.length,
    ).toBe(callCount);
    expect(controller.snapshot.reader.currentEntryId).toBe("entry-1");
  });

  it("publishes immutable snapshots, isolates subscriber failures, and disposes", () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      { loadSource: vi.fn(), loadConnections: vi.fn() },
    );
    const throwing = vi.fn(() => {
      throw new Error("Subscriber failed.");
    });
    const listener = vi.fn();
    controller.subscribe(throwing);
    const unsubscribe = controller.subscribe(listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(Object.isFrozen(controller.snapshot)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.reader)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.reader.breadcrumbs)).toBe(true);
    const reader = controller.snapshot.reader;
    const source = reader.source?.viewModel;
    const connections = reader.connections;

    unsubscribe();
    controller.setPresentation({
      originEntryId: "entry-1",
      patch: { contentLanguage: "primary", vocalizationMode: "none" },
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(controller.snapshot.presentation.contentLanguage).toBe("primary");
    expect(controller.snapshot.presentation.vocalizationMode).toBe("none");
    expect(controller.snapshot.reader).toBe(reader);
    expect(controller.snapshot.reader.source?.viewModel).toBe(source);
    expect(controller.snapshot.reader.connections).toBe(connections);

    controller.dispose();
    expect(() => controller.back({ originEntryId: "entry-1" })).toThrowError(
      expect.objectContaining<Partial<ReaderControllerError>>({
        code: "disposed",
      }),
    );
    vi.unstubAllGlobals();
  });

  it("rejects re-entrant actions and aborts active work on disposal", async () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const pending = deferred<ReaderSourceContent>();
    let signal: AbortSignal | undefined;
    const controller = createReaderController(
      { source: sourceContent("Micah 6"), selectedPosition: [7] },
      {
        loadSource: (_request, operationSignal) => {
          signal = operationSignal;
          return pending.promise;
        },
        loadConnections: vi.fn(),
      },
    );
    controller.subscribe(() => {
      controller.setPresentation({
        originEntryId: "entry-1",
        patch: { contentLanguage: "translation" },
      });
    });
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "reentrant-action" }),
    );

    const operation = controller.openConnection({
      originEntryId: "entry-1",
      targetRef: "Rashi on Micah 6",
    });
    await vi.waitFor(() => expect(signal).toBeDefined());
    controller.dispose();
    expect(signal?.aborted).toBe(true);
    pending.resolve(sourceContent("Rashi on Micah 6"));
    await operation;
    expect(() => controller.subscribe(vi.fn())).toThrowError(
      expect.objectContaining<Partial<ReaderControllerError>>({
        code: "disposed",
      }),
    );
    vi.unstubAllGlobals();
  });
});

function sectionSourcePayload(
  sectionRef: string,
  textLength = 20,
): CoreV3TextsResponse {
  const payload = structuredClone(contextualSection);
  payload.ref = sectionRef;
  payload.heRef = sectionRef;
  payload.sectionRef = sectionRef;
  payload.heSectionRef = sectionRef;
  payload.firstAvailableSectionRef = `${sectionRef}:1`;
  payload.title = sectionRef;
  payload.book = sectionRef;
  payload.indexTitle = sectionRef;
  payload.heIndexTitle = sectionRef;
  payload.sections = ["1"];
  payload.toSections = ["1"];
  for (const version of payload.versions) {
    if (!Array.isArray(version.text)) {
      throw new TypeError("Expected section text arrays.");
    }
    version.text = version.text.map(() => "X".repeat(textLength));
  }
  return payload;
}

function createSyntheticMicahContext(): CoreV3TextsResponse {
  const payload = structuredClone(micahTarget);
  payload.ref = payload.sectionRef;
  payload.heRef = payload.heSectionRef;
  payload.sections = payload.sections.slice(0, -1);
  payload.toSections = payload.toSections.slice(0, -1);
  for (const version of payload.versions) {
    const target = version.text;
    if (Array.isArray(target)) {
      throw new TypeError("Expected a scalar Micah target.");
    }
    version.text = Array.from({ length: 8 }, (_, index) =>
      index === 7
        ? target
        : `[synthetic Micah 6:${index + 1} context for reader tests]`,
    );
  }
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function createSyntheticMicahRange(): CoreV3TextsResponse {
  const payload = structuredClone(syntheticMicahContext);
  payload.ref = "Micah 6:7-8";
  payload.heRef = "מיכה ו׳:ז׳-ח׳";
  payload.sections = ["6", "7"];
  payload.toSections = ["6", "8"];
  for (const version of payload.versions) {
    if (!Array.isArray(version.text)) {
      throw new TypeError("Expected synthetic Micah context arrays.");
    }
    version.text = version.text.slice(6, 8);
  }
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function createSyntheticSpanningMicah(): CoreV3TextsResponse {
  const payload = structuredClone(syntheticMicahContext);
  payload.ref = "Micah 6:8-7:1";
  payload.heRef = "מיכה ו׳:ח׳-ז׳:א׳";
  payload.sections = ["6", "8"];
  payload.toSections = ["7", "1"];
  payload.isSpanning = true;
  payload.spanningRefs = ["Micah 6:8", "Micah 7:1"];
  return zCoreV3TextsResponse.parse(payload) as CoreV3TextsResponse;
}

function sourceContent(sectionRef: string, textLength = 20) {
  return createReaderSourceContent(
    sectionSourcePayload(sectionRef, textLength),
    { tref: sectionRef },
  );
}

function readerLinks(tref: string): CoreLinkResponse {
  return [
    {
      ...structuredClone(baseLink),
      _id: `link-${tref}`,
      anchorRef: tref,
      sourceRef: `Commentary on ${tref}`,
      ref: `Commentary on ${tref}`,
      category: "Commentary",
    },
  ];
}

function connectionsContent(
  tref: string,
  withText = true,
  projection: { readonly category?: string; readonly page?: number } = {},
) {
  return createReaderConnectionsContent(
    readerLinks(tref),
    { tref, withText },
    projection,
  );
}

function fixtureDataSource() {
  return {
    loadSource: vi.fn(async (request) => sourceContent(request.tref)),
    loadConnections: vi.fn(async (request, projection) =>
      createReaderConnectionsContent(
        readerLinks(request.tref),
        request,
        projection,
      ),
    ),
  };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
