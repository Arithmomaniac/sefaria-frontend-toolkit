import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

import { readSiteBasePath } from "./build-site-plan.mjs";
import { createFixtureResponse } from "./site-fixtures.mjs";
import { startSitePreview } from "./site-preview-server.mjs";

const root = path.resolve(import.meta.dirname, "..");
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
    // Real response captured by scripts/capture-site-fixture.mjs.
    const { payload: fixture } = JSON.parse(
      await readFile(
        path.join(root, "tests", "site-fixtures", "micah-6-8-2026-09-28.json"),
        "utf8",
      ),
    );
    const snippet = await readFile(
      path.join(
        root,
        "examples",
        "site-snippets",
        "source-card-script-tag.html",
      ),
      "utf8",
    );
    const localScript = await readFile(
      path.join(root, "dist", "site", "cdn", "local", "sefaria-elements.js"),
      "utf8",
    );

    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await routeToolkitRequests(page, { fixture, localScript });
    const failedSiteRequests = [];
    page.on("response", (response) => {
      if (response.url().startsWith(origin) && response.status() >= 400) {
        failedSiteRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(siteUrl, { waitUntil: "networkidle" });
    await assertText(page.locator("h1"), "Sefaria Frontend Toolkit");
    await assertText(
      page.locator("body"),
      "Bring Sefaria's texts into your product at the level you need",
    );
    await assertEqual(
      (await page.locator("#hero-example-title").textContent())?.trim(),
      "Micah 6:8, loaded live from Sefaria",
      "hero example heading",
    );
    const primary = page.getByRole("link", {
      name: "Use components › Start here",
    });
    const secondary = page.getByRole("link", {
      name: "Try without installing",
    });
    await assertEqual(await primary.count(), 1, "primary action count");
    await assertEqual(await secondary.count(), 1, "secondary action count");
    for (const [label, action] of [
      ["primary", primary],
      ["secondary", secondary],
    ]) {
      const box = await action.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          height: element.getBoundingClientRect().height,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          whiteSpace: style.whiteSpace,
        };
      });
      await assertEqual(box.paddingLeft, "20px", `${label} left padding`);
      await assertEqual(box.paddingRight, "20px", `${label} right padding`);
      if (box.height > 44) {
        throw new Error(`${label} action wraps: height ${box.height}px.`);
      }
    }
    await assertStatusNotes(page, "Home");
    await assertText(
      page.locator(".home-acknowledgement"),
      "This project began at the Microsoft Global Hackathon 2026.",
    );
    const heroBottom = await page
      .locator(".VPHomeHero")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const proofTop = await page
      .locator(".hero-example")
      .evaluate((element) => element.getBoundingClientRect().top);
    const featuresTop = await page
      .locator(".VPHomeFeatures")
      .evaluate((element) => element.getBoundingClientRect().top);
    if (!(proofTop >= heroBottom && proofTop < featuresTop)) {
      throw new Error("The live proof must sit directly under the hero.");
    }
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme });
      await page.evaluate((scheme) => {
        globalThis.document.documentElement.classList.toggle(
          "dark",
          scheme === "dark",
        );
      }, colorScheme);
      const ratio = await page.locator(".VPHomeHero .name").evaluate((name) => {
        const parse = (value) =>
          value
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number);
        const luminance = ([r, g, b]) => {
          const channel = (value) => {
            const c = value / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          return (
            0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
          );
        };
        const style = globalThis.getComputedStyle(name);
        const fill = parse(style.webkitTextFillColor);
        const card = parse(
          globalThis.getComputedStyle(name.closest(".container"))
            .backgroundColor,
        );
        // The card's radial highlight adds up to 8% white.
        const background = card.map((value) => value + (255 - value) * 0.08);
        const [light, dark] = [luminance(fill), luminance(background)].sort(
          (a, b) => b - a,
        );
        return (light + 0.05) / (dark + 0.05);
      });
      if (ratio < 4.5) {
        throw new Error(
          `Hero eyebrow contrast in ${colorScheme} mode is ${ratio.toFixed(2)}:1.`,
        );
      }
      const acknowledgementRatio = await page
        .locator(".home-acknowledgement")
        .evaluate((element) => {
          const parse = (value) => value.match(/[\d.]+/g).map(Number);
          const luminance = ([r, g, b]) => {
            const channel = (value) => {
              const c = value / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return (
              0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
            );
          };
          let node = element;
          let background = [255, 255, 255];
          while (node) {
            const color = parse(
              globalThis.getComputedStyle(node).backgroundColor,
            );
            if (color.length < 4 || color[3] > 0) {
              background = color.slice(0, 3);
              break;
            }
            node = node.parentElement;
          }
          const [r, g, b, a = 1] = parse(
            globalThis.getComputedStyle(element).color,
          );
          const text = [r, g, b].map(
            (value, index) => value * a + background[index] * (1 - a),
          );
          const [light, dark] = [luminance(text), luminance(background)].sort(
            (x, y) => y - x,
          );
          return (light + 0.05) / (dark + 0.05);
        });
      if (acknowledgementRatio < 4.5) {
        throw new Error(
          `Acknowledgement contrast in ${colorScheme} mode is ${acknowledgementRatio.toFixed(2)}:1.`,
        );
      }
      const learnMore = page.locator("p.learn-more");
      if ((await learnMore.count()) < 3) {
        throw new Error("Home's short answers must use p.learn-more.");
      }
      const learnMoreRatios = await learnMore.evaluateAll((elements) =>
        elements.flatMap((element) => {
          const parse = (value) => value.match(/[\d.]+/g).map(Number);
          const luminance = ([r, g, b]) => {
            const channel = (value) => {
              const c = value / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return (
              0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
            );
          };
          let node = element;
          let background = [255, 255, 255];
          while (node) {
            const color = parse(
              globalThis.getComputedStyle(node).backgroundColor,
            );
            if (color.length < 4 || color[3] > 0) {
              background = color.slice(0, 3);
              break;
            }
            node = node.parentElement;
          }
          return [element, ...element.querySelectorAll("a")].map((target) => {
            const [r, g, b, a = 1] = parse(
              globalThis.getComputedStyle(target).color,
            );
            const text = [r, g, b].map(
              (value, index) => value * a + background[index] * (1 - a),
            );
            const [light, dark] = [luminance(text), luminance(background)].sort(
              (x, y) => y - x,
            );
            return (light + 0.05) / (dark + 0.05);
          });
        }),
      );
      const lowest = Math.min(...learnMoreRatios);
      if (lowest < 4.5) {
        throw new Error(
          `Learn more contrast in ${colorScheme} mode is ${lowest.toFixed(2)}:1.`,
        );
      }
    }
    await page.evaluate(() =>
      globalThis.document.documentElement.classList.remove("dark"),
    );
    await page.emulateMedia({ colorScheme: "light" });
    const featureLinks = await page
      .locator(".VPFeature")
      .evaluateAll((cards) =>
        cards.map((card) => [
          card.querySelector(".link-text-value")?.textContent?.trim(),
          card.closest("a")?.getAttribute("href") ?? card.getAttribute("href"),
        ]),
      );
    const expectedFeatureLinks = [
      ["Use components", "/use-components/start-here"],
      ["Use the data and text tools", "/data-and-text-tools/start-here"],
      ["Use the data and text tools", "/data-and-text-tools/start-here"],
    ];
    if (
      featureLinks.length !== 3 ||
      expectedFeatureLinks.some(
        ([text, href], index) =>
          featureLinks[index][0] !== text ||
          !featureLinks[index][1]?.includes(href),
      )
    ) {
      throw new Error(
        `Unexpected feature card links: ${JSON.stringify(featureLinks)}.`,
      );
    }
    if (
      (await page.getByRole("heading", { name: "Two ways in" }).count()) > 0
    ) {
      throw new Error("Home must not repeat the feature cards as Two ways in.");
    }
    for (const [name, href] of [
      ["Sefaria's API", "https://developers.sefaria.org"],
    ]) {
      const hrefs = await page
        .getByRole("link", { name, exact: true })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      if (!hrefs.some((value) => value?.includes(href))) {
        throw new Error(`Expected a "${name}" link to ${href}: ${hrefs}.`);
      }
    }
    for (const name of [
      "Live Source Card",
      "Checked client data",
      "Cleaned text",
    ]) {
      await page.getByRole("tab", { name }).waitFor();
    }
    await assertEqual(
      await page.locator("#hero-panel-card sefaria-source-card").count(),
      1,
      "hero Source Card element count",
    );
    await page.waitForFunction(
      () =>
        globalThis.customElements.get("sefaria-source-card") !== undefined &&
        ["ready", "error"].includes(
          globalThis.document.querySelector(
            "#hero-panel-card sefaria-source-card",
          )?.status,
        ),
    );
    await assertEqual(
      await page
        .locator("#hero-panel-card sefaria-source-card")
        .evaluate((element) => element.status),
      "ready",
      "hero Source Card status with a reachable Sefaria",
    );
    await page
      .locator("#hero-panel-card sefaria-source-card")
      .getByText("You have been told")
      .first()
      .waitFor();
    if (failedSiteRequests.length > 0 || pageErrors.length > 0) {
      throw new Error(
        `Home page failures: ${[...failedSiteRequests, ...pageErrors].join("; ")}`,
      );
    }
    await page.getByRole("tab", { name: "Checked client data" }).click();
    await assertText(page.locator("#hero-panel-data"), '"ref": "Micah 6:8"');
    await page.getByRole("tab", { name: "Cleaned text" }).click();
    await page.waitForFunction(() =>
      globalThis.document
        .querySelector("#hero-panel-text")
        ?.textContent?.includes("You have been told"),
    );
    await assertText(page.locator("#hero-panel-text"), "You have been told");
    const labels = await page
      .locator("#hero-panel-text figcaption")
      .allTextContents();
    await assertEqual(
      JSON.stringify(labels),
      JSON.stringify([
        "Hebrew · text",
        "English · text",
        "English · footnote 1",
      ]),
      "cleaned text block labels",
    );
    await assertEqual(
      (await page.locator("#hero-panel-text pre.site-code .tok-tag").count()) >
        0,
      true,
      "cleaned text HTML highlighting",
    );
    const footerLinks = await page
      .locator(".documentation-disclosure a")
      .allTextContents();
    await assertEqual(
      JSON.stringify(footerLinks.map((text) => text.trim())),
      JSON.stringify(["GitHub", "Get support"]),
      "footer links",
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const order = await page
        .locator("#hero-panel-text figure")
        .first()
        .evaluate((figure) => {
          const tokens = [
            ...figure.querySelectorAll(".tok-punct, .tok-tag, .tok-attr"),
          ];
          const visual = [...tokens].sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return Math.abs(ra.top - rb.top) > 4
              ? ra.top - rb.top
              : ra.left - rb.left;
          });
          return {
            count: tokens.length,
            sameOrder: visual.every((token, index) => token === tokens[index]),
            direction: globalThis.getComputedStyle(figure.querySelector("pre"))
              .direction,
          };
        });
      await assertEqual(
        order.count > 0,
        true,
        `Hebrew block tags at ${width}px`,
      );
      await assertEqual(
        order.direction,
        "ltr",
        `Hebrew block direction at ${width}px`,
      );
      await assertEqual(
        order.sameOrder,
        true,
        `Hebrew block tag order at ${width}px`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const tab of ["Checked client data", "Cleaned text"]) {
      await page.getByRole("tab", { name: tab }).click();
      const blocks = await page
        .locator(".hero-example__panel:not([hidden]) pre.site-code")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            fontSize: globalThis.getComputedStyle(element).fontSize,
            whiteSpace: globalThis.getComputedStyle(element).whiteSpace,
            overflow: element.scrollWidth - element.clientWidth,
            highlighted: element.querySelector("[class^='tok-']") !== null,
          })),
        );
      if (blocks.length === 0) throw new Error(`${tab}: no code blocks.`);
      for (const block of blocks) {
        await assertEqual(block.fontSize, "13px", `${tab} font size`);
        await assertEqual(block.whiteSpace, "pre-wrap", `${tab} wrapping`);
        await assertEqual(block.overflow <= 0, true, `${tab} no overflow`);
        if (tab === "Checked client data") {
          await assertEqual(block.highlighted, true, `${tab} highlighting`);
        }
      }
    }
    const pageOverflow = await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth -
        globalThis.document.documentElement.clientWidth,
    );
    await assertNoCodeOverflow(page, "Home at 390px");
    await assertEqual(
      pageOverflow <= 0,
      true,
      "Home horizontal overflow at 390px",
    );
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(siteRouteUrl("/use-components/start-here.html"), {
      waitUntil: "networkidle",
    });
    await assertText(page.locator("h1"), "Put your first source on a page");
    await assertText(
      page.locator("pre").first(),
      snippet.trim().replaceAll("\r\n", "\n"),
    );
    await assertText(
      page.locator("body"),
      "examples/site-snippets/source-card-script-tag.html",
    );
    await assertText(page.locator("body"), "Package route");
    await assertStatusNotes(page, "quickstart");
    await assertEqual(
      await page.locator(".home-acknowledgement").count(),
      0,
      "acknowledgement is Home-only",
    );
    await assertText(page.locator("body"), "Just the citation");
    await assertText(
      page.locator("body"),
      "The alpha address always loads the newest build.",
    );
    await assertEqual(
      (await page.locator(".vp-doc code", { hasText: "alpha" }).count()) > 0,
      true,
      "alpha is rendered as code",
    );
    const quickstartFrame = page.frameLocator(
      'iframe[title="Source Card script-tag quickstart"]',
    );
    await quickstartFrame
      .locator("sefaria-source-card")
      .evaluate((element) => element.updateComplete);
    await assertEqual(
      await quickstartFrame
        .locator("sefaria-source-card")
        .evaluate((element) => element.status),
      "ready",
      "embedded quickstart Source Card status",
    );

    const snippetLayout = await page
      .locator(".snippet-demo")
      .evaluate((section) => {
        const code = section
          .querySelector("pre.site-code")
          .getBoundingClientRect();
        const frame = section
          .querySelector(".snippet-demo__frame")
          .getBoundingClientRect();
        return {
          stacked: frame.top >= code.bottom,
          fullWidth: frame.width >= section.getBoundingClientRect().width * 0.8,
          highlighted: section.querySelectorAll("pre.site-code .tok-tag")
            .length,
        };
      });
    await assertEqual(snippetLayout.stacked, true, "snippet result below code");
    await assertEqual(snippetLayout.fullWidth, true, "snippet result width");
    await assertEqual(
      snippetLayout.highlighted > 0,
      true,
      "snippet highlighting",
    );
    await page.waitForFunction(() => {
      const frame = globalThis.document.querySelector(".snippet-demo__frame");
      const root = frame?.contentDocument?.documentElement;
      return (
        root &&
        root.getBoundingClientRect().height > 100 &&
        frame.clientHeight >= root.getBoundingClientRect().height - 1
      );
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoCodeOverflow(page, "quickstart at 390px");
    await page.setViewportSize({ width: 1280, height: 900 });

    const pastePage = await browser.newPage();
    await routeToolkitRequests(pastePage, { fixture, localScript });
    await pastePage.setContent(
      `<!doctype html><html><body>${snippet}</body></html>`,
      {
        waitUntil: "networkidle",
      },
    );
    await pastePage.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-source-card")?.status ===
        "ready",
    );
    await pastePage.close();

    const failurePage = await browser.newPage();
    await routeToolkitRequests(failurePage, {
      fixture,
      localScript,
      failSefaria: true,
    });
    await failurePage.goto(siteUrl, { waitUntil: "domcontentloaded" });
    await failurePage.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-source-card")?.status ===
        "error",
    );
    await failurePage.locator("sefaria-source-card [role=alert]").waitFor();
    await failurePage.close();
  } finally {
    await browser.close();
  }
} finally {
  await previewServer.close();
}

