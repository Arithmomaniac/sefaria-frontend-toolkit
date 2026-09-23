import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

import { classifySiteRequest } from "./site-request-policy.mjs";
import { startSitePreview } from "./site-preview-server.mjs";
import { readSiteBasePath } from "./build-site-plan.mjs";

const root = path.resolve(import.meta.dirname, "..");
const screenshotDirectory = process.env.SITE_SCREENSHOT_DIR;
const siteBasePath = readSiteBasePath(process.argv.slice(2));
const previewServer = await startSitePreview({ root, siteBasePath });
const { origin, siteUrl } = previewServer;
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
    const textRequests = [];
    const unexpectedRequests = [];
    const browserErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(`console: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      browserErrors.push(`pageerror: ${error.message}`);
    });
    const fixture = JSON.parse(
      await readFile(
        path.join(root, "examples", "react-vite", "src", "micah-6-8.json"),
        "utf8",
      ),
    );
    const linksFixture = JSON.parse(
      await readFile(
        path.join(
          root,
          "packages",
          "client",
          "test",
          "fixtures",
          "links-connections-preview-2026-09-06.json",
        ),
        "utf8",
      ),
    );
    await page.route("**/*", async (route) => {
      const request = route.request();
      const policy = classifySiteRequest({
        method: request.method(),
        requestUrl: request.url(),
        siteOrigin: origin,
      });
      if (policy === "local") {
        await route.continue();
        return;
      }
      if (policy === "text-fixture" || policy === "links-fixture") {
        textRequests.push(request.url());
        await route.fulfill({
          json: createFixtureResponse(
            request.url(),
            policy,
            fixture,
            linksFixture,
          ),
        });
        return;
      }
      unexpectedRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
    });

    await page.goto(siteUrl, { waitUntil: "networkidle" });
    await assertText(page.locator("h1"), "Sefaria Frontend Toolkit");
    await assertText(
      page.locator("body"),
      "Bring Sefaria texts into your product",
    );
    await assertText(page.locator("body"), "free digital library");
    await assertText(page.locator("body"), "See the toolkit in action");
    await assertText(page.locator("body"), "Fetch and validate data");
    await assertText(page.locator("body"), "Prepare text you already have");
    await assertText(page.locator("body"), "Build a complete Reader");
    await assertText(page.locator("body"), "Try the editor");
    await assertText(page.locator("body"), "You can stop at any layer");
    await assertNotPresent(
      page.locator("body"),
      "Microsoft Global Hackathon 2026",
    );
    await assertVisibleText(
      page.locator(".documentation-disclosure"),
      "Documentation text was written and edited by GitHub Copilot; pending human review.",
    );
    assertEqual(
      await page.locator(".VPFeatures").count(),
      0,
      "generic landing feature row count",
    );
    if (
      (await page.locator("body").textContent())?.includes(
        "Created/edited by GitHub Copilot",
      )
    ) {
      throw new Error(
        "Published pages expose the repository provenance header.",
      );
    }
    const landingPreview = page.frameLocator(
      'iframe[title="Interactive supplied-data source card"]',
    );
    await landingPreview.locator("sefaria-source-card").waitFor();
    const passageText = landingPreview
      .locator("sefaria-text-segment .body-part")
      .first();
    await passageText.waitFor();
    const passageTextContent = (await passageText.textContent())?.trim();
    if (!passageTextContent) {
      throw new Error("Interactive landing preview has no passage text.");
    }
    const passageTextPosition = await passageText.boundingBox();
    const viewport = page.viewportSize();
    if (
      !passageTextPosition ||
      !viewport ||
      passageTextPosition.y < 0 ||
      passageTextPosition.y + passageTextPosition.height > viewport.height
    ) {
      throw new Error(
        `Interactive landing passage text is not fully visible in the first viewport: ${JSON.stringify(
          passageTextPosition,
        )}.`,
      );
    }
    const previewPosition = await page
      .locator(".landing-preview__stage")
      .boundingBox();
    if (!previewPosition || previewPosition.y >= 700) {
      throw new Error(
        `Interactive landing preview starts too far below the first viewport: ${JSON.stringify(previewPosition)}.`,
      );
    }
    await assertText(
      landingPreview.locator("#status"),
      "Supplied Micah 6:8 data rendered with zero live loads.",
    );
    assertEqual(
      await landingPreview
        .getByRole("button", { name: "Start live demo" })
        .count(),
      0,
      "landing live action count",
    );
    assertEqual(textRequests.length, 0, "landing request count");
    for (const [name, expectedPath] of [
      ["Get started", "/get-started.html"],
      ["Components", "/components.html"],
      ["Examples", "/examples.html"],
      ["Guides", "/guides/"],
      ["Reference", "/reference/custom-elements.html"],
    ]) {
      const link = page.getByRole("link", { name, exact: true }).first();
      assertEqual(
        new URL(await link.getAttribute("href"), page.url()).pathname,
        sitePath(expectedPath),
        `${name} navigation route`,
      );
    }
    for (const repositoryOnlyFile of [
      "README.html",
      "archive/index.html",
      "design.html",
      "development.html",
      "evidence.html",
      "guides/reader-navigation.html",
      "images/reader-navigation.html",
      "reference/documentation-map.html",
      "review.html",
      "specs/client.html",
    ]) {
      await assertFileMissing(
        path.join(root, "dist", "site", repositoryOnlyFile),
        `${repositoryOnlyFile} repository-only artifact`,
      );
    }
    for (const [name, expectedPath] of [
      ["Follow the Reader path", "/learn/04-reader.html"],
      ["Choose a focused component", "/components.html"],
      ["Try the editor", "/examples/playground/index.html"],
      [
        "Use the client without components",
        "/get-started.html#use-the-client-without-components",
      ],
      [
        "Use the text tools on their own",
        "/get-started.html#use-text-transforms-without-the-client",
      ],
    ]) {
      const href = await page
        .getByRole("link", { name, exact: false })
        .getAttribute("href");
      const url = new URL(href, page.url());
      assertEqual(
        `${url.pathname}${url.hash}`,
        `${sitePath(expectedPath.split("#")[0])}${
          expectedPath.includes("#") ? `#${expectedPath.split("#")[1]}` : ""
        }`,
        `${name} landing path`,
      );
    }
    await page
      .getByRole("button", { name: /Search/u })
      .first()
      .waitFor();
    const primaryContrast = await contrastRatio(
      page.locator(".VPHomeHero .VPButton.brand"),
    );
    if (primaryContrast < 4.5) {
      throw new Error(
        `Primary landing action contrast is ${primaryContrast.toFixed(2)}:1.`,
      );
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(300);
    const darkHeroContrast = await contrastRatio(
      page.locator(".VPHomeHero .name"),
    );
    if (darkHeroContrast < 3) {
      throw new Error(
        `Dark landing name contrast is ${darkHeroContrast.toFixed(2)}:1.`,
      );
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.classList.remove("dark");
    });
    await page.waitForTimeout(300);
    await tabTo(
      page,
      page.getByRole("link", { name: "Skip to content" }),
      "landing skip link",
    );
    await capture(page, "site-landing.png");
    const editorPagePromise = page.context().waitForEvent("page", {
      timeout: 5_000,
    });
    await page.getByRole("link", { name: "Try the editor" }).click();
    const editorPage = await editorPagePromise;
    await editorPage.waitForLoadState("networkidle");
    assertEqual(
      new URL(editorPage.url()).pathname,
      sitePath("/examples/playground/index.html"),
      "activated editor path",
    );
    await assertText(editorPage.locator("h1"), "Component editor");
    await editorPage.close();

    const learnLink = page
      .getByRole("link", {
        name: "Get started",
        exact: true,
      })
      .first();
    await learnLink.waitFor();
    await Promise.all([
      page.waitForURL("**/get-started.html"),
      learnLink.click(),
    ]);
    await page
      .getByRole("heading", {
        name: "Get started",
      })
      .waitFor();
    const integrationDiagram = page.getByRole("img", {
      name: "Choose the toolkit layer that matches your product",
    });
    await integrationDiagram.waitFor();
    const diagramState = await integrationDiagram.evaluate((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      pathname: new URL(image.currentSrc, globalThis.location.href).pathname,
    }));
    assertEqual(diagramState.complete, true, "integration diagram loaded");
    if (diagramState.naturalWidth < 1) {
      throw new Error("Integration diagram has no rendered width.");
    }
    if (
      !diagramState.pathname.startsWith(sitePath("/assets/integration-depths."))
    ) {
      throw new Error(
        `Integration diagram uses an unexpected path: ${diagramState.pathname}.`,
      );
    }
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() =>
      globalThis.document
        .querySelector(
          'img[alt="Choose the toolkit layer that matches your product"]',
        )
        ?.currentSrc.includes("integration-depths-mobile."),
    );
    const mobileDiagramPath = await integrationDiagram.evaluate(
      (image) => new URL(image.currentSrc, globalThis.location.href).pathname,
    );
    if (
      !mobileDiagramPath.startsWith(
        sitePath("/assets/integration-depths-mobile."),
      )
    ) {
      throw new Error(
        `Mobile integration diagram uses an unexpected path: ${mobileDiagramPath}.`,
      );
    }
    if (originalViewport) {
      await page.setViewportSize(originalViewport);
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(300);
    const darkLinkContrast = await contrastRatio(
      page
        .getByRole("link", { name: "component catalog", exact: false })
        .first(),
    );
    if (darkLinkContrast < 4.5) {
      throw new Error(
        `Dark documentation link contrast is ${darkLinkContrast.toFixed(2)}:1.`,
      );
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.classList.remove("dark");
    });
    await Promise.all([
      page.waitForURL("**/learn/01-web-components.html"),
      page
        .getByRole("link", {
          name: "Learn step by step",
          exact: true,
        })
        .click(),
    ]);
    await page
      .getByRole("heading", {
        name: "1. Choose a surface and understand ownership",
      })
      .waitFor();
    await assertVisibleText(
      page.locator(".documentation-disclosure"),
      "Documentation text was written and edited by GitHub Copilot; pending human review.",
    );
    assertEqual(
      new URL(
        await page
          .locator(".VPDocFooter .pager-link.next")
          .getAttribute("href"),
        page.url(),
      ).pathname,
      sitePath("/learn/02-supplied-data.html"),
      "lesson next-page route",
    );
    const coreLessonRoutes = [
      "/learn/01-web-components.html",
      "/learn/02-supplied-data.html",
      "/learn/03-live-data.html",
      "/learn/04-reader.html",
      "/learn/05-customization.html",
      "/learn/06-host-integration.html",
    ];
    for (let index = 0; index < coreLessonRoutes.length; index += 1) {
      await page.goto(siteRouteUrl(coreLessonRoutes[index]), {
        waitUntil: "networkidle",
      });
      if (index > 0) {
        assertEqual(
          new URL(
            await page
              .locator(".VPDocFooter .pager-link.prev")
              .getAttribute("href"),
            page.url(),
          ).pathname,
          sitePath(coreLessonRoutes[index - 1]),
          `lesson ${index + 1} previous-page route`,
        );
      }
      if (index < coreLessonRoutes.length - 1) {
        assertEqual(
          new URL(
            await page
              .locator(".VPDocFooter .pager-link.next")
              .getAttribute("href"),
            page.url(),
          ).pathname,
          sitePath(coreLessonRoutes[index + 1]),
          `lesson ${index + 1} next-page route`,
        );
      }
    }
    await page.goto(siteRouteUrl("/learn/03-live-data.html"), {
      waitUntil: "networkidle",
    });
    await Promise.all([
      page.waitForURL("**/learn/04-reader.html"),
      page.locator(".VPDocFooter .pager-link.next").click(),
    ]);
    await Promise.all([
      page.waitForURL("**/learn/03-live-data.html"),
      page.locator(".VPDocFooter .pager-link.prev").click(),
    ]);
    for (const framework of ["react", "alpine"]) {
      await page.goto(siteRouteUrl(`/learn/${framework}.html`), {
        waitUntil: "networkidle",
      });
      assertEqual(
        new URL(
          await page
            .locator(".VPDocFooter .pager-link.prev")
            .getAttribute("href"),
          page.url(),
        ).pathname,
        sitePath("/learn/03-live-data.html"),
        `${framework} previous-page route`,
      );
      assertEqual(
        new URL(
          await page
            .locator(".VPDocFooter .pager-link.next")
            .getAttribute("href"),
          page.url(),
        ).pathname,
        sitePath("/learn/04-reader.html"),
        `${framework} next-page route`,
      );
    }
    for (const [route, project, title] of [
      [
        "/learn/01-web-components.html",
        "ref-label",
        "Component editor: Edit a supplied-data reference label",
      ],
      [
        "/learn/02-supplied-data.html",
        "source-card",
        "Component editor: Edit the supplied-data source card",
      ],
      [
        "/learn/03-live-data.html",
        "source-card",
        "Component editor: Edit before adding live data",
      ],
      [
        "/learn/04-reader.html",
        "reader",
        "Component editor: Edit the finite supplied-data Reader",
      ],
      [
        "/learn/05-customization.html",
        "source-card",
        "Component editor: Edit source-card presentation",
      ],
    ]) {
      await page.goto(siteRouteUrl(route), { waitUntil: "networkidle" });
      const embedUrl = new URL(
        await page.locator(`iframe[title="${title}"]`).getAttribute("src"),
        page.url(),
      );
      assertEqual(
        embedUrl.pathname,
        sitePath("/examples/playground/index.html"),
        `${route} inline editor path`,
      );
      assertEqual(
        embedUrl.searchParams.get("project"),
        project,
        `${route} inline editor project`,
      );
    }
    await qualifyInlinePlayground(page, {
      route: "/learn/02-supplied-data.html",
      project: "source-card",
      title: "Component editor: Edit the supplied-data source card",
      sitePath,
      textRequests,
    });
    await qualifyCatalogPlayground(page, sitePath, textRequests);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(siteRouteUrl("/learn/03-live-data.html"), {
      waitUntil: "networkidle",
    });
    await Promise.all([
      page.waitForURL("**/learn/04-reader.html"),
      page.locator(".VPDocFooter .pager-link.next").click(),
    ]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(siteRouteUrl("/learn/01-web-components.html"), {
      waitUntil: "networkidle",
    });
    const refLabelEditor = page.frameLocator(
      'iframe[title="Component editor: Edit a supplied-data reference label"]',
    );
    await refLabelEditor
      .getByText("Preview rendered with supplied data.")
      .waitFor({ timeout: 30_000 });
    for (const name of [
      "Package setup",
      "View active source",
      "Open the separate live demo",
    ]) {
      assertEqual(
        await refLabelEditor.getByRole("link", { name }).getAttribute("target"),
        "_blank",
        `${name} embedded editor target`,
      );
    }
    assertEqual(
      await refLabelEditor
        .getByRole("link", { name: "Package setup" })
        .getAttribute("href"),
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md#build-and-pack-the-private-libraries",
      "embedded editor package setup",
    );
    const refLabelSource = await refLabelEditor
      .getByRole("link", { name: "View active source" })
      .getAttribute("href");
    if (
      refLabelSource !==
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/playground/projects/ref-label/index.html"
    ) {
      throw new Error(`Unexpected reference-label source: ${refLabelSource}`);
    }
    assertEqual(textRequests.length, 0, "reference-label lesson request count");

    for (const [name, route, action] of [
      [
        "text-segment",
        "/examples/explorer/text-segment.html",
        "Start live demo",
      ],
      [
        "bilingual-segment",
        "/examples/explorer/bilingual-segment.html",
        "Start live demo",
      ],
      [
        "reference-label",
        "/examples/explorer/ref-label.html",
        "Start live demo",
      ],
      ["source-card", "/examples/explorer/source-card.html", "Start live demo"],
      ["connections", "/examples/explorer/connections.html", "Start live demo"],
      [
        "controlled Reader",
        "/examples/reader/controlled.html?tref=Micah%206%3A8",
        "Start live demo",
      ],
      [
        "spatial Reader",
        "/examples/reader/index.html?tref=Micah%206%3A8",
        "Start live demo",
      ],
    ]) {
      textRequests.length = 0;
      await page.goto(siteRouteUrl(route), { waitUntil: "networkidle" });
      await page.getByRole("button", { name: action }).waitFor();
      await assertText(page.locator("body"), "has been loaded yet.");
      assertEqual(textRequests.length, 0, `${name} idle request count`);
    }

    const liveLessons = {
      "03-live-data": [["vanilla host", "/examples/vanilla/index.html"]],
      "04-reader": [
        ["standalone Reader", "/examples/reader/controlled.html"],
        ["spatial Reader", "/examples/reader/index.html"],
      ],
    };
    for (const [lesson, links] of Object.entries(liveLessons)) {
      textRequests.length = 0;
      await page.goto(siteRouteUrl(`/learn/${lesson}.html`), {
        waitUntil: "networkidle",
      });
      assertEqual(
        textRequests.length,
        0,
        `${lesson} unsolicited request count`,
      );
      await assertText(
        page.locator("body"),
        lesson === "03-live-data" ? "explicit user action" : "Start live demo",
      );
      for (const [name, expectedPath] of links) {
        const link = page.getByRole("link", { name, exact: true }).first();
        const href = await link.getAttribute("href");
        assertEqual(
          new URL(href, page.url()).pathname,
          sitePath(expectedPath),
          `${name} route`,
        );
        assertEqual(
          await link.getAttribute("target"),
          expectedPath.includes("/index.html") ? "_blank" : "_self",
          `${name} target`,
        );
      }
      if (lesson === "03-live-data") {
        await page.goto(siteRouteUrl(links[0][1]), {
          waitUntil: "networkidle",
        });
        await page.locator("#load-live").click();
        await page.waitForFunction(
          () =>
            globalThis.document
              .querySelector("#status")
              ?.textContent?.includes(
                "Committed canonical reference Micah 6:8",
              ) === true,
        );
        assertEqual(
          textRequests.length,
          1,
          "source-card explicit request count",
        );
      }
    }

    await page.goto(siteRouteUrl("/examples.html"), {
      waitUntil: "networkidle",
    });
    const catalogLinks = [
      [
        "Supplied-data component editor",
        "/examples/playground/index.html",
        "Edit and run any of seven projects",
        "source-card",
      ],
      [
        "Authored component states",
        "/examples/explorer/authored.html",
        "Open preview",
      ],
      [
        "Live component explorer",
        "/examples/explorer/index.html",
        "Open preview",
      ],
      [
        "Controlled and spatial Reader",
        "/examples/reader/controlled.html",
        "Open preview",
      ],
      [
        "Vanilla supplied-data consumer",
        "/examples/vanilla/index.html",
        "Open preview",
      ],
      ["React consumer", "/examples/react/index.html", "Open preview"],
      ["Alpine consumer", "/examples/alpine/index.html", "Open preview"],
      [
        "Authored linked article",
        "/examples/linked-article/index.html",
        "Open preview",
      ],
      ["Live MCP App host", "/examples/mcp-app/live.html", "Open preview"],
    ];
    for (const [exampleName, expectedPath, linkName, project] of catalogLinks) {
      const row = page.getByRole("row").filter({ hasText: exampleName });
      const link = row.getByRole("link", { name: linkName });
      const linkUrl = new URL(await link.getAttribute("href"), page.url());
      assertEqual(
        linkUrl.pathname,
        sitePath(expectedPath),
        `${exampleName} catalog route`,
      );
      if (project) {
        assertEqual(
          linkUrl.searchParams.get("project"),
          project,
          `${exampleName} catalog project`,
        );
      }
      assertEqual(
        await link.getAttribute("target"),
        expectedPath.includes("/index.html") ? "_blank" : "_self",
        `${exampleName} catalog target`,
      );
    }
    await page.goto(siteRouteUrl("/examples/explorer/index.html"), {
      waitUntil: "networkidle",
    });
    for (const [name, expectedPath] of [
      ["Prebuilt Reader", "/examples/reader/controlled.html"],
      ["Custom spatial Reader", "/examples/reader/"],
      ["Authored linked article", "/examples/linked-article/"],
    ]) {
      assertEqual(
        new URL(
          await page.getByRole("link", { name }).getAttribute("href"),
          origin,
        ).pathname,
        sitePath(expectedPath),
        `${name} route`,
      );
    }

    await page.goto(siteRouteUrl("/examples.html"), {
      waitUntil: "networkidle",
    });
    const sourceHref = await page
      .getByRole("link", { name: "examples/react-vite" })
      .getAttribute("href");
    if (
      sourceHref !==
      "https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite"
    ) {
      throw new Error(`Unexpected React source link: ${sourceHref}`);
    }

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/learn/react.html"), {
      waitUntil: "networkidle",
    });
    const reactLesson = page.frameLocator(
      'iframe[title="React custom-element integration"]',
    );
    await reactLesson.locator("sefaria-source-card").waitFor();
    await assertText(
      reactLesson.locator("#selected-ref"),
      "Select the rendered segment",
    );
    assertEqual(textRequests.length, 0, "embedded React initial request count");
    await capture(page, "site-react-lesson.png");

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/examples/vanilla/index.html"), {
      waitUntil: "networkidle",
    });
    await assertText(
      page.locator("#status"),
      "Supplied Micah 6:8 data rendered with zero live loads.",
    );
    assertEqual(
      await page.locator("#status").getAttribute("data-request-count"),
      "0",
      "vanilla supplied-data host request count",
    );
    assertEqual(textRequests.length, 0, "vanilla supplied-data request count");
    await page.locator("#load-live").click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#status")
          ?.textContent?.includes("Committed canonical reference Micah 6:8") ===
        true,
    );
    await assertText(
      page.locator("#status"),
      "Committed canonical reference Micah 6:8.",
    );
    assertEqual(textRequests.length, 1, "vanilla live-client network count");

    await page.goto(siteRouteUrl("/examples/react/index.html"), {
      waitUntil: "networkidle",
    });
    textRequests.length = 0;
    await assertText(page.locator("#request-count"), "Live load attempts: 0");
    const preview = page.locator("#preview");
    const initialCard = page.locator("sefaria-source-card");
    const initialHandle = await initialCard.elementHandle();
    await page.locator("#theme-toggle").click();
    assertEqual(
      await preview.getAttribute("data-theme"),
      "dark",
      "React theme",
    );
    await page.locator("#preview-width").fill("480");
    await page.locator("#vocalization-mode").selectOption("none");
    assertEqual(
      await preview.evaluate((element) => element.style.maxWidth),
      "480px",
      "React preview width",
    );
    await page.locator('input[name="tref"]').fill("micah 6:8");
    await page.locator("#load-live").click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#request-status")
          ?.textContent?.includes(
            "Committed canonical reference Micah 6:8.",
          ) === true,
    );
    await assertText(page.locator("#request-count"), "Live load attempts: 1");
    await assertText(
      page.locator("#request-status"),
      "Committed canonical reference Micah 6:8.",
    );
    assertEqual(textRequests.length, 1, "React explicit request count");
    const nextHandle = await initialCard.elementHandle();
    assertEqual(
      await initialHandle.evaluate(
        (element, next) => element === next,
        nextHandle,
      ),
      true,
      "React element identity",
    );
    await initialCard
      .getByRole("button", {
        name: "Show connections for Micah 6:8",
      })
      .first()
      .click();
    await page
      .locator("#selected-ref")
      .filter({ hasText: "React received selection: Micah 6:8." })
      .waitFor();
    await capture(page, "site-react.png");

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/learn/alpine.html"), {
      waitUntil: "networkidle",
    });
    const alpineLesson = page.frameLocator(
      'iframe[title="Alpine custom-element integration"]',
    );
    await alpineLesson.locator("sefaria-source-card").waitFor();
    await assertText(
      alpineLesson.locator("#selected-ref"),
      "Select the rendered segment",
    );
    assertEqual(
      textRequests.length,
      0,
      "embedded Alpine initial request count",
    );
    await capture(page, "site-alpine-lesson.png");

    await page.goto(siteRouteUrl("/examples/alpine/index.html"), {
      waitUntil: "networkidle",
    });
    textRequests.length = 0;
    await assertText(page.locator("#request-count"), "Live load attempts: 0");
    const alpineCard = page.locator("sefaria-source-card");
    const alpineHandle = await alpineCard.elementHandle();
    await page.locator("#layout").selectOption("stacked");
    await page.locator("#side-order").selectOption("translation-first");
    await page.locator("#vocalization-mode").selectOption("none");
    assertEqual(textRequests.length, 0, "Alpine display-only request count");
    await page.locator('input[name="tref"]').fill("micah 6:8");
    await page.locator("#load-live").click();
    await page
      .locator("#request-status")
      .filter({ hasText: "Committed canonical reference Micah 6:8." })
      .waitFor({ timeout: 5_000 });
    await page
      .locator("#request-count")
      .filter({ hasText: "Live load attempts: 1" })
      .waitFor({ timeout: 5_000 });
    await page
      .locator("#committed-ref")
      .filter({ hasText: "Current committed reference: Micah 6:8." })
      .waitFor({ timeout: 5_000 });
    await assertText(
      page.locator("#request-status"),
      "Committed canonical reference Micah 6:8.",
    );
    assertEqual(textRequests.length, 1, "Alpine explicit request count");
    const nextAlpineHandle = await alpineCard.elementHandle();
    assertEqual(
      await alpineHandle.evaluate(
        (element, next) => element === next,
        nextAlpineHandle,
      ),
      true,
      "Alpine element identity",
    );
    await alpineCard
      .getByRole("button", {
        name: "Show connections for Micah 6:8",
      })
      .first()
      .click();
    await page
      .locator("#selected-ref")
      .filter({ hasText: "Alpine received selection: Micah 6:8." })
      .waitFor();
    await capture(page, "site-alpine.png");

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/examples/reader/controlled.html"), {
      waitUntil: "networkidle",
    });
    await page.locator("sefaria-reader").waitFor();
    await assertText(page.locator("#status"), "has been loaded yet.");
    assertEqual(textRequests.length, 0, "controlled Reader idle request count");
    await tabTo(
      page,
      page.getByRole("button", { name: "Start live demo" }),
      "Reader start action",
      10,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => {
      const status = globalThis.document.querySelector("#status")?.textContent;
      return status !== undefined && !status.startsWith("Opening ");
    });
    const readerStatus = await page.locator("#status").textContent();
    if (!readerStatus?.startsWith("Showing ")) {
      throw new Error(
        `Controlled Reader did not load: ${readerStatus}; ${await page.locator("#host-error").textContent()}; fixtures: ${JSON.stringify(textRequests)}; denied: ${JSON.stringify(unexpectedRequests)}`,
      );
    }
    const sourceSelection = page
      .getByRole("button", { name: "Show connections for Micah 6:8" })
      .first();
    if ((await sourceSelection.count()) === 0) {
      const names = await page.getByRole("button").allTextContents();
      throw new Error(
        `Controlled Reader source action is missing; buttons: ${JSON.stringify(names)}`,
      );
    }
    await sourceSelection.click();
    await page
      .getByRole("button", { name: /Commentary/u })
      .first()
      .click();
    await page
      .getByRole("button", {
        name: "Open Rashi on Micah 6:8:1 in context",
      })
      .click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#status")
          ?.textContent?.startsWith("Showing Rashi") === true,
    );
    const rootBreadcrumb = page
      .getByRole("navigation", { name: "Reader history" })
      .getByRole("button", { name: "Micah 6", exact: true });
    await rootBreadcrumb.waitFor();
    assertEqual(textRequests.length, 5, "Reader navigation request count");
    const beforePaneSwitch = textRequests.length;
    await page.setViewportSize({ width: 600, height: 900 });
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    assertEqual(
      textRequests.length,
      beforePaneSwitch,
      "Reader display-only request count",
    );
    await rootBreadcrumb.click();
    await assertText(page.locator("#status"), "Showing Micah 6.");
    assertEqual(textRequests.length, 5, "Reader breadcrumb request count");
    await capture(page, "site-reader.png");

    textRequests.length = 0;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(siteRouteUrl("/examples/linked-article/"), {
      waitUntil: "networkidle",
    });
    const citation = page.getByRole("link", { name: "Micah 6:8", exact: true });
    await tabTo(page, citation, "linked-article citation", 10);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Close source preview" }).waitFor();
    assertEqual(textRequests.length, 1, "linked popup request count");
    await capture(page, "site-linked-popup.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(siteRouteUrl("/components.html"), {
      waitUntil: "networkidle",
    });
    await assertText(
      page.locator("body"),
      "Choose the smallest component that completes the task.",
    );
    const widths = await page.evaluate(() => ({
      viewport: globalThis.document.documentElement.clientWidth,
      content: globalThis.document.documentElement.scrollWidth,
    }));
    if (widths.content > widths.viewport + 1) {
      throw new Error(
        `Mobile documentation overflows horizontally: ${JSON.stringify(widths)}`,
      );
    }
    const mobileEditor = page.locator(
      'iframe[title="Component editor: Editable component catalog"]',
    );
    const mobileEditorBounds = await mobileEditor.boundingBox();
    if (
      !mobileEditorBounds ||
      mobileEditorBounds.width > 390 ||
      mobileEditorBounds.height < 600
    ) {
      throw new Error(
        `Mobile inline editor geometry is invalid: ${JSON.stringify(mobileEditorBounds)}.`,
      );
    }
    const mobileEditorWidths = await page
      .frameLocator(
        'iframe[title="Component editor: Editable component catalog"]',
      )
      .locator("html")
      .evaluate(() => ({
        viewport: globalThis.document.documentElement.clientWidth,
        content: globalThis.document.documentElement.scrollWidth,
      }));
    if (mobileEditorWidths.content > mobileEditorWidths.viewport + 1) {
      throw new Error(
        `Mobile inline editor overflows horizontally: ${JSON.stringify(mobileEditorWidths)}.`,
      );
    }
    await page.locator(".VPNavBarHamburger").click();
    await page
      .locator(".VPNavScreen")
      .getByRole("link", { name: "Components", exact: true })
      .waitFor();
    await tabTo(
      page,
      page.getByRole("link", { name: "Open supplied-data preview" }),
      "mobile component preview link",
      60,
    );
    await capture(page, "site-mobile.png");

    for (const width of [660, 720, 767, 768, 960, 1024]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto(siteRouteUrl("/"), {
        waitUntil: "networkidle",
      });
      const compactHeroActions = await page
        .locator(".VPHomeHero .action")
        .evaluateAll((actions) =>
          actions.map((action) => {
            const actionBounds = action.getBoundingClientRect();
            const button = action.querySelector("a");
            const text = button?.firstChild;
            const buttonBounds = button?.getBoundingClientRect();
            const textRange = globalThis.document.createRange();
            if (text) {
              textRange.selectNodeContents(text);
            }

            const textBounds = text ? textRange.getBoundingClientRect() : null;
            return {
              action: {
                y: actionBounds.y,
                width: actionBounds.width,
              },
              button: buttonBounds
                ? { left: buttonBounds.left, right: buttonBounds.right }
                : null,
              text: textBounds
                ? { left: textBounds.left, right: textBounds.right }
                : null,
            };
          }),
        );
      if (
        compactHeroActions.length !== 3 ||
        new Set(compactHeroActions.map(({ action }) => Math.round(action.y)))
          .size !== (width <= 767 ? 3 : 1) ||
        compactHeroActions.some(
          ({ button, text }) =>
            !button ||
            !text ||
            text.left < button.left ||
            text.right > button.right,
        )
      ) {
        throw new Error(
          `Hero actions overflow or wrap at ${width}px: ${JSON.stringify(compactHeroActions)}`,
        );
      }
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(siteRouteUrl("/components.html"), {
      waitUntil: "networkidle",
    });
    const compactDesktopWidths = await page.evaluate(() => ({
      viewport: globalThis.document.documentElement.clientWidth,
      content: globalThis.document.documentElement.scrollWidth,
    }));
    if (compactDesktopWidths.content > compactDesktopWidths.viewport + 1) {
      throw new Error(
        `Compact desktop navigation overflows horizontally: ${JSON.stringify(compactDesktopWidths)}`,
      );
    }
    await page.getByRole("button", { name: "Search" }).waitFor();
    await page.getByRole("link", { name: "Reference", exact: true }).waitFor();

    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto(siteRouteUrl("/"), { waitUntil: "networkidle" });
    const zoomWidths = await page.evaluate(() => ({
      viewport: globalThis.document.documentElement.clientWidth,
      content: globalThis.document.documentElement.scrollWidth,
    }));
    if (zoomWidths.content > zoomWidths.viewport + 1) {
      throw new Error(
        `Documentation overflows at the 640px CSS viewport equivalent to 200% zoom on a 1280px display: ${JSON.stringify(zoomWidths)}`,
      );
    }
    await page
      .frameLocator('iframe[title="Interactive supplied-data source card"]')
      .locator("sefaria-source-card")
      .waitFor();
    await capture(page, "site-200-percent-zoom.png");

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/examples/mcp-app/"), {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Start live demo" }).waitFor();
    await assertText(page.locator("#status"), "has not started");
    assertEqual(textRequests.length, 0, "bare MCP route idle request count");

    textRequests.length = 0;
    await page.goto(siteRouteUrl("/examples/mcp-app/live.html"), {
      waitUntil: "networkidle",
    });
    await assertText(page.locator("#status"), "has not started");
    assertEqual(textRequests.length, 0, "live MCP idle request count");
    await page.getByRole("button", { name: "Start live demo" }).click();
    await page
      .locator("#status")
      .filter({ hasText: "Live MCP demo started" })
      .waitFor();
    await page
      .frameLocator("#sandbox")
      .locator("iframe")
      .contentFrame()
      .locator("sefaria-reader")
      .waitFor();
    assertEqual(textRequests.length, 2, "live MCP initial request count");
    await capture(page, "site-mcp-live.png");
    assertEqual(
      unexpectedRequests.length,
      0,
      `unapproved outbound requests: ${unexpectedRequests.join(", ")}`,
    );
    assertEqual(
      browserErrors.length,
      0,
      `browser runtime errors: ${browserErrors.join(", ")}`,
    );

    const noScriptContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    try {
      const noScriptPage = await noScriptContext.newPage();
      await noScriptPage.goto(siteUrl, { waitUntil: "load" });
      await noScriptPage
        .locator(
          'img[alt="Preview of a bilingual Micah 6:8 source card with edition attribution"]',
        )
        .waitFor();
      await assertText(
        noScriptPage.locator(".landing-preview__noscript"),
        "Enable JavaScript to use the interactive source card.",
      );
      assertEqual(
        await noScriptPage
          .locator('iframe[title="Interactive supplied-data source card"]')
          .evaluate((element) => globalThis.getComputedStyle(element).display),
        "none",
        "no-script iframe visibility",
      );
      await capture(noScriptPage, "site-noscript-mobile.png");
    } finally {
      await noScriptContext.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await previewServer.close();
}

async function qualifyInlinePlayground(
  page,
  { route, project, title, sitePath, textRequests },
) {
  textRequests.length = 0;
  await page.goto(siteRouteUrl(route), { waitUntil: "networkidle" });
  const frameElement = page.locator(`iframe[title="${title}"]`);
  await frameElement.waitFor();
  const frameUrl = new URL(await frameElement.getAttribute("src"), page.url());
  assertEqual(
    frameUrl.pathname,
    sitePath("/examples/playground/index.html"),
    `${project} inline editor path`,
  );
  assertEqual(
    frameUrl.searchParams.get("project"),
    project,
    `${project} inline editor selection`,
  );
  const fullEditor = page.getByRole("link", { name: "Open full editor" });
  const fullEditorUrl = new URL(
    await fullEditor.getAttribute("href"),
    page.url(),
  );
  assertEqual(
    fullEditorUrl.pathname,
    sitePath("/examples/playground/index.html"),
    `${project} full editor path`,
  );
  assertEqual(
    fullEditorUrl.searchParams.get("project"),
    project,
    `${project} full editor selection`,
  );
  assertEqual(
    await fullEditor.getAttribute("target"),
    "_blank",
    `${project} full editor target`,
  );

  const editor = page.frameLocator(`iframe[title="${title}"]`);
  await editor
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  const parentState = await page.evaluate(() => {
    globalThis.localStorage.setItem("site-embed-proof", "unchanged");
    return {
      url: globalThis.location.href,
      childCount: globalThis.document.body.childElementCount,
      marker: globalThis.document.body.dataset.previewMutation ?? null,
    };
  });
  const editorState = await editor.locator("body").evaluate(() => {
    globalThis.localStorage.setItem("site-embed-proof", "unchanged");
    return {
      url: globalThis.location.href,
      childCount: globalThis.document.body.childElementCount,
      marker: globalThis.document.body.dataset.previewMutation ?? null,
    };
  });
  const edits = [
    {
      tab: "HTML",
      suffix: '\n<p id="docs-html-proof">HTML changed in the lesson.</p>',
      prove: () =>
        editor
          .locator("#preview iframe")
          .contentFrame()
          .getByText("HTML changed in the lesson.")
          .waitFor(),
    },
    {
      tab: "CSS",
      suffix: "\n#docs-html-proof { color: rgb(97, 40, 84); }",
      prove: async () => {
        const color = await editor
          .locator("#preview iframe")
          .contentFrame()
          .locator("#docs-html-proof")
          .evaluate((element) => globalThis.getComputedStyle(element).color);
        assertEqual(color, "rgb(97, 40, 84)", "inline CSS edit");
      },
    },
    {
      tab: "JavaScript",
      suffix:
        '\nconst proof = document.createElement("p"); proof.textContent = "JavaScript changed in the lesson."; document.body.append(proof); try { parent.document.body.dataset.previewMutation = "bad"; } catch {} try { parent.localStorage.setItem("site-embed-proof", "bad"); } catch {} try { parent.history.pushState(null, "", "/bad-editor-route"); } catch {} try { top.document.body.dataset.previewMutation = "bad"; } catch {} try { top.localStorage.setItem("site-embed-proof", "bad"); } catch {} try { top.history.pushState(null, "", "/bad-docs-route"); } catch {}',
      prove: () =>
        editor
          .locator("#preview iframe")
          .contentFrame()
          .getByText("JavaScript changed in the lesson.")
          .waitFor(),
    },
  ];
  for (const edit of edits) {
    await editor.getByRole("tab", { name: edit.tab }).click();
    const code = editor.locator(".cm-content");
    await code.fill(`${await code.textContent()}${edit.suffix}`);
    await editor.getByRole("button", { name: "Run" }).click();
    await edit.prove();
  }
  assertEqual(textRequests.length, 0, `${project} inline editor requests`);
  const nextParentState = await page.evaluate(() => ({
    url: globalThis.location.href,
    childCount: globalThis.document.body.childElementCount,
    marker: globalThis.document.body.dataset.previewMutation ?? null,
    storage: globalThis.localStorage.getItem("site-embed-proof"),
  }));
  assertEqual(nextParentState.url, parentState.url, "parent history isolation");
  assertEqual(
    nextParentState.childCount,
    parentState.childCount,
    "parent DOM isolation",
  );
  assertEqual(nextParentState.marker, null, "parent marker isolation");
  assertEqual(nextParentState.storage, "unchanged", "parent storage isolation");
  const nextEditorState = await editor.locator("body").evaluate(() => ({
    url: globalThis.location.href,
    childCount: globalThis.document.body.childElementCount,
    marker: globalThis.document.body.dataset.previewMutation ?? null,
    storage: globalThis.localStorage.getItem("site-embed-proof"),
  }));
  assertEqual(
    nextEditorState.url,
    editorState.url,
    "trusted editor history isolation",
  );
  assertEqual(
    nextEditorState.childCount,
    editorState.childCount,
    "trusted editor DOM isolation",
  );
  assertEqual(nextEditorState.marker, null, "trusted editor marker isolation");
  assertEqual(
    nextEditorState.storage,
    "unchanged",
    "trusted editor storage isolation",
  );
  await capture(page, "site-inline-editor.png");
  await fullEditor.focus();
  await page.keyboard.press("Tab");
  assertEqual(
    await page.evaluate(() => globalThis.document.activeElement?.tagName),
    "IFRAME",
    "keyboard enters trusted editor",
  );
  await page.keyboard.press("Shift+Tab");
  assertEqual(
    await fullEditor.evaluate((element) => element.matches(":focus")),
    true,
    "keyboard returns to documentation",
  );
}

async function qualifyCatalogPlayground(page, sitePath, textRequests) {
  textRequests.length = 0;
  await page.goto(siteRouteUrl("/components.html"), {
    waitUntil: "networkidle",
  });
  const editor = page.frameLocator(
    'iframe[title="Component editor: Editable component catalog"]',
  );
  await page
    .getByRole("heading", { name: "Editable component catalog", level: 2 })
    .waitFor();
  await editor
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  const projects = [
    "ref-label",
    "text-segment",
    "bilingual-segment",
    "source-card",
    "popup",
    "connections-panel",
    "reader",
  ];
  for (const project of projects) {
    await editor.locator("#project-select").selectOption(project);
    await editor
      .getByText("Preview rendered with supplied data.")
      .waitFor({ timeout: 30_000 });
  }
  assertEqual(
    await editor.locator("#preview iframe").count(),
    1,
    "catalog active preview count",
  );
  assertEqual(textRequests.length, 0, "catalog inline editor requests");
  const fullEditorUrl = new URL(
    await page
      .getByRole("link", { name: "Open full editor" })
      .getAttribute("href"),
    page.url(),
  );
  assertEqual(
    fullEditorUrl.pathname,
    sitePath("/examples/playground/index.html"),
    "catalog full editor route",
  );
  assertEqual(
    fullEditorUrl.searchParams.get("project"),
    "source-card",
    "catalog initial editor selection",
  );
  await capture(page, "site-component-catalog.png");
}

async function assertText(locator, expected) {
  const text = await locator.textContent();
  if (!text?.includes(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} in ${JSON.stringify(text)}.`,
    );
  }
}

