// Browser checks owned by stage 7 session 1 (components pages and LiveEditor).
import { readFile } from "node:fs/promises";
import path from "node:path";

import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

import { createFixtureResponse } from "./site-fixtures.mjs";
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

const editorRoute = "/use-components/show-an-attributed-passage.html";
const editorSnippet = "source-card-select.html";

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
    await inner
      .locator("sefaria-source-card")
      .first()
      .waitFor({ state: "attached" });
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
      () => globalThis.customElements.get("sefaria-source-card") !== undefined,
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
    await inner
      .locator("sefaria-source-card")
      .first()
      .waitFor({ state: "attached" });
    expectEqual(
      (await editor.locator("pre.site-code").textContent()).trim(),
      snippet,
      "reset restores the owner code",
    );
    expectEqual(pageErrors.length, 0, `page errors: ${pageErrors.join("; ")}`);
    await page.close();
  });
  await runShowTextChecks({ root, siteBasePath, localScript });
  process.stdout.write("Session 1 site checks passed.\n");
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
    await page.goto(url("/use-components/show-an-attributed-passage.html"));
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
  process.stdout.write("Session 1 live checks passed.\n");
}

const showTextPages = [
  "/use-components/show-text/show-one-passage.html",
  "/use-components/show-text/hebrew-and-translation.html",
  "/use-components/show-an-attributed-passage.html",
  "/use-components/use-with-a-framework.html",
  "/use-components/show-commentary-and-connected-texts.html",
  "/use-components/add-the-complete-reader.html",
  "/across-components/match-your-sites-look.html",
  "/across-components/choose-what-text-readers-see.html",
  "/across-components/make-components-respond-to-each-other.html",
];

async function loadFixture(root, name) {
  return JSON.parse(
    await readFile(path.join(root, "tests", "site-fixtures", name), "utf8"),
  ).payload;
}

async function routeOffline(
  page,
  { origin, localScript, fixtures, failSefaria = false },
) {
  const sefariaRequests = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.href === scriptUrl) {
      await route.fulfill({
        body: localScript,
        contentType: "text/javascript",
      });
      return;
    }
    if (url.origin === origin || ["data:", "about:"].includes(url.protocol)) {
      await route.continue();
      return;
    }
    if (url.origin === "https://www.sefaria.org") {
      sefariaRequests.push(decodeURIComponent(url.pathname + url.search));
      if (failSefaria) {
        await route.abort("failed");
        return;
      }
      const reference = decodeURIComponent(url.pathname.split("/").at(-1));
      if (url.pathname.startsWith("/api/links/")) {
        await route.fulfill({
          json: reference === "Micah 6:8" ? fixtures.links : [],
        });
        return;
      }
      if (url.pathname.startsWith("/api/ref/")) {
        await route.fulfill({
          json: reference === "Micah 6:8" ? fixtures.ref : fixtures.notRef,
        });
        return;
      }
      if (
        url.pathname.startsWith("/api/v3/texts/") &&
        reference === "Micah 6:6-8"
      ) {
        await route.fulfill({ json: fixtures.range });
        return;
      }
      if (
        url.pathname.startsWith("/api/v3/texts/") &&
        reference !== "Not a book 3:4"
      ) {
        const payload = createFixtureResponse(
          request.url(),
          "text-fixture",
          fixtures.text,
          [],
        );
        await route.fulfill({
          json: url.searchParams.getAll("version").includes("french")
            ? asFrench(payload)
            : payload,
        });
        return;
      }
    }
    await route.abort("blockedbyclient");
  });
  return sefariaRequests;
}

async function editorFrame(editor) {
  await editor.scrollIntoViewIfNeeded();
  const iframe = editor.locator("iframe.live-editor__frame");
  await editor
    .page()
    .waitForFunction(
      (element) => element.getAttribute("srcdoc") != null,
      await iframe.elementHandle(),
    );
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = await (await iframe.elementHandle()).contentFrame();
    if (frame && frame.url() === "about:srcdoc") return frame;
    await editor.page().waitForTimeout(50);
  }
  fail("editor frame did not load");
}

