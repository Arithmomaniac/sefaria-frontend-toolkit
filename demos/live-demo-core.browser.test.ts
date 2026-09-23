import { expect, test, vi } from "vitest";

import { createLiveDemoRunner } from "./live-demo-core.js";

test("owns shared success and failure presentation", async () => {
  const requestState = document.createElement("p");
  const hostError = document.createElement("p");
  const submitButton = document.createElement("button");
  const failure = new Error("Network unavailable");
  const load = vi
    .fn<(request: string, signal: AbortSignal) => Promise<string>>()
    .mockResolvedValueOnce("ready")
    .mockRejectedValueOnce(failure);
  const runner = createLiveDemoRunner<string>({
    load,
    formatRequest: (request) => `Request ${request}`,
    requestState,
    hostError,
    submitButton,
  });

  await runner.run("first");
  expect(requestState.dataset.state).toBe("ready");
  expect(hostError.hidden).toBe(true);

  await runner.run("second");
  expect(requestState.dataset.state).toBe("error");
  expect(hostError.textContent).toBe("Network unavailable");
});

test("does not let superseded work overwrite current status", async () => {
  const resolvers: Array<(value: string) => void> = [];
  const signals: AbortSignal[] = [];
  const runner = createLiveDemoRunner<string>({
    load: async (_request, signal) => {
      signals.push(signal);
      return await new Promise<string>((resolve) => resolvers.push(resolve));
    },
    formatRequest: (request) => request,
    requestState: document.createElement("p"),
    hostError: document.createElement("p"),
    submitButton: document.createElement("button"),
  });
  const first = runner.run("first");
  const second = runner.run("second");
  expect(signals[0]?.aborted).toBe(true);
  resolvers[1]?.("ready");
  await second;
  resolvers[0]?.("ready");
  await first;
});
