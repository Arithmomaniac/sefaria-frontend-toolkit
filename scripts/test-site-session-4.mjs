// Browser checks owned by stage 7 session 4 (concepts, help, AI assistant and examples).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { chromium } from "playwright";

import { createFixtureResponse } from "./site-fixtures.mjs";
import { startSitePreview } from "./site-preview-server.mjs";

function fail(message) {
  throw new Error(`[session 4] ${message}`);
}

async function withSite(root, siteBasePath, run) {
  const server = await startSitePreview({ root, siteBasePath });
  const sitePath = (route) =>
    `${siteBasePath === "/" ? "" : siteBasePath.slice(0, -1)}${route}`;
  try {
    await server.waitUntilReady();
    const browser = await chromium.launch({ headless: true });
    try {
      await run({
        browser,
        origin: server.origin,
        url: (route) => `${server.origin}${sitePath(route)}`,
      });
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

async function routeOffline(page, origin, fixture, requests) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin === origin ||
      ["data:", "about:", "blob:"].includes(url.protocol)
    ) {
      await route.continue();
      return;
    }
    if (url.origin === "https://www.sefaria.org") {
      requests.push(url.pathname);
      if (url.pathname.startsWith("/api/v3/texts/")) {
        await route.fulfill({
          json: createFixtureResponse(
            request.url(),
            "text-fixture",
            fixture,
            [],
          ),
        });
        return;
      }
    }
    await route.abort("blockedbyclient");
  });
}

/** Embedded example apps load in their frames and behave as their pages say. */
export async function runSessionFourSiteChecks({ root, siteBasePath }) {
  const { payload: fixture } = JSON.parse(
    await readFile(
      path.join(root, "tests", "site-fixtures", "micah-6-8-2026-09-28.json"),
      "utf8",
    ),
  );

  await withSite(root, siteBasePath, async ({ browser, origin, url }) => {
    const linked = await browser.newPage();
    const linkedRequests = [];
    await routeOffline(linked, origin, fixture, linkedRequests);
    await linked.goto(url("/examples/linked-article.html"), {
      waitUntil: "networkidle",
    });
    const article = linked.frameLocator("iframe");
    const citation = article.locator("a[data-sefaria-ref]").first();
    await citation.waitFor();
    if (linkedRequests.length !== 0)
      fail(`linked article fetched before a click: ${linkedRequests}`);
    await citation.click();
    await article.locator("dialog sefaria-source-card").waitFor();
    await article
      .locator("dialog sefaria-source-card")
      .locator("text=Micah 6:8")
      .first()
      .waitFor();
    if (linkedRequests.length !== 1)
      fail(`linked article made ${linkedRequests.length} requests, expected 1`);
    await article.locator("dialog").press("Escape");
    await article.locator("dialog").waitFor({ state: "detached" });
    await linked.close();

    const chat = await browser.newPage();
    const chatRequests = [];
    await routeOffline(chat, origin, fixture, chatRequests);
    await chat.goto(url("/examples/reader-inside-ai-chat.html"), {
      waitUntil: "networkidle",
    });
    const host = chat.frameLocator("iframe");
    await host.getByRole("button", { name: /start live demo/i }).waitFor();
    if (chatRequests.length !== 0)
      fail(`chat host fetched before start: ${chatRequests}`);
    await chat.close();
  });
}
