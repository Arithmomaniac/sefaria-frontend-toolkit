import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import type { SefariaRefLabel } from "@arithmomaniac/sefaria-web-components";
import { beforeEach, expect, test, vi } from "vitest";

import segmentFixture from "../../../../packages/client/test/fixtures/ref-genesis-segment-2026-09-03.json";
import { startRefLabelLiveDemo } from "./app.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="live-demo-root"></div>';
});

test("loads a preset through an explicit acquisition source and preserves presentation", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(segmentFixture),
  );
  startRefLabelLiveDemo(document, createSefariaClient({ cache: false, fetch }));

  document.querySelector<HTMLButtonElement>('[data-demo-id="range"]')?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("ready"));

  expect(fetch).toHaveBeenCalledTimes(1);
  const request = fetch.mock.calls[0]?.[0] as Request;
  expect(decodeURIComponent(new URL(request.url).pathname)).toBe(
    "/api/ref/Genesis 1:1-3",
  );
  expect(resultElement().sref).toBe("Genesis 1:1-3");
  expect(resultElement().labelLanguage).toBe("both");
  expect(resultElement().linked).toBe(true);
});

test("renders controls and waits for activation before requesting", () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  startRefLabelLiveDemo(document, createSefariaClient({ cache: false, fetch }));

  expect(document.querySelector("h1")?.textContent).toBe(
    "Live reference-label demo",
  );
  expect(document.querySelectorAll("[data-demo-request]")).toHaveLength(5);
  expect(
    document.querySelector<HTMLSelectElement>('[name="labelLanguage"]')?.value,
  ).toBe("both");
  expect(resultElement().localName).toBe("sefaria-ref-label");
  expect(fetch).not.toHaveBeenCalled();
});

test("reports element-owned acquisition failures in the host error element", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    throw new Error("Network unavailable");
  });
  startRefLabelLiveDemo(document, createSefariaClient({ cache: false, fetch }));

  document
    .querySelector<HTMLButtonElement>('[data-demo-id="segment"]')
    ?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
});

function resultElement(): SefariaRefLabel {
  const element = document.querySelector<SefariaRefLabel>("sefaria-ref-label");
  if (!element) {
    throw new Error("The reference result element is missing.");
  }
  return element;
}

function requestState(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#request-state");
  if (!element) {
    throw new Error("The request state element is missing.");
  }
  return element;
}
