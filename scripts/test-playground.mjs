import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium, firefox, webkit } from "playwright";
import { preview } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const playground = path.join(root, "examples", "playground");
const browsers = { chromium, firefox, webkit };
const probeHits = [];
const probeServer = http.createServer((request, response) => {
  probeHits.push(request.url);
  response.writeHead(204).end();
});
probeServer.on("upgrade", (request, socket) => {
  probeHits.push(request.url);
  socket.destroy();
});
await new Promise((resolve) => probeServer.listen(0, "127.0.0.1", resolve));
const probeAddress = probeServer.address();
if (!probeAddress || typeof probeAddress === "string") {
  throw new Error("The playground probe server did not expose a port.");
}
const probeOrigin = `http://127.0.0.1:${probeAddress.port}`;

try {
  runPnpm(["--filter", "@sefaria-example/playground", "build:graph"]);
  for (const base of ["/", "/sefaria-frontend-toolkit/"]) {
    runPnpm([
      "--filter",
      "@sefaria-example/playground",
      "exec",
      "vite",
      "build",
      `--base=${base}`,
      "--outDir=dist",
      "--emptyOutDir",
    ]);
    await qualifyBase(base);
  }
} finally {
  await new Promise((resolve) => probeServer.close(resolve));
}

async function qualifyBase(base) {
  await writeFile(
    path.join(playground, "dist", "embed-test.html"),
    '<!doctype html><iframe title="Documentation embed" src="./" style="width:100%;height:900px"></iframe>',
  );
  const server = await preview({
    root: playground,
    configFile: false,
    base,
    build: { outDir: path.join(playground, "dist") },
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("The playground preview did not expose a port.");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  const editorUrl = `${origin}${base}`;
  try {
    const html = await (await globalThis.fetch(editorUrl)).text();
    assertLeadingParentPolicy(html);
    const graph = await (
      await globalThis.fetch(new URL("runtime-graph.json", editorUrl))
    ).json();
    for (const [name, launcher] of Object.entries(browsers)) {
      const browser = await launcher.launch({ headless: true });
      try {
        await qualifyBrowser(browser, name, editorUrl, origin, graph);
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}

async function qualifyBrowser(browser, name, editorUrl, origin, graph) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const externalRequests = [];
  const pageErrors = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith(origin) &&
      !request.url().startsWith("data:")
    ) {
      externalRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(editorUrl, { waitUntil: "networkidle" });
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  const previewFrame = page.frameLocator(
    'iframe[title="Supplied-data component preview"]',
  );
  await previewFrame.locator("sefaria-source-card").waitFor();
  assertEqual(
    await previewFrame.locator("sefaria-source-card").count(),
    1,
    `${name} card`,
  );
  assertEqual(externalRequests.length, 0, `${name} initial external requests`);
  assertEqual(pageErrors.length, 0, `${name} page errors`);

  await page.getByRole("button", { name: "Stop preview" }).click();
  const graphResult = await runGraphQualification(page, graph);
  assertEqual(graphResult.pureRegistered, false, `${name} pure registration`);
  assertEqual(graphResult.clientIdentity, true, `${name} client identity`);
  assertEqual(graphResult.rootRegistered, true, `${name} root registration`);
  assertEqual(
    graphResult.rootStable,
    true,
    `${name} root registration stability`,
  );

  const probeCount = probeHits.length;
  await runNavigationProbe(page, probeOrigin);
  await page.waitForTimeout(500);
  assertEqual(
    probeHits.length,
    probeCount,
    `${name} denied child resources and navigation`,
  );

  if (name === "chromium") {
    await qualifyEditorInteraction(page, probeOrigin);
    const narrow = await browser.newPage({
      viewport: { width: 195, height: 422 },
    });
    await narrow.goto(editorUrl, { waitUntil: "networkidle" });
    await narrow
      .getByText("Preview rendered with supplied data.")
      .waitFor({ timeout: 30_000 });
    assertEqual(
      await narrow.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.document.documentElement.clientWidth,
      ),
      true,
      "Chromium narrow 200% page overflow",
    );
    await narrow.close();

    const wrapper = await browser.newPage();
    await wrapper.goto(new URL("embed-test.html", editorUrl).href);
    await wrapper
      .frameLocator('iframe[title="Documentation embed"]')
      .getByText("Preview rendered with supplied data.")
      .waitFor({ timeout: 30_000 });
    await wrapper.close();
  }
  process.stdout.write(`✓ playground ${name} ${new URL(editorUrl).pathname}\n`);
}

async function qualifyEditorInteraction(page, destination) {
  await page.getByRole("button", { name: "Run" }).click();
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  await page.getByRole("tab", { name: "HTML" }).focus();
  await page.keyboard.press("ArrowRight");
  assertEqual(
    await page.getByRole("tab", { name: "CSS" }).getAttribute("aria-selected"),
    "true",
    "keyboard tab selection",
  );
  await page.getByRole("tab", { name: "HTML" }).click();
  const editor = page.locator(".cm-content");
  await editor.fill(
    '<article class="example"><h1>Edited supplied data</h1><sefaria-source-card id="source-card"></sefaria-source-card></article>',
  );
  const frame = page.frameLocator(
    'iframe[title="Supplied-data component preview"]',
  );
  assertEqual(
    await frame.getByText("Edited supplied data").count(),
    0,
    "draft isolation",
  );
  await page.getByRole("button", { name: "Run" }).click();
  await frame.getByText("Edited supplied data").waitFor();
  assertEqual(
    await page.locator("#preview iframe").count(),
    1,
    "single active preview",
  );
  await page.getByRole("button", { name: "Reset" }).click();
  if (!(await editor.innerText()).includes("Micah 6:8")) {
    throw new Error("Reset did not restore the maintained HTML source.");
  }
  await page.getByRole("tab", { name: "JavaScript" }).click();
  await editor.fill(
    'setTimeout(() => { throw new Error("editor boom"); }, 0);',
  );
  await page.getByRole("button", { name: "Run" }).click();
  await page
    .locator('#diagnostic-list li[data-category="runtime"]')
    .filter({ hasText: "editor boom" })
    .waitFor();
  const probeCount = probeHits.length;
  await editor.fill(`fetch(${JSON.stringify(`${destination}/edited-fetch`)});`);
  await page.getByRole("button", { name: "Run" }).click();
  await page
    .locator('#diagnostic-list li[data-category="csp"]')
    .first()
    .waitFor();
  await page.waitForTimeout(200);
  assertEqual(probeHits.length, probeCount, "edited fetch denial");
  await page.getByRole("button", { name: "Reset" }).click();
}

async function runGraphQualification(page, graph) {
  const importMap = JSON.stringify({ imports: graph.imports }).replaceAll(
    "<",
    "\\u003c",
  );
  const importMapHash = crypto
    .createHash("sha256")
    .update(importMap)
    .digest("base64");
  const script = `
    void (async () => { try {
      const pure = await import("@arithmomaniac/sefaria-web-components/source-card");
      const pureRegistered = customElements.get("sefaria-source-card") !== undefined;
      const client = await import("@arithmomaniac/sefaria-client");
      const validation = await import("@arithmomaniac/sefaria-client/validation");
      const root = await import("@arithmomaniac/sefaria-web-components");
      const registered = customElements.get("sefaria-source-card");
      const second = await import("@arithmomaniac/sefaria-web-components");
      parent.postMessage({type:"graph-result", pureRegistered, clientIdentity:client.getResponseContract === validation.getResponseContract, rootRegistered:registered === root.SefariaSourceCard, rootStable:second.SefariaSourceCard === registered, factory:typeof pure.createSourceCardViewModel === "function"},"*");
    } catch (error) {
      parent.postMessage({type:"graph-error", message:error instanceof Error ? error.message : String(error)},"*");
    } })();
  `;
  const policy = `default-src 'none'; script-src data: 'sha256-${importMapHash}'; style-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  const child = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script type="importmap">${importMap}</script><script src="${toDataUrl(script)}"></script>`;
  return page.evaluate(
    ({ child }) =>
      new Promise((resolve, reject) => {
        const timeout = globalThis.setTimeout(
          () => reject(new Error("Graph qualification timed out.")),
          20_000,
        );
        const receive = (event) => {
          if (event.data?.type === "graph-error") {
            globalThis.clearTimeout(timeout);
            globalThis.removeEventListener("message", receive);
            reject(new Error(event.data.message));
            return;
          }
          if (event.data?.type !== "graph-result") return;
          globalThis.clearTimeout(timeout);
          globalThis.removeEventListener("message", receive);
          resolve(event.data);
        };
        globalThis.addEventListener("message", receive);
        const frame = globalThis.document.createElement("iframe");
        frame.sandbox.add("allow-scripts");
        frame.src = child;
        globalThis.document.body.append(frame);
      }),
    { child: toHtmlDataUrl(child) },
  );
}

async function runNavigationProbe(page, destination) {
  const script = `
    const destination=${JSON.stringify(destination)};
    try { fetch(destination+"/fetch"); } catch {}
    try { navigator.sendBeacon(destination+"/beacon","x"); } catch {}
    try { new WebSocket(destination.replace("http","ws")+"/socket"); } catch {}
    try { const image=new Image(); image.src=destination+"/image"; document.body.append(image); } catch {}
    try { const frame=document.createElement("iframe"); frame.src=destination+"/frame"; document.body.append(frame); } catch {}
    location.href=destination+"/navigation";
  `;
  const child = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src data:; connect-src 'none'; img-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"><script src="${toDataUrl(script)}"></script>`;
  await page.evaluate(
    ({ child }) => {
      const frame = globalThis.document.createElement("iframe");
      frame.sandbox.add("allow-scripts");
      frame.src = child;
      globalThis.document.body.append(frame);
    },
    { child: toHtmlDataUrl(child) },
  );
}

function assertLeadingParentPolicy(html) {
  const policy = html.indexOf('http-equiv="Content-Security-Policy"');
  const executable = Math.min(
    ...["<script", '<link rel="stylesheet"']
      .map((token) => html.indexOf(token))
      .filter((index) => index >= 0),
  );
  if (policy < 0 || policy > executable) {
    throw new Error("The editor parent CSP must precede executable assets.");
  }
  for (const required of [
    "script-src 'self' data: 'sha256-",
    "frame-src data:",
    "child-src data:",
    "worker-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
  ]) {
    if (!html.includes(required))
      throw new Error(`Missing parent policy ${required}.`);
  }
  if (html.includes("__PLAYGROUND_IMPORT_MAP_HASH__")) {
    throw new Error("The production parent CSP contains an unresolved hash.");
  }
}

function runPnpm(args) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const commandArgs = windows
    ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`pnpm ${args.join(" ")} failed.`);
}

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

function toHtmlDataUrl(source) {
  return `data:text/html;base64,${Buffer.from(source).toString("base64")}`;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}