async function runShowTextChecks({ root, siteBasePath, localScript }) {
  const fixtures = {
    ref: await loadFixture(root, "micah-6-8-ref-2026-09-29.json"),
    notRef: await loadFixture(root, "not-a-ref-2026-09-29.json"),
    text: await loadFixture(root, "micah-6-8-2026-09-28.json"),
    range: await loadFixture(root, "micah-6-6-8-2026-09-29.json"),
    links: await loadFixture(root, "micah-6-8-links-2026-09-29.json"),
  };
  await withSite(root, siteBasePath, async ({ browser, origin, url }) => {
    // Every example on each page shows exactly its owner file.
    for (const route of showTextPages) {
      const page = await browser.newPage();
      await routeOffline(page, { origin, localScript, fixtures });
      await page.goto(url(route), { waitUntil: "networkidle" });
      const markdown = await readFile(
        path.join(root, "docs", `${route.slice(1).replace(/\.html$/, ".md")}`),
        "utf8",
      );
      const imports = [
        ...markdown.matchAll(
          /import (\w+) from "[./]+examples\/site-snippets\/([\w-]+\.html)\?raw"/g,
        ),
      ].map((match) => [match[1], match[2]]);
      const usages = [...markdown.matchAll(/<LiveEditor :code="(\w+)"/g)].map(
        (match) => imports.find(([name]) => name === match[1])[1],
      );
      const shown = await page
        .locator(".live-editor pre.site-code")
        .allTextContents();
      expectEqual(shown.length, usages.length, `${route} example count`);
      for (const [index, snippet] of usages.entries()) {
        const owner = (
          await readFile(
            path.join(root, "examples", "site-snippets", snippet),
            "utf8",
          )
        ).trim();
        expectEqual(
          shown[index].trim(),
          owner,
          `${route} ${snippet} shown code`,
        );
      }
      await page.close();
    }

    // Framework page: read-only code blocks show their tested owner files.
    const frameworks = await browser.newPage();
    await routeOffline(frameworks, { origin, localScript, fixtures });
    await frameworks.goto(url(showTextPages[3]), { waitUntil: "networkidle" });
    const blocks = await frameworks
      .locator("figure.site-code-block")
      .evaluateAll((figures) =>
        figures.map((figure) => [
          figure.querySelector("figcaption")?.textContent?.trim(),
          figure.querySelector("pre")?.textContent?.trim(),
        ]),
      );
    for (const owner of [
      "examples/react-vite/src/site-source-card.tsx",
      "examples/alpine-vite/src/site-source-card.html",
    ]) {
      const block = blocks.find(([label]) => label === owner);
      if (!block) fail(`no code block labelled ${owner}`);
      expectEqual(
        block[1],
        (await readFile(path.join(root, owner), "utf8")).trim(),
        `${owner} shown code`,
      );
    }
    const vanillaEditor = frameworks.locator(".live-editor").first();
    expectEqual(
      await vanillaEditor.getByRole("button", { name: "Edit" }).count(),
      0,
      "read-only vanilla example has no Edit button",
    );
    await frameworks.close();

    // Source Card page: selecting a verse delivers position and ref.
    const cardPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const cardRequests = await routeOffline(cardPage, {
      origin,
      localScript,
      fixtures,
    });
    await cardPage.goto(url(showTextPages[2]), { waitUntil: "networkidle" });
    const selectFrame = await editorFrame(
      cardPage.locator(".live-editor").first(),
    );
    await selectFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-source-card")?.status ===
        "ready",
    );
    await selectFrame
      .locator("sefaria-source-card")
      .getByRole("button", { name: "Show connections for Micah 6:7" })
      .first()
      .click();
    await selectFrame
      .locator("#selection")
      .filter({ hasText: "You selected Micah 6:7 (position 1)." })
      .waitFor();
    expectEqual(
      await selectFrame
        .locator("sefaria-source-card")
        .getByRole("button", { name: "Show connections for Micah 6:7" })
        .first()
        .getAttribute("aria-pressed"),
      "true",
      "selected verse is pressed",
    );
    expectEqual(
      cardRequests.filter((entry) =>
        entry.startsWith("/api/v3/texts/Micah 6:6-8"),
      ).length,
      1,
      "one Source Card request, none from its verses",
    );
    await cardPage.close();

    // Connections Panel: one links request; category changes reuse it.
    const connections = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const linkRequests = await routeOffline(connections, {
      origin,
      localScript,
      fixtures,
    });
    await connections.goto(url(showTextPages[4]), { waitUntil: "networkidle" });
    const eventsFrame = await editorFrame(
      connections.locator(".live-editor").nth(1),
    );
    await eventsFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-connections-panel")
          ?.status === "ready",
    );
    const linksBefore = linkRequests.filter((entry) =>
      entry.startsWith("/api/links/Micah 6:8"),
    ).length;
    await eventsFrame
      .locator("sefaria-connections-panel")
      .getByRole("button", { name: /^Midrash/ })
      .click();
    await eventsFrame
      .locator("#log")
      .filter({
        hasText: 'sefaria-connections-category-change {"category":"Midrash"}',
      })
      .waitFor();
    await eventsFrame
      .locator("sefaria-connections-panel")
      .getByRole("button", { name: /in context$/ })
      .first()
      .click();
    await eventsFrame
      .locator("#log")
      .filter({ hasText: "sefaria-connection-select" })
      .waitFor();
    expectEqual(
      linkRequests.filter((entry) => entry.startsWith("/api/links/Micah 6:8"))
        .length,
      linksBefore,
      "category change and selection make no request",
    );
    await connections.close();

    // Reader: three requests on a fresh load; a toolbar button reads selectedRef.
    const readerPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const readerRequests = await routeOffline(readerPage, {
      origin,
      localScript,
      fixtures,
    });
    await readerPage.goto(url(showTextPages[5]), { waitUntil: "networkidle" });
    const readerFrame = await editorFrame(
      readerPage.locator(".live-editor").first(),
    );
    await readerFrame.waitForFunction(() => {
      const reader = globalThis.document.querySelector("sefaria-reader");
      return reader?.status === "ready" && reader.selectedRef === "Micah 6:8";
    });
    await readerFrame.waitForTimeout(300);
    const readerLoad = readerRequests.map((entry) => entry.split("?")[0]);
    expectEqual(
      JSON.stringify(readerLoad),
      JSON.stringify([
        "/api/v3/texts/Micah 6:8",
        "/api/v3/texts/Micah 6",
        "/api/links/Micah 6:8",
      ]),
      "Reader fresh-load requests",
    );
    await readerFrame.locator("#bookmark").click();
    await readerFrame
      .locator("#message")
      .filter({ hasText: "Bookmarked Micah 6:8." })
      .waitFor();
    expectEqual(readerRequests.length, 3, "toolbar action makes no request");
    await readerPage.close();

    // Styling page: forcing dark changes colors without a request.
    const themePage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const themeRequests = await routeOffline(themePage, {
      origin,
      localScript,
      fixtures,
    });
    await themePage.goto(url(showTextPages[6]), { waitUntil: "networkidle" });
    const themeFrame = await editorFrame(
      themePage.locator(".live-editor").first(),
    );
    await themeFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-source-card")?.status ===
        "ready",
    );
    const themeLinkColor = () =>
      themeFrame.evaluate(
        () =>
          globalThis.getComputedStyle(
            globalThis.document
              .querySelector("sefaria-source-card")
              .shadowRoot.querySelector("a"),
          ).color,
      );
    const themeBefore = themeRequests.length;
    expectEqual(
      await themeLinkColor(),
      "rgb(29, 78, 216)",
      "light token color",
    );
    await themeFrame.locator("#dark").check();
    await themeFrame.waitForFunction(
      () =>
        globalThis.getComputedStyle(
          globalThis.document
            .querySelector("sefaria-source-card")
            .shadowRoot.querySelector("a"),
        ).color === "rgb(147, 180, 255)",
    );
    expectEqual(
      themeRequests.length,
      themeBefore,
      "forcing dark makes no request",
    );
    await themePage.close();

    // Text choices: display choices redraw; a language choice requests once.
    const choicePage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const choiceRequests = await routeOffline(choicePage, {
      origin,
      localScript,
      fixtures,
    });
    await choicePage.goto(url(showTextPages[7]), { waitUntil: "networkidle" });
    const choiceFrame = await editorFrame(
      choicePage.locator(".live-editor").first(),
    );
    const cardReady = () =>
      choiceFrame.waitForFunction(
        () =>
          globalThis.document.querySelector("sefaria-source-card")?.status ===
          "ready",
      );
    await cardReady();
    const textRequests = () =>
      choiceRequests.filter((entry) => entry.startsWith("/api/v3/texts/"));
    expectEqual(textRequests().length, 1, "initial text request");
    await choiceFrame.selectOption("select[name=vocalization-mode]", "none");
    await choiceFrame.selectOption(
      "select[name=content-language]",
      "translation",
    );
    await cardReady();
    await choiceFrame.waitForTimeout(300);
    expectEqual(textRequests().length, 1, "display choices make no request");
    await choiceFrame.selectOption(
      "select[name=translation-language]",
      "french",
    );
    await choiceFrame.waitForFunction(
      () =>
        globalThis.document
          .querySelector("sefaria-source-card")
          ?.getAttribute("translation-language") === "french",
    );
    await cardReady();
    await choiceFrame.waitForTimeout(300);
    expectEqual(textRequests().length, 2, "language choice makes one request");
    expectEqual(
      textRequests()[1].includes("version=french"),
      true,
      "the new request asks for French",
    );
    await choicePage.close();

    // Coordination: a selection points the panel at the verse with one request.
    const coordPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const coordRequests = await routeOffline(coordPage, {
      origin,
      localScript,
      fixtures,
    });
    await coordPage.goto(url(showTextPages[8]), { waitUntil: "networkidle" });
    const coordFrame = await editorFrame(
      coordPage.locator(".live-editor").first(),
    );
    await coordFrame.waitForFunction(() =>
      ["sefaria-source-card", "sefaria-connections-panel"].every(
        (tag) => globalThis.document.querySelector(tag)?.status === "ready",
      ),
    );
    expectEqual(coordRequests.length, 2, "coordination fresh load");
    await coordFrame
      .locator("sefaria-source-card")
      .getByRole("button", { name: "Show connections for Micah 6:7" })
      .first()
      .click();
    await coordFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-connections-panel")?.sref ===
        "Micah 6:7",
    );
    await coordFrame.waitForTimeout(300);
    expectEqual(
      JSON.stringify(
        coordRequests.slice(2).map((entry) => entry.split("?")[0]),
      ),
      JSON.stringify(["/api/links/Micah 6:7"]),
      "one links request for the new reference",
    );
    await coordPage.close();

    // Text Segment: a fresh load of the default example makes one request.
    const passage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const passageRequests = await routeOffline(passage, {
      origin,
      localScript,
      fixtures,
    });
    await passage.goto(url(showTextPages[0]), { waitUntil: "networkidle" });
    const defaultFrame = await editorFrame(
      passage.locator(".live-editor").first(),
    );
    await defaultFrame.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-text-segment")?.status ===
        "ready",
    );
    expectEqual(
      passageRequests.filter((entry) =>
        entry.startsWith("/api/v3/texts/Micah 6:8"),
      ).length,
      1,
      "default passage requests",
    );
    await passage.close();
  });
}

function asFrench(payload) {
  const copy = globalThis.structuredClone(payload);
  for (const version of copy.versions) {
    if (!version.isPrimary) {
      Object.assign(version, {
        language: "fr",
        languageFamilyName: "french",
        actualLanguage: "fr",
        direction: "ltr",
        versionTitle: "Fixture French edition [fr]",
      });
    }
  }
  return copy;
}
