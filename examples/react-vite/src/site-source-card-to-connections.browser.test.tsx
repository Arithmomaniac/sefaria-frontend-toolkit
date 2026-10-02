import type {
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import links from "../../../tests/site-fixtures/micah-6-8-links-2026-09-29.json";
import range from "../../../tests/site-fixtures/micah-6-6-8-2026-09-29.json";
import { SourceCardToConnections } from "./site-source-card-to-connections.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("selecting a verse points the panel at it with one links request", async () => {
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = decodeURIComponent(url.pathname);
    requests.push(path);
    return path.startsWith("/api/links/")
      ? Response.json(path === "/api/links/Micah 6:8" ? links.payload : [])
      : Response.json(range.payload);
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<SourceCardToConnections />));

  const card = container.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  )!;
  const panel = container.querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  )!;
  await vi.waitFor(() => {
    expect(card.status).toBe("ready");
    expect(panel.status).toBe("ready");
  });
  expect(requests.sort()).toEqual([
    "/api/links/Micah 6:8",
    "/api/v3/texts/Micah 6:6-8",
  ]);

  await card.updateComplete;
  await act(async () =>
    card
      .shadowRoot!.querySelector<HTMLButtonElement>(
        'button[aria-label="Select Micah 6:7"]',
      )!
      .click(),
  );

  await vi.waitFor(() => expect(panel.sref).toBe("Micah 6:7"));
  await vi.waitFor(() => expect(panel.status).not.toBe("loading"));
  expect(card.selectedPosition).toEqual([1]);
  expect(
    requests.filter((path) => path === "/api/links/Micah 6:7"),
  ).toHaveLength(1);
  expect(requests).toHaveLength(3);
});
