import Alpine from "alpinejs";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { afterEach, expect, test, vi } from "vitest";

import fixture from "../../../tests/site-fixtures/micah-6-6-8-2026-09-29.json";
import snippet from "./site-source-card.html?raw";

let root: HTMLElement | undefined;

afterEach(() => {
  if (root !== undefined) {
    Alpine.destroyTree(root);
    root.remove();
  }
  root = undefined;
  vi.unstubAllGlobals();
});

test("the site's Alpine snippet loads one card and receives a verse selection", async () => {
  const fetch = vi.fn(async () => Response.json(fixture.payload));
  vi.stubGlobal("fetch", fetch);
  root = document.createElement("div");
  root.innerHTML = snippet;
  document.body.append(root);
  Alpine.initTree(root);

  const card = root.querySelector<SefariaSourceCard>("sefaria-source-card")!;
  const message = root.querySelector("p")!;
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(message.textContent).toBe("Select a verse number.");

  await card.updateComplete;
  card
    .shadowRoot!.querySelector<HTMLButtonElement>(
      'button[aria-label="Select Micah 6:7"]',
    )!
    .click();

  await vi.waitFor(() =>
    expect(message.textContent).toBe("You selected Micah 6:7 (position 1)."),
  );
  await vi.waitFor(() => expect(card.selectedPosition).toEqual([1]));
  expect(fetch).toHaveBeenCalledTimes(1);
});
