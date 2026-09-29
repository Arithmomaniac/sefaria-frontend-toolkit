import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import fixture from "../../../tests/site-fixtures/micah-6-6-8-2026-09-29.json";
import { SourceCardWithSelection } from "./site-source-card.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("the site's React snippet loads one card and receives a verse selection", async () => {
  const fetch = vi.fn(async () => Response.json(fixture.payload));
  vi.stubGlobal("fetch", fetch);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<SourceCardWithSelection />));

  const card = container.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  )!;
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(container.querySelector("p")?.textContent).toBe(
    "Select a verse number.",
  );

  await card.updateComplete;
  const button = card.shadowRoot!.querySelector<HTMLButtonElement>(
    'button[aria-label="Show connections for Micah 6:7"]',
  )!;
  await act(async () => button.click());

  expect(container.querySelector("p")?.textContent).toBe(
    "You selected Micah 6:7 (position 1).",
  );
  expect(card.selectedPosition).toEqual([1]);
  await card.updateComplete;
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(fetch).toHaveBeenCalledTimes(1);
});
