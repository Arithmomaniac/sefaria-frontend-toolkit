import {
  createSefariaClient,
  zCoreLinkResponse,
  zCoreRefResponse,
  zCoreV3TextsResponse,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import { afterEach, describe, expect, test, vi } from "vitest";

import linksErrorFixture from "../../client/test/fixtures/links-error-2026-08-30.json";
import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import refFixture from "../../client/test/fixtures/ref-genesis-segment-2026-09-03.json";
import unresolvedRefFixture from "../../client/test/fixtures/ref-unresolved-2026-09-03.json";
import textFixture from "../../client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import { createBilingualSegmentController } from "./bilingual-segment.js";
import { createConnectionsController } from "./connections-panel.js";
import { createPopupController } from "./popup.js";
import { createRefLabelController } from "./ref-label.js";
import { createSourceCardController } from "./source-card.js";
import { createTextSegmentController } from "./text-segment.js";

const textPayload = zCoreV3TextsResponse.parse(textFixture);
const refPayload = zCoreRefResponse.parse(refFixture);
const unresolvedRefPayload = zCoreRefResponse.parse(unresolvedRefFixture);
const linksPayload = zCoreLinkResponse.parse(linksFixture);
const linksErrorPayload = zCoreLinkResponse.parse(linksErrorFixture);

afterEach(() => {
  vi.unstubAllGlobals();
});

interface HarnessSnapshot {
  readonly result?: { readonly viewModel: { readonly state: string } };
  readonly attempt:
    | { readonly state: "idle" }
    | {
        readonly state: "loading";
        readonly viewModel: { readonly state: string };
      }
    | { readonly state: "failed"; readonly error: unknown };
}

interface Harness {
  readonly snapshot: HarnessSnapshot;
  load(signal?: AbortSignal): Promise<{ readonly state: string }>;
  setSuppliedData(
    payload: unknown,
    status?: number,
  ): {
    readonly state: string;
  };
  cancel(reason?: unknown): void;
  dispose(): void;
}

interface HarnessCase {
  readonly name: string;
  readonly payload: unknown;
  readonly create: (client?: SefariaClient) => Harness;
}

const cases: readonly HarnessCase[] = [
  {
    name: "text segment",
    payload: textPayload,
    create: (client) => {
      const controller = createTextSegmentController(client);
      const request = {
        tref: "Genesis 1:2",
        version: { language: "hebrew" },
      };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) => controller.load(request, signal),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status as 200 | 400 | 404 | undefined,
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
  {
    name: "bilingual segment",
    payload: textPayload,
    create: (client) => {
      const controller = createBilingualSegmentController(client);
      const request = { tref: "Genesis 1:2" };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) => controller.load(request, signal),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status as 200 | 400 | 404 | undefined,
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
  {
    name: "reference label",
    payload: refPayload,
    create: (client) => {
      const controller = createRefLabelController(client, {
        siteOrigin: "https://example.test",
      });
      const request = { tref: "Genesis 1:2" };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) => controller.load(request, signal),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status as 200 | 404 | undefined,
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
  {
    name: "source card",
    payload: textPayload,
    create: (client) => {
      const controller = createSourceCardController(client);
      const request = { tref: "Genesis 1:2" };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) => controller.load(request, signal),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status as 200 | 400 | 404 | undefined,
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
  {
    name: "popup",
    payload: textPayload,
    create: (client) => {
      const controller = createPopupController(client);
      const request = { tref: "Genesis 1:2" };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) => controller.load(request, signal),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status as 200 | 400 | 404 | undefined,
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
  {
    name: "connections",
    payload: linksPayload,
    create: (client) => {
      const controller = createConnectionsController(client);
      const request = { tref: "Genesis 1:1", withText: true };
      return {
        get snapshot() {
          return controller.snapshot;
        },
        load: (signal) =>
          controller.load(request, signal === undefined ? {} : { signal }),
        setSuppliedData: (payload, status) =>
          controller.setSuppliedData(
            request,
            payload,
            status === undefined ? {} : { status: status as 200 | 400 },
          ),
        cancel: (reason) => controller.cancel(reason),
        dispose: () => controller.dispose(),
      };
    },
  },
];

describe.each(cases)("$name controller", ({ create, payload }) => {
  test("constructs and commits supplied data with zero IO", () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const controller = create(createSefariaClient({ fetch }));

    expect(controller.snapshot).toEqual({ attempt: { state: "idle" } });
    const result = controller.setSuppliedData(payload);

    expect(result.state).not.toBe("loading");
    expect(controller.snapshot.result?.viewModel).toBe(result);
    expect(controller.snapshot.attempt).toEqual({ state: "idle" });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("rejects the original failure and retains the previous result", async () => {
    const failure = new Error("Network unavailable");
    const client = createSefariaClient({
      cache: false,
      fetch: async () => {
        throw failure;
      },
    });
    const controller = create(client);
    const previous = controller.setSuppliedData(payload);

    await expect(controller.load()).rejects.toBe(failure);
    expect(controller.snapshot.result?.viewModel).toBe(previous);
    expect(controller.snapshot.attempt).toMatchObject({
      state: "failed",
      error: failure,
    });
  });

  test("rejects an external abort by identity when fetch ignores it", async () => {
    const response = deferred<Response>();
    const client = createSefariaClient({
      cache: false,
      fetch: async () => await response.promise,
    });
    const controller = create(client);
    const abort = new AbortController();
    const reason = new DOMException("Stop this attempt", "AbortError");

    const loading = controller.load(abort.signal);
    abort.abort(reason);

    await expect(loading).rejects.toBe(reason);
    expect(controller.snapshot).toEqual({ attempt: { state: "idle" } });
  });

  test("supersedes an ignored-abort operation without stale success", async () => {
    const responses = [deferred<Response>(), deferred<Response>()];
    let call = 0;
    const client = createSefariaClient({
      cache: false,
      fetch: async () => await responses[call++]!.promise,
    });
    const controller = create(client);

    const obsolete = controller.load();
    const current = controller.load();
    responses[1]!.resolve(Response.json(payload));

    await expect(obsolete).rejects.toMatchObject({ name: "AbortError" });
    const result = await current;
    expect(result).toBe(controller.snapshot.result?.viewModel);
    expect(controller.snapshot.attempt).toEqual({ state: "idle" });
  });
});

test("reference-label supplied data preserves deterministic options and 200 empty", () => {
  const controller = createRefLabelController(undefined, {
    siteOrigin: "https://example.test/path",
  });
  const request = { tref: "Genesis 1:2" };

  expect(controller.setSuppliedData(request, refPayload)).toMatchObject({
    state: "data",
    url: expect.stringMatching(/^https:\/\/example\.test\//u),
  });
  expect(
    controller.setSuppliedData(request, unresolvedRefPayload),
  ).toMatchObject({ state: "empty" });
});

test("immutable publications do not freeze caller-owned request objects", () => {
  const controller = createSourceCardController();
  const request = {
    tref: "Genesis 1:2",
    primary: { versionTitle: "Tanakh: The Holy Scriptures, published by JPS" },
  };

  controller.setSuppliedData(request, textPayload);

  expect(Object.isFrozen(request)).toBe(false);
  expect(Object.isFrozen(request.primary)).toBe(false);
  expect(controller.snapshot.result?.request).not.toBe(request);
  expect(controller.snapshot.result?.request.primary).not.toBe(request.primary);
});

test("connections accepts documented 200 API errors and rejects invalid 200 shapes", () => {
  const controller = createConnectionsController();
  const request = { tref: "Not a ref" };

  expect(controller.setSuppliedData(request, linksErrorPayload)).toMatchObject({
    state: "error",
    errorKind: "api",
  });
  expect(() => controller.setSuppliedData(request, { error: 42 })).toThrow(
    expect.objectContaining({ issues: expect.any(Array) }),
  );
});

test("connections reprojects one current capture without IO and retains it after failure", async () => {
  const failure = new Error("Offline");
  const fetch = vi.fn(async () => {
    throw failure;
  });
  const controller = createConnectionsController(
    createSefariaClient({ cache: false, fetch }),
  );
  controller.setSuppliedData(
    { tref: "Genesis 1:1", withText: true },
    linksPayload,
  );
  const initial = controller.snapshot.result;

  const projected = controller.setProjection({ category: "Targum" });
  expect(projected).toMatchObject({ state: "data", category: "Targum" });
  expect(fetch).not.toHaveBeenCalled();

  await expect(
    controller.load({ tref: "Micah 6:8", withText: true }),
  ).rejects.toBe(failure);
  expect(controller.snapshot.result?.request).toEqual(initial?.request);
  expect(controller.snapshot.result?.viewModel).toBe(projected);
});

test("invalid supplied data is fully rejected before pending work is superseded", async () => {
  const response = deferred<Response>();
  const controller = createSourceCardController(
    createSefariaClient({
      cache: false,
      fetch: async () => await response.promise,
    }),
  );
  const request = { tref: "Genesis 1:2" };
  const pending = controller.load(request);
  const loading = controller.snapshot.attempt;

  expect(() =>
    controller.setSuppliedData(request, { versions: "invalid" }),
  ).toThrow(expect.objectContaining({ issues: expect.any(Array) }));
  expect(controller.snapshot.attempt).toBe(loading);

  response.resolve(Response.json(textPayload));
  const result = await pending;
  expect(result).toBe(controller.snapshot.result?.viewModel);
});

test("invalid request and status are rejected before pending work is superseded", async () => {
  const response = deferred<Response>();
  const controller = createSourceCardController(
    createSefariaClient({
      cache: false,
      fetch: async () => await response.promise,
    }),
  );
  const pending = controller.load({ tref: "Genesis 1:2" });
  const loading = controller.snapshot.attempt;

  expect(() =>
    controller.load({
      tref: " ",
    }),
  ).toThrow();
  expect(() =>
    controller.setSuppliedData({ tref: "Micah 6:8" }, textPayload, 201 as 200),
  ).toThrow("Source-card status must be 200, 400, or 404.");
  expect(controller.snapshot.attempt).toBe(loading);

  response.resolve(Response.json(textPayload));
  const result = await pending;
  expect(result).toBe(controller.snapshot.result?.viewModel);
});

test("subscriber failures are reported without blocking later subscribers", () => {
  const reportError = vi.fn();
  vi.stubGlobal("reportError", reportError);
  const controller = createSourceCardController();
  const failure = new Error("Subscriber failed");
  let laterNotifications = 0;

  const unsubscribeFailure = controller.subscribe(() => {
    throw failure;
  });
  const unsubscribeLater = controller.subscribe(() => {
    laterNotifications += 1;
  });
  controller.setSuppliedData({ tref: "Genesis 1:2" }, textPayload);

  expect(reportError).toHaveBeenCalledWith(failure);
  expect(laterNotifications).toBe(2);
  unsubscribeFailure();
  unsubscribeLater();
});

test("reentrant controller operations are rejected without changing the publication", async () => {
  const response = deferred<Response>();
  const controller = createSourceCardController(
    createSefariaClient({
      cache: false,
      fetch: async () => await response.promise,
    }),
  );
  const reportError = vi.fn();
  vi.stubGlobal("reportError", reportError);
  const unsubscribe = controller.subscribe((snapshot) => {
    if (snapshot.attempt.state === "loading") {
      controller.cancel();
    }
  });

  const pending = controller.load({ tref: "Genesis 1:2" });
  expect(reportError).toHaveBeenCalledWith(
    expect.objectContaining({
      message:
        "Component controller operations cannot run during subscriber notification.",
    }),
  );
  expect(controller.snapshot.attempt.state).toBe("loading");

  response.resolve(Response.json(textPayload));
  const result = await pending;
  expect(result).toBe(controller.snapshot.result?.viewModel);
  unsubscribe();
});

test("disposed connections controllers release committed capture and reject local work", () => {
  const controller = createConnectionsController();
  controller.setSuppliedData({ tref: "Genesis 1:1" }, linksPayload);

  controller.dispose();

  expect(controller.snapshot).toEqual({ attempt: { state: "idle" } });
  expect(() => controller.setProjection({ category: "Targum" })).toThrow(
    "Component controller has been disposed.",
  );
});

function deferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