async function routeToolkitRequests(
  page,
  { fixture, localScript, failSefaria = false },
) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.href ===
      "https://arithmomaniac.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"
    ) {
      await route.fulfill({
        body: localScript,
        contentType: "text/javascript",
      });
      return;
    }
    if (
      url.origin === origin ||
      url.protocol === "data:" ||
      url.protocol === "about:"
    ) {
      await route.continue();
      return;
    }
    if (
      url.origin === "https://www.sefaria.org" &&
      url.pathname.startsWith("/api/v3/texts/")
    ) {
      if (failSefaria) {
        await route.abort("failed");
        return;
      }
      await route.fulfill({
        json: createFixtureResponse(request.url(), "text-fixture", fixture, []),
      });
      return;
    }
    await route.abort("blockedbyclient");
  });
}

async function assertText(locator, expected) {
  const text = (await locator.textContent())?.replaceAll("\r\n", "\n");
  if (!text?.includes(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} in ${JSON.stringify(text)}.`,
    );
  }
}

async function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

async function assertNoCodeOverflow(page, label) {
  const overflowing = await page
    .locator("pre")
    .evaluateAll((blocks) =>
      blocks
        .filter((block) => block.scrollWidth > block.clientWidth + 1)
        .map((block) => block.textContent.slice(0, 60)),
    );
  if (overflowing.length > 0) {
    throw new Error(`${label}: code overflows: ${JSON.stringify(overflowing)}`);
  }
}

async function assertStatusNotes(page, label) {
  const notes = await page.locator(".status-note").evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.textContent.replace(/\s+/g, " ").trim(),
      href: element.querySelector("a")?.getAttribute("href"),
    })),
  );
  if (notes.length === 0) throw new Error(`${label}: no status note.`);
  for (const note of notes) {
    if (
      note.text !==
        "Experimental and unofficial. Names and addresses may change. License" ||
      !note.href?.endsWith(
        "/help/install-and-status.html#license-and-text-rights",
      ) ||
      note.text.includes("GPL")
    ) {
      throw new Error(
        `${label}: unexpected status note ${JSON.stringify(note)}.`,
      );
    }
  }
}

// --- Stage 7 session 1: components pages and LiveEditor ---
const { runSessionOneSiteChecks } = await import("./test-site-session-1.mjs");
await runSessionOneSiteChecks({ root, siteBasePath });
// --- end stage 7 session 1 ---
