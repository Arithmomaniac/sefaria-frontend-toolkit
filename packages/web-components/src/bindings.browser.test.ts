import {
  createSefariaClient,
  zCoreLinkResponse,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { html } from "lit";
import { render } from "vitest-browser-lit";
import { expect, test, vi } from "vitest";

import { getPreparedState } from "./prepared-state.js";
import type { SourceCardViewModel } from "./source-card.js";
import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import textFixture from "../../client/test/fixtures/v3-connections-genesis-target-2026-09-06.json";
import {
  bindConnectionsController,
  bindSourceCardController,
} from "./bindings.js";
import {
  createConnectionsController,
  type ConnectionsController,
} from "./connections-panel.js";
import "./connections-panel-element.js";
import type { SefariaConnectionsPanel } from "./connections-panel-element.js";
import { createSourceCardController } from "./source-card.js";
import "./source-card-element.js";
import type { SefariaSourceCard } from "./source-card-element.js";

const textPayload = zCoreV3TextsResponse.parse(textFixture);
const linksPayload = zCoreLinkResponse.parse(linksFixture);

test("binds supplied terminal state and does no IO itself", () => {
  render(html`<sefaria-source-card></sefaria-source-card>`);
  const element = document.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!element) throw new Error("Source card was not rendered.");
  const controller = createSourceCardController();
  const unbind = bindSourceCardController(element, controller);

  expect(getPreparedState<SourceCardViewModel>(element)).toBeUndefined();
  const terminal = controller.setSuppliedData(
    { tref: "Genesis 1:2" },
    textPayload,
  );
  expect(getPreparedState<SourceCardViewModel>(element)).toBe(terminal);
  unbind();
  unbind();
  expect(() => controller.dispose()).not.toThrow();
  expect(() => controller.dispose()).not.toThrow();
});

test("clears an initial loading view model after a failed attempt", async () => {
  const failure = new Error("Network unavailable");
  render(html`<sefaria-source-card></sefaria-source-card>`);
  const element = document.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!element) throw new Error("Source card was not rendered.");
  const controller = createSourceCardController(
    createSefariaClient({
      cache: false,
      fetch: async () => {
        throw failure;
      },
    }),
  );
  const unbind = bindSourceCardController(element, controller);

  const pending = controller.load({ tref: "Micah 6:8" });
  expect(getPreparedState<SourceCardViewModel>(element)).toMatchObject({
    state: "loading",
  });
  await expect(pending).rejects.toBe(failure);
  expect(getPreparedState<SourceCardViewModel>(element)).toBeUndefined();

  unbind();
  controller.dispose();
});

test("rejects duplicate binding without disposing the caller controller", () => {
  render(html`<sefaria-source-card></sefaria-source-card>`);
  const element = document.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!element) throw new Error("Source card was not rendered.");
  const controller = createSourceCardController();
  const dispose = vi.spyOn(controller, "dispose");
  const unbind = bindSourceCardController(element, controller);

  expect(() => bindSourceCardController(element, controller)).toThrow(
    "already has an active controller binding",
  );
  unbind();
  expect(dispose).not.toHaveBeenCalled();
});

test("failed binding setup releases the element for another controller", () => {
  render(html`<sefaria-source-card></sefaria-source-card>`);
  const element = document.querySelector<SefariaSourceCard>(
    "sefaria-source-card",
  );
  if (!element) throw new Error("Source card was not rendered.");
  const disposed = createSourceCardController();
  disposed.dispose();

  expect(() => bindSourceCardController(element, disposed)).toThrow(
    "Component controller has been disposed.",
  );

  const controller = createSourceCardController();
  const unbind = bindSourceCardController(element, controller);
  expect(getPreparedState<SourceCardViewModel>(element)).toBeUndefined();
  unbind();
});

test("listener setup failure rolls back a binding reservation", () => {
  const { element, controller } = connections();
  const failure = new Error("Listener setup failed");
  const add = vi.spyOn(element, "addEventListener");
  add.mockImplementationOnce(() => {
    throw failure;
  });

  expect(() => bindConnectionsController(element, controller)).toThrow(failure);

  add.mockRestore();
  const unbind = bindConnectionsController(element, controller);
  unbind();
});

test.each(["before", "after"] as const)(
  "honors a listener registered %s the connections binding",
  async (order) => {
    const { element, controller } = connections();
    const prevent = (event: Event) => event.preventDefault();
    if (order === "before") {
      element.addEventListener("sefaria-connections-page-change", prevent);
    }
    const unbind = bindConnectionsController(element, controller);
    if (order === "after") {
      element.addEventListener("sefaria-connections-page-change", prevent);
    }
    const project = vi.spyOn(controller, "setProjection");

    element.dispatchEvent(
      new CustomEvent("sefaria-connections-page-change", {
        detail: { page: 1 },
        cancelable: true,
      }),
    );
    await Promise.resolve();

    expect(project).not.toHaveBeenCalled();
    element.removeEventListener("sefaria-connections-page-change", prevent);
    unbind();
  },
);

test("performs no late action after unbind during dispatch", async () => {
  const { element, controller } = connections();
  let unbind: () => void = () => undefined;
  unbind = bindConnectionsController(element, controller);
  const project = vi.spyOn(controller, "setProjection");
  element.addEventListener("sefaria-connections-page-change", () => unbind(), {
    once: true,
  });

  element.dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", {
      detail: { page: 1 },
      cancelable: true,
    }),
  );
  await Promise.resolve();

  expect(project).not.toHaveBeenCalled();
});

test("does not apply an old event to a replacement capture", async () => {
  const { element, controller } = connections();
  const unbind = bindConnectionsController(element, controller);
  const project = vi.spyOn(controller, "setProjection");
  element.addEventListener(
    "sefaria-connections-page-change",
    () => {
      controller.setSuppliedData({ tref: "Micah 6:8" }, linksPayload);
    },
    { once: true },
  );

  element.dispatchEvent(
    new CustomEvent("sefaria-connections-page-change", {
      detail: { page: 1 },
      cancelable: true,
    }),
  );
  await Promise.resolve();

  expect(project).not.toHaveBeenCalled();
  expect(controller.snapshot.result?.request.tref).toBe("Micah 6:8");
  unbind();
});

test("applies one current connections default action", async () => {
  const { element, controller } = connections();
  const unbind = bindConnectionsController(element, controller);
  const project = vi.spyOn(controller, "setProjection");

  element.dispatchEvent(
    new CustomEvent("sefaria-connections-category-change", {
      detail: { category: "Targum" },
      cancelable: true,
    }),
  );
  await Promise.resolve();

  expect(project).toHaveBeenCalledOnce();
  expect(controller.snapshot.result?.projection).toEqual({
    category: "Targum",
  });
  unbind();
});

function connections(): {
  readonly element: SefariaConnectionsPanel;
  readonly controller: ConnectionsController;
} {
  render(html`<sefaria-connections-panel></sefaria-connections-panel>`);
  const element = document.querySelector<SefariaConnectionsPanel>(
    "sefaria-connections-panel",
  );
  if (!element) throw new Error("Connections panel was not rendered.");
  const controller = createConnectionsController();
  controller.setSuppliedData({ tref: "Genesis 1:1" }, linksPayload);
  return { element, controller };
}
