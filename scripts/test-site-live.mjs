import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "playwright";

import { readSiteBasePath } from "./build-site-plan.mjs";
import { startSitePreview } from "./site-preview-server.mjs";

const root = path.resolve(import.meta.dirname, "..");
const siteBasePath = readSiteBasePath(process.argv.slice(2));
const previewServer = await startSitePreview({ root, siteBasePath });
const { origin } = previewServer;
const sitePath = (route) =>
  `${siteBasePath === "/" ? "" : siteBasePath.slice(0, -1)}${route}`;
const siteRouteUrl = (route) => `${origin}${sitePath(route)}`;

try {
  await previewServer.waitUntilReady();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    page.setDefaultTimeout(20_000);
    const failures = [];

    for (const testCase of [
      ...[
        ["text segment", "/examples/explorer/text-segment.html"],
        ["bilingual segment", "/examples/explorer/bilingual-segment.html"],
        ["reference label", "/examples/explorer/ref-label.html"],
        ["source card", "/examples/explorer/source-card.html"],
      ].map(([name, route]) => ({
        name,
        route,
        maximumRequests: 1,
        run: async () => {
          await page.getByRole("button", { name: "Start live demo" }).click();
          await page.locator("#request-state[data-state='data']").waitFor();
        },
      })),
      {
        name: "contextual connections",
        route: "/examples/explorer/connections.html",
        maximumRequests: 3,
        run: async () => {
          await page.getByRole("button", { name: "Start live demo" }).click();
          await page.waitForFunction(
            () =>
              globalThis.document
                .querySelector("#status")
                ?.textContent?.startsWith("Showing ") === true &&
              globalThis.document
                .querySelector("#status")
                ?.textContent?.includes("loading") === false,
          );
        },
      },
      {
        name: "controlled Reader",
        route: "/examples/reader/controlled.html?tref=Micah%206%3A8",
        maximumRequests: 6,
        run: async () => {
          await page.getByRole("button", { name: "Start live demo" }).click();
          await waitForShowingStatus(page);
          const reference = page.locator('input[name="tref"]');
          await reference.fill("Rashi on Micah 6:8:1");
          await reference.press("Enter");
          await waitForShowingStatus(page, "Rashi");
        },
      },
      {
        name: "spatial Reader",
        route: "/examples/reader/index.html?tref=Micah%206%3A8",
        maximumRequests: 3,
        run: async () => {
          await page.getByRole("button", { name: "Start live demo" }).click();
          await waitForShowingStatus(page);
        },
      },
      {
        name: "vanilla consumer",
        route: "/examples/vanilla/index.html",
        maximumRequests: 1,
        run: async () => {
          await page.locator("#load-live").click();
          await page
            .locator("#status")
            .filter({ hasText: "Loaded live Micah 6:8 data" })
            .waitFor();
        },
      },
      {
        name: "React consumer",
        route: "/examples/react/index.html",
        maximumRequests: 1,
        run: async () => {
          await page.locator("#load-live").click();
          await page
            .locator("#request-status")
            .filter({ hasText: "Committed canonical reference Micah 6:8." })
            .waitFor();
        },
      },
      {
        name: "Alpine consumer",
        route: "/examples/alpine/index.html",
        maximumRequests: 1,
        run: async () => {
          await page.locator("#load-live").click();
          await page
            .locator("#request-status")
            .filter({ hasText: "Committed canonical reference Micah 6:8." })
            .waitFor();
        },
      },
      {
        name: "linked article",
        route: "/examples/linked-article/",
        maximumRequests: 1,
        run: async () => {
          await page
            .getByRole("link", { name: "Micah 6:8", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Close source preview" })
            .waitFor();
        },
      },
      {
        name: "embedded MCP",
        route: "/examples/mcp-app/live.html",
        maximumRequests: 2,
        run: async (requests) => {
          await page.getByRole("button", { name: "Start live demo" }).click();
          await page
            .frameLocator("#sandbox")
            .locator("iframe")
            .contentFrame()
            .locator("sefaria-reader")
            .waitFor();
          await waitForRequestCount(requests, 2);
        },
      },
    ]) {
      const requests = [];
      const recordRequest = (request) => {
        if (request.url().startsWith("https://www.sefaria.org/api/")) {
          requests.push(request.url());
        }
      };
      page.on("request", recordRequest);
      try {
        await page.goto(siteRouteUrl(testCase.route), {
          waitUntil: "networkidle",
        });
        if (requests.length !== 0) {
          throw new Error(
            `made ${requests.length} Sefaria request(s) before activation`,
          );
        }
        await testCase.run(requests);
        if (
          requests.length === 0 ||
          requests.length > testCase.maximumRequests
        ) {
          throw new Error(
            `made ${requests.length} request(s) after activation; expected 1-${testCase.maximumRequests}: ${requests.join(", ")}`,
          );
        }
        process.stdout.write(
          `✓ ${testCase.name}: ${requests.length} live request(s)\n`,
        );
      } catch (error) {
        const diagnostics = await page
          .evaluate(() => ({
            status: globalThis.document.querySelector("#status")?.textContent,
            hostError:
              globalThis.document.querySelector("#host-error")?.textContent,
          }))
          .catch(() => ({}));
        failures.push(
          `${testCase.name} (${testCase.route}): ${error instanceof Error ? error.message : String(error)}; ${JSON.stringify(diagnostics)}; requests: ${requests.join(", ")}`,
        );
      } finally {
        page.off("request", recordRequest);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Live site smoke failed:\n- ${failures.join("\n- ")}`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await previewServer.close();
}

async function waitForShowingStatus(page, prefix = "") {
  await page.waitForFunction(
    (expectedPrefix) =>
      globalThis.document
        .querySelector("#status")
        ?.textContent?.startsWith(`Showing ${expectedPrefix}`) === true,
    prefix,
  );
}

async function waitForRequestCount(requests, expected) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (requests.length >= expected) return;
    await delay(50);
  }
  throw new Error(
    `timed out waiting for ${expected} requests; received ${requests.length}`,
  );
}
