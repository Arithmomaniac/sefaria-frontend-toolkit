import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { URL } from "node:url";

import { chromium, firefox, webkit } from "playwright";
import { parseAst } from "vite";

export async function testPackageBrowserModules({
  packages,
  fixture,
  urls,
  live = false,
}) {
  const bytes = new Map();
  for (const { directory, browserFile } of packages) {
    const module = await readFile(
      path.join(directory, "dist", "browser", browserFile),
    );
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (
        [
          "ImportDeclaration",
          "ExportAllDeclaration",
          "ExportNamedDeclaration",
          "ImportExpression",
        ].includes(node.type) &&
        node.source
      )
        throw new Error(
          `Packaged browser module has an unresolved import: ${browserFile}.`,
        );
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
      }
    };
    visit(parseAst(module.toString("utf8")));
    assert.match(module.toString("utf8"), /MIT\. Copyright \(c\) 2026 Sefaria/);
    assert.match(
      await readFile(
        path.join(directory, "dist", "browser", "LICENSE.txt"),
        "utf8",
      ),
      /MIT License/,
    );
    assert.ok(
      (
        await readFile(
          path.join(directory, "dist", "browser", "THIRD-PARTY-NOTICES.txt"),
          "utf8",
        )
      ).length,
    );
    bytes.set(`/${browserFile}`, module);
  }
  const assets = createServer((request, response) => {
    const module = bytes.get(new URL(request.url, "http://localhost").pathname);
    if (!module) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, {
        "content-type": "text/javascript",
        "access-control-allow-origin": "*",
      })
      .end(module);
  });
  const host = createServer((_request, response) => {
    response
      .writeHead(200, { "content-type": "text/html" })
      .end("<!doctype html><html><body></body></html>");
  });
  assets.listen(0, "127.0.0.1");
  host.listen(0, "127.0.0.1");
  await Promise.all([once(assets, "listening"), once(host, "listening")]);
  const origin = `http://127.0.0.1:${assets.address().port}`;
  const moduleUrls =
    urls ??
    Object.fromEntries(
      [...bytes.keys()].map((file) => [file.slice(1), `${origin}${file}`]),
    );
  try {
    for (const engine of [chromium, firefox, webkit]) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let requests = 0;
        await page.route("https://www.sefaria.org/**", async (route) => {
          requests++;
          const url = new URL(route.request().url());
          assert.ok(url.pathname.startsWith("/api/v3/texts/"));
          assert.equal(
            decodeURIComponent(url.pathname.split("/").at(-1)),
            "Micah 6:8",
          );
          if (route.request().frame().url() === "about:srcdoc")
            assert.equal(route.request().headers().origin, "null");
          if (live) {
            await route.continue();
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(fixture),
          });
        });
        await page.goto(`http://127.0.0.1:${host.address().port}`);
        const result = await page.evaluate(
          async ({ urls, fixture }) => {
            const client = await import(urls["sefaria-api-client.js"]);
            const transform = await import(urls["sefaria-text-transform.js"]);
            if (globalThis.customElements.get("sefaria-source-card"))
              throw new Error("Data module registered an element.");
            const { bodyHtml: cleaned } = transform.normalizeText(
              "<b>safe</b><script>unsafe()</script>",
            );
            const response = await client.text.getV3Texts({
              client: client.createSefariaClient({ cache: false }),
              path: { tref: "Micah 6:8" },
            });
            await import(urls["sefaria-elements.js"]);
            await import(
              `${urls["sefaria-elements.js"]}?duplicate-evaluation=1`
            );
            const tags = [
              "text-segment",
              "bilingual-segment",
              "source-card",
              "connections-panel",
              "reader",
            ];
            if (
              !tags.every((tag) =>
                globalThis.customElements.get(`sefaria-${tag}`),
              )
            )
              throw new Error("Missing element registration.");
            const card = globalThis.document.createElement(
              "sefaria-source-card",
            );
            card.data = fixture;
            globalThis.document.body.append(card);
            await card.updateComplete;
            await card.updateComplete;
            return { cleaned, ref: response.data?.ref };
          },
          { urls: moduleUrls, fixture },
        );
        assert.equal(result.ref, fixture.ref);
        assert.ok(!result.cleaned.includes("<script"));
        const body = page.locator("sefaria-source-card .body-part:visible");
        await body.first().waitFor();
        assert.match((await body.allTextContents()).join(" "), /He has shown/u);
        assert.equal(requests, 1);
        await page.evaluate(
          async ({ urls }) => {
            await new Promise((resolve, reject) => {
              const iframe = globalThis.document.createElement("iframe");
              iframe.setAttribute("sandbox", "allow-scripts");
              const timeout = globalThis.setTimeout(
                () => reject(new Error("Opaque module imports timed out")),
                30_000,
              );
              const listener = (event) => {
                if (event.source !== iframe.contentWindow) return;
                globalThis.clearTimeout(timeout);
                globalThis.removeEventListener("message", listener);
                iframe.remove();
                if (event.data?.ok !== true)
                  reject(
                    new Error(event.data?.error ?? "Opaque import failed"),
                  );
                else resolve();
              };
              globalThis.addEventListener("message", listener);
              iframe.srcdoc = `<script type="module">
              try {
                const client = await import(${JSON.stringify(urls["sefaria-api-client.js"])});
                const transform = await import(${JSON.stringify(urls["sefaria-text-transform.js"])});
                await import(${JSON.stringify(urls["sefaria-elements.js"])});
                if (typeof transform.normalizeText !== "function" || !customElements.get("sefaria-source-card")) throw Error("Missing sandbox exports");
                const response = await client.text.getV3Texts({client:client.createSefariaClient({cache:false}),path:{tref:"Micah 6:8"}});
                if (!response.data?.ref) throw Error("Sandbox client response missing");
                parent.postMessage({ok:true}, "*");
              } catch (error) { parent.postMessage({ok:false,error:String(error)}, "*"); }
            </script>`;
              globalThis.document.body.append(iframe);
            });
          },
          { urls: moduleUrls },
        );
        assert.equal(requests, 2);
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    }
  } finally {
    await Promise.all([
      new Promise((resolve, reject) =>
        assets.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise((resolve, reject) =>
        host.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  }
}
