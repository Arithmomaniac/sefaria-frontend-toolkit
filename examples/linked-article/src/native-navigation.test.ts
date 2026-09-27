import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";
import { expect, test } from "vitest";

test.each([false, true])(
  "keeps native navigation (alternate target when JavaScript enabled: %s)",
  async (javaScriptEnabled) => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "linked-article-"));
    const port = await reserveLoopbackPort();
    const root = fileURLToPath(new URL("..", import.meta.url));
    const server = await createServer({
      root,
      cacheDir: join(tempDirectory, "vite-cache"),
      server: { host: "127.0.0.1", port, strictPort: true },
    });
    const browser = await chromium.launch({ headless: true });

    try {
      await server.listen();
      const context = await browser.newContext({ javaScriptEnabled });
      const page = await context.newPage();
      const requests: string[] = [];
      await context.route("https://www.sefaria.org/**", async (route) => {
        requests.push(route.request().url());
        await route.fulfill({
          contentType: "text/html",
          body: "<title>Sefaria destination</title>",
        });
      });
      await page.goto(`http://127.0.0.1:${port}/`);
      let destination = page;
      if (javaScriptEnabled) {
        await page.waitForFunction(() =>
          document
            .querySelector("a[data-sefaria-ref]")
            ?.hasAttribute("aria-controls"),
        );
        const opened = context.waitForEvent("page");
        await page
          .getByRole("link", { name: "Micah 6:8" })
          .evaluate((anchor) => anchor.setAttribute("target", "_blank"));
        await page.getByRole("link", { name: "Micah 6:8" }).click();
        destination = await opened;
      } else {
        await page.getByRole("link", { name: "Micah 6:8" }).click();
      }
      await destination.waitForURL("https://www.sefaria.org/Micah.6.8");
      expect(requests).toEqual(["https://www.sefaria.org/Micah.6.8"]);
      expect(await page.locator("dialog, sefaria-source-card").count()).toBe(0);
      await context.close();
    } finally {
      await browser.close();
      await server.close();
      await rm(tempDirectory, { recursive: true, force: true });
    }
  },
  30_000,
);

async function reserveLoopbackPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  if (address === null || typeof address === "string") {
    throw new Error("Unable to reserve a loopback port.");
  }
  return address.port;
}
