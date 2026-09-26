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

const root = path.resolve(import.meta.dirname, "..");
const tags = [
  "bilingual-segment",
  "connections-panel",
  "popup",
  "reader",
  "ref-label",
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
  const moduleBytes = await readFile(path.join(directory, manifest.entry));
  const assets = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (
      !["", "/sefaria-frontend-toolkit"].some(
        (base) =>
          pathname === `${base}/cdn/${manifest.version}/${manifest.entry}`,
      )
    ) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, {
        "content-type": "text/javascript",
        "access-control-allow-origin": "*",
      })
      .end(moduleBytes);
  });
  const host = createServer((request, response) => {
    const parameters = new URL(request.url, "http://localhost").searchParams;
    const sref =
      parameters.get("scenario") === "supplied"
        ? ""
        : ` sref="${parameters.get("scenario") === "ten" ? "Micah 6:1-10" : "Micah 6:8"}"`;
    response
      .writeHead(200, { "content-type": "text/html" })
      .end(
        `<!doctype html><html><head><meta charset="utf-8"><script type="module" src="${parameters.get("script")}"></script></head><body><sefaria-source-card${sref}></sefaria-source-card></body></html>`,
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
        for (const base of ["", "/sefaria-frontend-toolkit"]) {
          let liveText;
          for (const scenario of [
            "live",
            "duplicate",
            "ten",
            "supplied",
            "invalid",
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
              await page.route("**/*", async (route) => {
                const requested = new URL(route.request().url());
                if ([assetOrigin, hostOrigin].includes(requested.origin)) {
                  await route.continue();
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

if (isMainModule(import.meta.url, process.argv[1])) {
  await testScriptSource(
    path.resolve(
      process.argv[2] ?? path.join(root, "dist", "site", "cdn", "local"),
    ),
  );
  process.stdout.write(
    "Script source passed on Chromium, Firefox and WebKit.\n",
  );
}
