// Browser checks owned by stage 7 session 1 (components pages and LiveEditor).
import { readFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { startSitePreview } from "./site-preview-server.mjs";

const scriptUrl =
  "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js";

function fail(message) {
  throw new Error(`[session 1] ${message}`);
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
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

const editorRoute = "/use-components/show-text/label-a-citation.html";
const editorSnippet = "ref-label.html";

/** Offline LiveEditor checks: local toolkit script, no Sefaria access. */
export async function runSessionOneSiteChecks({ root, siteBasePath }) {
  const localScript = await readFile(
    path.join(root, "dist", "site", "cdn", "local", "sefaria-elements.js"),
    "utf8",
  );
  const snippet = (
    await readFile(
      path.join(root, "examples", "site-snippets", editorSnippet),
      "utf8",
    )
  ).trim();

  await withSite(root, siteBasePath, async ({ browser, origin, url }) => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 120 },
    });
    let scriptRequests = 0;
    await page.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.href === scriptUrl) {
        scriptRequests += 1;
        await route.fulfill({
          body: localScript,
          contentType: "text/javascript",
        });
      } else if (
        requestUrl.origin === origin ||
        ["data:", "about:"].includes(requestUrl.protocol)
      ) {
        await route.continue();
      } else {
        await route.abort("blockedbyclient");
      }
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(url(editorRoute), { waitUntil: "networkidle" });
    const editor = page.locator(".live-editor").first();
    const frame = editor.locator("iframe.live-editor__frame");

    // Viewport loading: nothing runs until the editor nears the viewport.
    const offscreen = await editor.evaluate(
      (element) =>
        element.getBoundingClientRect().top > globalThis.innerHeight + 200,
    );
    expectEqual(offscreen, true, "editor starts below the loading margin");
    expectEqual(
      await frame.getAttribute("srcdoc"),
      null,
      "no srcdoc offscreen",
    );
    expectEqual(scriptRequests, 0, "no script request before scrolling");

    await page.setViewportSize({ width: 1280, height: 900 });
    await editor.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector(".live-editor__frame")
          ?.getAttribute("srcdoc") != null,
    );

    // Isolation: sandboxed, opaque origin, no parent access.
    expectEqual(
      await frame.getAttribute("sandbox"),
      "allow-scripts",
      "sandbox attribute",
    );
    const inner = page.frameLocator(".live-editor__frame").first();
    await inner.locator("sefaria-ref-label").waitFor({ state: "attached" });
    const childFrame = page
      .frames()
      .find(
        (candidate) =>
          candidate.parentFrame() === page.mainFrame() &&
          candidate.url() === "about:srcdoc",
      );
    if (!childFrame) fail("sandboxed frame not found");
    const isolation = await childFrame.evaluate(() => {
      let parentReadable = true;
      try {
        void globalThis.parent.document.title;
      } catch {
        parentReadable = false;
      }
      return { origin: globalThis.origin, parentReadable };
    });
    expectEqual(isolation.origin, "null", "frame origin");
    expectEqual(isolation.parentReadable, false, "frame reads parent document");
    await childFrame.waitForFunction(
      () => customElements.get("sefaria-ref-label") !== undefined,
    );
    expectEqual(scriptRequests, 1, "script requests after scrolling");

    // Shown code is the code that runs.
    const shown = (await editor.locator("pre.site-code").textContent()).trim();
    expectEqual(shown, snippet, "shown code matches the owner file");
    const srcdoc = await frame.getAttribute("srcdoc");
    expectEqual(
      srcdoc.startsWith(snippet),
      true,
      "srcdoc starts with shown code",
    );

    // Height follows the content.
    await page.waitForFunction(() => {
      const element = globalThis.document.querySelector(".live-editor__frame");
      return element && element.style.height !== "";
    });

    // Editing: Edit shows the code in a textarea; Run applies the change.
    await editor.getByRole("button", { name: "Edit" }).click();
    const textarea = editor.getByRole("textbox");
    expectEqual((await textarea.inputValue()).trim(), snippet, "editable code");
    await textarea.fill('<p id="edited">Edited example</p>');
    expectEqual(
      await inner.locator("#edited").count(),
      0,
      "edits wait for Run",
    );
    await editor.getByRole("button", { name: "Run" }).click();
    await inner.locator("#edited").waitFor();
    expectEqual(
      (await frame.getAttribute("srcdoc")).startsWith(
        '<p id="edited">Edited example</p>',
      ),
      true,
      "edited srcdoc",
    );

    await editor.getByRole("button", { name: "Reset" }).click();
    await inner.locator("sefaria-ref-label").waitFor({ state: "attached" });
    expectEqual(
      (await editor.locator("pre.site-code").textContent()).trim(),
      snippet,
      "reset restores the owner code",
    );
    expectEqual(pageErrors.length, 0, `page errors: ${pageErrors.join("; ")}`);
    await page.close();
  });
  console.log("Session 1 site checks passed.");
}

/**
 * Live-network check: a sandboxed frame has an opaque origin and sends
 * `Origin: null`. Prove the script host and Sefaria accept it.
 */
export async function runSessionOneLiveChecks({ root, siteBasePath }) {
  await withSite(root, siteBasePath, async ({ browser, url }) => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const responses = [];
    page.on("response", (response) => {
      const host = new URL(response.url()).host;
      if (["arithmomaniac.github.io", "www.sefaria.org"].includes(host)) {
        responses.push({
          url: response.url(),
          status: response.status(),
          allowOrigin: response.headers()["access-control-allow-origin"],
        });
      }
    });
    await page.goto(url("/use-components/show-text/label-a-citation.html"));
    await page.locator(".live-editor").first().scrollIntoViewIfNeeded();
    const childFrame = await (async () => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const found = page.frames().find((f) => f.url() === "about:srcdoc");
        if (found) return found;
        await page.waitForTimeout(100);
      }
      fail("sandboxed frame not found");
    })();
    await childFrame.evaluate(() => {
      globalThis.document.body.insertAdjacentHTML(
        "beforeend",
        '<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>',
      );
    });
    await childFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-source-card")?.status ===
        "ready",
      undefined,
      { timeout: 30_000 },
    );
    const script = responses.find((entry) => entry.url === scriptUrl);
    expectEqual(script?.status, 200, "CDN script status from Origin: null");
    const text = responses.find((entry) =>
      entry.url.startsWith("https://www.sefaria.org/api/v3/texts/"),
    );
    expectEqual(text?.status, 200, "Sefaria text status from Origin: null");
    expectEqual(text?.allowOrigin, "*", "Sefaria CORS header");
    await page.close();
  });
  console.log("Session 1 live checks passed.");
}
