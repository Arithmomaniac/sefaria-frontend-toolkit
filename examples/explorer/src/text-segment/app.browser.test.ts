import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import type { SefariaTextSegment } from "@arithmomaniac/sefaria-web-components";
import { beforeEach, expect, test, vi } from "vitest";

import textFixture from "../../../../packages/client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import { startTextSegmentLiveDemo } from "./app.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="live-demo-root"></div>';
});

test("loads a preset through explicit acquisition with declarative version inputs", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(textFixture),
  );
  startTextSegmentLiveDemo(
    document,
    createSefariaClient({ cache: false, fetch }),
  );

  document
    .querySelector<HTMLButtonElement>('[data-demo-id="hebrew-markup"]')
    ?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("ready"));

  expect(fetch).toHaveBeenCalledTimes(1);
  const request = fetch.mock.calls[0]?.[0] as Request;
  const url = new URL(request.url);
  expect(decodeURIComponent(url.pathname)).toBe("/api/v3/texts/Obadiah 1:1");
  expect(url.searchParams.getAll("version")).toEqual([
    "hebrew|Miqra according to the Masorah",
  ]);
  expect(url.searchParams.get("return_format")).toBe("default");
  expect(resultElement().sref).toBe("Obadiah 1:1");
  expect(resultElement().versionLanguage).toBe("hebrew");
  expect(resultElement().versionTitle).toBe("Miqra according to the Masorah");
});

test("renders controls and waits for activation before requesting", () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  startTextSegmentLiveDemo(
    document,
    createSefariaClient({ cache: false, fetch }),
  );

  expect(document.querySelector("h1")?.textContent).toBe(
    "Live text-segment demo",
  );
  expect(document.querySelectorAll("[data-demo-request]")).toHaveLength(5);
  expect(
    document.querySelector<HTMLInputElement>('[name="language"]')?.value,
  ).toBe("hebrew");
  expect(resultElement().localName).toBe("sefaria-text-segment");
  expect(fetch).not.toHaveBeenCalled();
});

test("reports acquisition failure and restores the committed result", async () => {
  let fail = false;
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    if (fail) throw new Error("Network unavailable");
    return Response.json(textFixture);
  });
  startTextSegmentLiveDemo(
    document,
    createSefariaClient({ cache: false, fetch }),
  );

  document.querySelector<HTMLButtonElement>('[data-demo-id="hebrew"]')?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("ready"));
  const committed = resultElement().shadowRoot?.textContent;

  fail = true;
  document
    .querySelector<HTMLButtonElement>('[data-demo-id="hebrew-markup"]')
    ?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));
  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
  expect(resultElement().shadowRoot?.textContent).toBe(committed);
  expect(resultElement().status).toBe("error");
});

function resultElement(): SefariaTextSegment {
  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  if (!element) {
    throw new Error("The text result element is missing.");
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
