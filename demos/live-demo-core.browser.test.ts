import { expect, test, vi } from "vitest";

import {
  createLiveDemoRunner,
  type LiveDemoController,
} from "./live-demo-core.js";

interface TestViewModel {
  readonly state: "data";
  readonly value: string;
}

test("owns shared success and failure presentation around an owner controller", async () => {
  const requestState = document.createElement("p");
  const hostError = document.createElement("p");
  const submitButton = document.createElement("button");
  const failure = new Error("Network unavailable");
  const loader = vi
    .fn<(request: string, signal: AbortSignal) => Promise<TestViewModel>>()
    .mockResolvedValueOnce({ state: "data", value: "loaded" })
    .mockRejectedValueOnce(failure);
  const controller = controllerFromLoader(loader);
  const runner = createLiveDemoRunner<string, TestViewModel>({
    controller,
    formatRequest: (request) => `Request ${request}`,
    requestState,
    hostError,
    submitButton,
  });

  await runner.run("first");

  expect(requestState.dataset.state).toBe("data");
  expect(requestState.textContent).toBe("Request first produced data.");
  expect(hostError.hidden).toBe(true);
  expect(submitButton.disabled).toBe(false);

  await runner.run("second");

  expect(requestState.dataset.state).toBe("error");
  expect(requestState.textContent).toBe("Request second could not complete.");
  expect(hostError.hidden).toBe(false);
  expect(hostError.textContent).toBe("Network unavailable");
  expect(submitButton.disabled).toBe(false);
});

test("does not let a superseded operation overwrite current host status", async () => {
  let resolveFirst!: (value: TestViewModel) => void;
  let resolveSecond!: (value: TestViewModel) => void;
  const first = new Promise<TestViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<TestViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const controller = controllerFromLoader(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  const requestState = document.createElement("p");
  const runner = createLiveDemoRunner<string, TestViewModel>({
    controller,
    formatRequest: (request) => request,
    requestState,
    hostError: document.createElement("p"),
    submitButton: document.createElement("button"),
  });

  const firstRun = runner.run("first");
  const secondRun = runner.run("second");
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond({ state: "data", value: "second" });
  await secondRun;
  resolveFirst({ state: "data", value: "first" });
  await firstRun;

  expect(requestState.textContent).toBe("second produced data.");
});

function controllerFromLoader(
  loader: (request: string, signal: AbortSignal) => Promise<TestViewModel>,
): LiveDemoController<string, TestViewModel> {
  let snapshot: LiveDemoController<string, TestViewModel>["snapshot"] = {
    attempt: { state: "idle" },
  };
  let active: AbortController | undefined;
  return {
    get snapshot() {
      return snapshot;
    },
    load: async (request) => {
      active?.abort();
      const current = new AbortController();
      active = current;
      snapshot = {
        ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
        attempt: { state: "loading" },
      };
      try {
        const viewModel = await loader(request, current.signal);
        if (active !== current || current.signal.aborted) {
          throw current.signal.reason;
        }
        active = undefined;
        snapshot = {
          result: { viewModel },
          attempt: { state: "idle" },
        };
        return viewModel;
      } catch (error) {
        if (active !== current || current.signal.aborted) {
          throw current.signal.reason;
        }
        active = undefined;
        snapshot = {
          ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
          attempt: { state: "failed", error },
        };
        throw error;
      }
    },
  };
}