async function assertNotPresent(locator, unexpected) {
  const text = await locator.textContent();
  if (text?.includes(unexpected)) {
    throw new Error(
      `Did not expect ${JSON.stringify(unexpected)} in ${JSON.stringify(text)}.`,
    );
  }
}

async function assertFileMissing(file, label) {
  try {
    await access(file);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`${label}: expected no emitted file.`);
}

async function assertVisibleText(locator, expected) {
  await assertText(locator, expected);
  if (!(await locator.isVisible())) {
    throw new Error(`Expected visible text ${JSON.stringify(expected)}.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

async function capture(page, filename) {
  if (!screenshotDirectory) return;
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, filename),
    fullPage: true,
  });
}

async function contrastRatio(locator) {
  return locator.evaluate((element) => {
    const luminance = (value) => {
      const channels =
        value
          .match(/\d+(?:\.\d+)?/gu)
          ?.slice(0, 3)
          .map(Number)
          .map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          }) ?? [];
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const style = globalThis.getComputedStyle(element);
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
}

async function tabTo(page, locator, label, maximumTabs = 15) {
  await locator.waitFor();
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element.matches(":focus"))) {
      return;
    }
  }
  throw new Error(`Keyboard navigation did not reach ${label}.`);
}

function createFixtureResponse(requestUrl, policy, textFixture, linksFixture) {
  const url = new URL(requestUrl);
  const reference = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  if (policy === "text-fixture") {
    if (reference === "Micah 6:8" || reference === "micah 6:8") {
      return textFixture;
    }
    const target = globalThis.structuredClone(textFixture);
    const rashi = reference.startsWith("Rashi");
    const section =
      reference === "Micah 6" || reference === "Rashi on Micah 6:8";
    const sections = rashi
      ? section
        ? ["6", "8"]
        : ["6", "8", "1"]
      : section
        ? ["6"]
        : ["6", "8"];
    Object.assign(target, {
      ref: reference,
      heRef: reference,
      sectionRef: reference,
      heSectionRef: reference,
      book: rashi ? "Rashi on Micah" : "Micah",
      indexTitle: rashi ? "Rashi on Micah" : "Micah",
      heIndexTitle: rashi ? "Rashi on Micah" : "Micah",
      title: reference,
      sections,
      toSections: sections,
      sectionNames: rashi
        ? ["Chapter", "Verse", "Comment"]
        : ["Chapter", "Verse"],
      addressTypes: rashi
        ? ["Integer", "Integer", "Integer"]
        : ["Integer", "Integer"],
      textDepth: rashi ? 3 : 2,
      versions: target.versions.map((version) => ({
        ...version,
        text: section
          ? Array.from({ length: rashi ? 1 : 16 }, (_, index) =>
              rashi
                ? `Fixture text for Rashi on Micah 6:8:${index + 1}`
                : `Fixture text for Micah 6:${index + 1}`,
            )
          : `Fixture text for ${reference}`,
      })),
    });
    return target;
  }
  if (reference !== "Micah 6:8") return [];
  const base = globalThis.structuredClone(
    linksFixture.find((entry) => entry && !("isSheet" in entry)),
  );
  if (!base) throw new Error("Connections fixture has no text entry.");
  Object.assign(base, {
    _id: "site-reader-rashi",
    anchorRef: reference,
    anchorRefExpanded: [reference],
    sourceRef: "Rashi on Micah 6:8:1",
    ref: "Rashi on Micah 6:8:1",
    sourceHeRef: "Rashi on Micah 6:8:1",
    category: "Commentary",
    index_title: "Rashi on Micah",
  });
  return [base];
}
