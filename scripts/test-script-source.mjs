import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL, URLSearchParams } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { verifyScriptSource } from "./build-script-source.mjs";
import { isMainModule } from "./check.mjs";
import { classifySiteRequest } from "./site-request-policy.mjs";
import { createFixtureResponse } from "./site-fixtures.mjs";

const root = path.resolve(import.meta.dirname, "..");
const tags = [
  "bilingual-segment",
  "connections-panel",
  "reader",
  "source-card",
  "text-segment",
].map((name) => `sefaria-${name}`);

export async function testScriptSource(directory) {
  const manifest = await verifyScriptSource(directory);
  const fixture = JSON.parse(
    await readFile(
      path.join(root, "examples", "react-vite", "src", "micah-6-8.json"),
      "utf8",
    ),
  );
  const entries = Object.keys(manifest.entries ?? { [manifest.entry]: {} });
  const moduleBytes = Object.fromEntries(
    await Promise.all(
      entries.map(async (name) => [
        name,
        await readFile(path.join(directory, name)),
      ]),
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
  const assets = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const name = entries.find((entry) =>
      ["", "/sefaria-frontend-toolkit"].some(
        (base) => pathname === `${base}/cdn/${manifest.version}/${entry}`,
      ),
    );
    if (!name) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, {
        "content-type": "text/javascript",
        "access-control-allow-origin": "*",
      })
      .end(moduleBytes[name]);
  });
  const host = createServer((request, response) => {
    const parameters = new URL(request.url, "http://localhost").searchParams;
    const scenario = parameters.get("scenario");
    if (scenario === "modules") {
      response
        .writeHead(200, { "content-type": "text/html" })
        .end("<!doctype html><html><body></body></html>");
      return;
    }
    const sref =
      parameters.get("scenario") === "supplied"
        ? ""
        : ` sref="${parameters.get("scenario") === "ten" ? "Micah 6:1-10" : "Micah 6:8"}"`;
    response
      .writeHead(200, { "content-type": "text/html" })
      .end(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><script type="module" src="${parameters.get("script")}"></script></head><body>${interactionMarkup(scenario) ?? `<sefaria-source-card${sref}></sefaria-source-card>`}</body></html>`,
      );
  });
  assets.listen(0, "127.0.0.1");
  host.listen(0, "127.0.0.1");
  await Promise.all([once(assets, "listening"), once(host, "listening")]);
  const assetOrigin = `http://127.0.0.1:${assets.address().port}`;
  const hostOrigin = `http://127.0.0.1:${host.address().port}`;
  try {
    for (const engine of [chromium, firefox, webkit]) {
      const browser = await engine.launch();
      try {
        await testDataModules(browser, {
          assetOrigin,
          hostOrigin,
          manifest,
          entries,
          fixture,
        });
        for (const base of ["", "/sefaria-frontend-toolkit"]) {
          let liveText;
          for (const scenario of [
            "live",
            "duplicate",
            "ten",
            "supplied",
            "invalid",
            "source-interaction",
            "reader-interaction",
          ]) {
            const context = await browser.newContext();
            try {
              const page = await context.newPage();
              const errors = [];
              const requests = [];
              page.on("pageerror", (error) => errors.push(error.message));
              let payload = globalThis.structuredClone(fixture);
              if (scenario === "ten") {
                payload = {
                  ...payload,
                  ref: "Micah 6:1-10",
                  sections: ["6", "1"],
                  toSections: ["6", "10"],
                };
                payload.versions = payload.versions.map((version) => ({
                  ...version,
                  text: Array.from({ length: 10 }, () => version.text),
                }));
              }
              if (scenario === "source-interaction") {
                payload = {
                  ...payload,
                  ref: "Micah 6:7-8",
                  sections: ["6", "7"],
                  toSections: ["6", "8"],
                  versions: payload.versions.map((version) => ({
                    ...version,
                    text: [version.text, version.text],
                  })),
                };
              }
              await page.route("**/*", async (route) => {
                const requested = new URL(route.request().url());
                if ([assetOrigin, hostOrigin].includes(requested.origin)) {
                  await route.continue();
                  return;
                }
                if (scenario === "reader-interaction") {
                  const policy = classifySiteRequest({
                    method: route.request().method(),
                    requestUrl: requested.href,
                    siteOrigin: assetOrigin,
                  });
                  if (policy === "text-fixture" || policy === "links-fixture") {
                    requests.push(requested.href);
                    await route.fulfill({
                      json: createFixtureResponse(
                        requested.href,
                        policy,
                        fixture,
                        linksFixture,
                      ),
                    });
                    return;
                  }
                  errors.push(`Unexpected Reader request: ${requested.href}`);
                  await route.abort();
                  return;
                }
                if (
                  requested.origin !== "https://www.sefaria.org" ||
                  !requested.pathname.startsWith("/api/v3/texts/")
                ) {
                  errors.push(`Unexpected request: ${requested.href}`);
                  await route.abort();
                  return;
                }
                requests.push(route.request().url());
                assert.match(route.request().url(), /\/api\/v3\/texts\//u);
                await route.fulfill({
                  json:
                    scenario === "invalid" ? { versions: "invalid" } : payload,
                });
              });
              const url = `${assetOrigin}${base}/cdn/${manifest.version}/${manifest.entry}`;
              await page.goto(
                `${hostOrigin}/?${new URLSearchParams({ script: url, scenario })}`,
              );
              await page.waitForFunction(
                () => !!globalThis.customElements.get("sefaria-source-card"),
              );
              assert.equal(
                await page.evaluate(
                  (names) =>
                    names.every(
                      (name) => !!globalThis.customElements.get(name),
                    ),
                  tags,
                ),
                true,
              );
              assert.equal(
                await page.evaluate(
                  () =>
                    !!globalThis.customElements.get("sefaria-popup") ||
                    !!globalThis.customElements.get("sefaria-ref-label"),
                ),
                false,
              );
              assert.equal(
                await page.evaluate(async (moduleUrl) => {
                  const module = await import(moduleUrl);
                  return ["SefariaPopup", "SefariaRefLabel"].some(
                    (name) => name in module,
                  );
                }, url),
                false,
              );
              if (scenario.endsWith("-interaction")) {
                await exerciseInteractions(page, scenario, requests);
                await page.waitForLoadState("networkidle");
                assert.equal(
                  requests.length,
                  scenario === "reader-interaction" ? 5 : 1,
                );
                assert.deepEqual(errors, []);
                continue;
              }
              if (scenario === "supplied") {
                await page.evaluate((data) => {
                  globalThis.document.querySelector(
                    "sefaria-source-card",
                  ).data = data;
                }, payload);
              }
              if (scenario === "invalid") {
                await page.waitForFunction(
                  () =>
                    globalThis.document.querySelector("sefaria-source-card")
                      .status === "error",
                );
                assert.ok(
                  await page
                    .locator("sefaria-source-card [role=alert]")
                    .textContent(),
                );
              } else {
                await page.waitForFunction(
                  () =>
                    globalThis.document.querySelector("sefaria-source-card")
                      .status === "ready",
                );
                await page
                  .locator("sefaria-source-card .body-part")
                  .first()
                  .waitFor();
                assert.match(
                  await page
                    .locator("sefaria-source-card .attributions")
                    .textContent(),
                  /Deterministic example/u,
                );
                assert.equal(
                  await page.locator("sefaria-source-card .body-part").count(),
                  scenario === "ten" ? 20 : 2,
                );
                const visibleText = await page
                  .locator("sefaria-source-card .body-part")
                  .allTextContents();
                if (scenario === "live") liveText = visibleText;
                if (scenario === "supplied")
                  assert.deepEqual(visibleText, liveText);
              }
              if (scenario === "duplicate") {
                assert.equal(
                  await page.evaluate(async (url) => {
                    const original = globalThis.customElements.get(
                      "sefaria-source-card",
                    );
                    await import(url);
                    await import(`${url}?second-evaluation`);
                    const script = globalThis.document.createElement("script");
                    script.type = "module";
                    script.src = url;
                    await new Promise((resolve, reject) => {
                      script.onload = resolve;
                      script.onerror = reject;
                      globalThis.document.head.append(script);
                    });
                    return (
                      original ===
                      globalThis.customElements.get("sefaria-source-card")
                    );
                  }, url),
                  true,
                );
              }
              assert.equal(requests.length, scenario === "supplied" ? 0 : 1);
              assert.deepEqual(errors, []);
            } catch (error) {
              throw new Error(
                `${engine.name()} ${base || "/"} ${scenario} failed.`,
                { cause: error },
              );
            } finally {
              await context.close();
            }
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await Promise.all([
      new Promise((resolve) => assets.close(resolve)),
      new Promise((resolve) => host.close(resolve)),
    ]);
  }
}

const dataModules = {
  "sefaria-client.js": [
    "createSefariaClient",
    "text",
    "validateExternalResponse",
  ],
  "sefaria-text-transform.js": ["normalizeText", "applyVocalization"],
};

async function testDataModules(
  browser,
  { assetOrigin, hostOrigin, manifest, entries, fixture },
) {
  assert.deepEqual(
    Object.keys(dataModules).filter((name) => !entries.includes(name)),
    [],
    "Manifest must list the client and text-transform modules.",
  );
  const base = `${assetOrigin}/cdn/${manifest.version}`;
  const srcdoc = `<!doctype html><script type="module">
    const report = (value) => parent.postMessage(value, "*");
    try {
      const client = await import(${JSON.stringify(`${base}/sefaria-client.js`)});
      const transform = await import(${JSON.stringify(`${base}/sefaria-text-transform.js`)});
      const response = await client.text.getV3Texts({ client: client.createSefariaClient(), path: { tref: "Micah 6:8" } });
      report({
        origin: String(self.origin),
        client: Object.keys(client).sort(),
        transform: Object.keys(transform).sort(),
        ref: response.data?.ref ?? null,
        normalized: typeof transform.normalizeText("<b>a</b>"),
      });
    } catch (error) {
      report({ error: String(error && error.stack || error) });
    }
  </script>`;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const errors = [];
    const origins = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const requested = new URL(route.request().url());
      if ([assetOrigin, hostOrigin].includes(requested.origin)) {
        await route.continue();
        return;
      }
      if (
        requested.origin === "https://www.sefaria.org" &&
        requested.pathname.startsWith("/api/v3/texts/")
      ) {
        origins.push(await route.request().headerValue("origin"));
        await route.fulfill({
          json: fixture,
          headers: { "access-control-allow-origin": "*" },
        });
        return;
      }
      errors.push(`Unexpected request: ${requested.href}`);
      await route.abort();
    });
    await page.goto(`${hostOrigin}/?scenario=modules`);
    const result = await page.evaluate(
      (document) =>
        new Promise((resolve, reject) => {
          const timer = globalThis.setTimeout(
            () => reject(new Error("Sandboxed module timed out.")),
            30_000,
          );
          globalThis.addEventListener("message", (event) => {
            globalThis.clearTimeout(timer);
            resolve(event.data);
          });
          const frame = globalThis.document.createElement("iframe");
          frame.setAttribute("sandbox", "allow-scripts");
          frame.srcdoc = document;
          globalThis.document.body.append(frame);
        }),
      srcdoc,
    );
    assert.equal(result.error, undefined, result.error);
    assert.equal(result.origin, "null");
    for (const name of dataModules["sefaria-client.js"])
      assert.ok(result.client.includes(name), `sefaria-client.js ${name}`);
    for (const name of dataModules["sefaria-text-transform.js"])
      assert.ok(
        result.transform.includes(name),
        `sefaria-text-transform.js ${name}`,
      );
    assert.equal(result.ref, fixture.ref);
    assert.equal(result.normalized, "object");
    assert.deepEqual(origins, ["null"]);
    assert.deepEqual(errors, []);
  } catch (error) {
    throw new Error(`${browser.browserType().name()} data modules failed.`, {
      cause: error,
    });
  } finally {
    await context.close();
  }
}

function interactionMarkup(scenario) {
  if (scenario === "source-interaction") {
    return `
      <label>Language <select id="language"><option value="both">Both</option><option value="translation">Translation</option></select></label>
      <label>Vocalization <select id="vocalization"><option value="taamim_and_nikkud">Full</option><option value="none">None</option></select></label>
      <output id="selection"></output>
      <sefaria-source-card sref="Micah 6:7-8" selectable></sefaria-source-card>
      <script type="module">
        await customElements.whenDefined("sefaria-source-card");
        const card = document.querySelector("sefaria-source-card");
        let count = 0;
        document.addEventListener("sefaria-source-select", (event) => {
          card.selectedPosition = event.detail.position;
          document.querySelector("#selection").textContent = JSON.stringify({ count: ++count, detail: event.detail });
        });
        document.querySelector("#language").addEventListener("change", (event) => card.setAttribute("content-language", event.target.value));
        document.querySelector("#vocalization").addEventListener("change", (event) => card.setAttribute("vocalization-mode", event.target.value));
      </script>`;
  }
  if (scenario === "reader-interaction") {
    return `<style>sefaria-reader { display: block; height: 90vh; }</style><sefaria-reader sref="Micah 6:8"></sefaria-reader>`;
  }
}

async function exerciseInteractions(page, scenario, requests) {
  if (scenario === "source-interaction") {
    const card = page.locator("sefaria-source-card");
    const first = card
      .getByRole("button", {
        name: "Show connections for Micah 6:7",
      })
      .first();
    const second = card
      .getByRole("button", {
        name: "Show connections for Micah 6:8",
      })
      .first();
    await first.press("Enter");
    await page.locator("#selection").filter({ hasText: '"count":1' }).waitFor();
    assert.deepEqual(
      JSON.parse(await page.locator("#selection").textContent()),
      { count: 1, detail: { position: [0], ref: "Micah 6:7" } },
    );
    assert.equal(await first.getAttribute("aria-pressed"), "true");
    await second.click();
    await page.locator("#selection").filter({ hasText: '"count":2' }).waitFor();
    assert.deepEqual(
      JSON.parse(await page.locator("#selection").textContent()),
      { count: 2, detail: { position: [1], ref: "Micah 6:8" } },
    );
    assert.equal(await first.getAttribute("aria-pressed"), "false");
    assert.equal(await second.getAttribute("aria-pressed"), "true");
    const original = await card.locator(".body-part").first().textContent();
    assert.match(original, /[\u0591-\u05BD\u05BF-\u05C7]/u);
    await page.getByLabel("Vocalization").selectOption("none");
    await page.waitForFunction(() => {
      const card = globalThis.document.querySelector("sefaria-source-card");
      const segment = card.shadowRoot.querySelector("sefaria-text-segment");
      return !/[\u0591-\u05BD\u05BF-\u05C7]/u.test(
        segment.shadowRoot.querySelector(".body-part").textContent,
      );
    });
    await page.getByLabel("Vocalization").selectOption("taamim_and_nikkud");
    await page.waitForFunction(
      (text) =>
        globalThis.document
          .querySelector("sefaria-source-card")
          .shadowRoot.querySelector("sefaria-text-segment")
          .shadowRoot.querySelector(".body-part").textContent === text,
      original,
    );
    await page.getByLabel("Language").selectOption("translation");
    await card.locator(".body-part:visible").first().waitFor();
    assert.equal(await card.locator(".body-part:visible").count(), 2);
    assert.match(
      await card.locator(".body-part:visible").first().textContent(),
      /He has shown/u,
    );
    await page.getByLabel("Language").selectOption("both");
    await page.waitForFunction(async () => {
      await globalThis.document.querySelector("sefaria-source-card")
        .updateComplete;
      return true;
    });
    assert.equal(await card.locator(".body-part:visible").count(), 4);
    assert.equal(
      requests.length,
      1,
      "Source selection and display controls must not acquire again.",
    );
    return;
  }
  if (scenario === "reader-interaction") {
    const reader = page.locator("sefaria-reader");
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-reader")?.selectedRef ===
        "Micah 6:8",
    );
    const commentary = reader
      .getByRole("button", { name: /Commentary/u })
      .first();
    await commentary.click();
    const initialEntry = await reader.evaluate(
      (element) => element.currentEntryId,
    );
    assert.equal(
      requests.length,
      3,
      "Reader root requires target, context and links.",
    );
    await reader
      .getByRole("button", { name: "Open Rashi on Micah 6:8:1 in context" })
      .press("Enter");
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-reader").selectedRef ===
          "Rashi on Micah 6:8:1" &&
        !globalThis.document.querySelector("sefaria-reader").rootLoading,
    );
    await reader
      .getByRole("heading", { name: "Rashi on Micah 6:8:1", exact: true })
      .waitFor();
    assert.equal(
      requests.length,
      5,
      "Opening a connection acquires its source and links once.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await reader.getByRole("button", { name: "Text", exact: true }).click();
    await reader.locator('[part="source-pane"]').waitFor({ state: "visible" });
    await reader
      .locator('[part="connections-pane"]')
      .waitFor({ state: "hidden" });
    assert.equal(
      await reader
        .getByRole("button", { name: "Text", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await reader
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await reader
      .locator('[part="connections-pane"]')
      .waitFor({ state: "visible" });
    await reader.locator('[part="source-pane"]').waitFor({ state: "hidden" });
    assert.equal(
      await reader
        .getByRole("button", { name: "Connections", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await reader
      .getByRole("button", { name: "Back", exact: true })
      .press("Enter");
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector("sefaria-reader").selectedRef ===
        "Micah 6:8",
    );
    await reader
      .getByRole("heading", { name: "Micah 6", exact: true })
      .waitFor();
    assert.equal(
      await reader
        .getByRole("button", { name: "Back", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      requests.length,
      5,
      "Pane changes and Back use retained data.",
    );
    assert.equal(
      await reader.evaluate((element) => element.currentEntryId),
      initialEntry,
    );
    assert.equal(
      await reader.evaluate((element) => element.readerError),
      undefined,
    );
    return;
  }
  throw new Error(`Unknown interaction scenario: ${scenario}`);
}

if (isMainModule(import.meta.url, process.argv[1])) {
  await testScriptSource(
    path.resolve(
      process.argv[2] ?? path.join(root, "dist", "site", "cdn", "local"),
    ),
  );
  process.stdout.write(
    "Script source loading and interaction journeys passed on Chromium, Firefox and WebKit.\n",
  );
}
