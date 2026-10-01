import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { chromium, firefox, webkit } from "playwright";
import { build, preview } from "vite";

import { runNodeScript } from "./node-tool.mjs";

const root = path.resolve(import.meta.dirname, "..");
const playground = path.join(root, "examples", "playground");
const browsers = { chromium, firefox, webkit };
const projects = {
  "text-segment": "sefaria-text-segment",
  "bilingual-segment": "sefaria-bilingual-segment",
  "source-card": "sefaria-source-card",
  "connections-panel": "sefaria-connections-panel",
  reader: "sefaria-reader",
};
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
  runNodeScript(
    path.join(playground, "scripts", "build-runtime-graph.mjs"),
    [],
    {
      cwd: playground,
    },
  );
  for (const base of ["/", "/sefaria-frontend-toolkit/"]) {
    await build({
      root: playground,
      base,
      build: { outDir: "dist", emptyOutDir: true },
    });
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
  await qualifyProjectRenders(page, name);

  const primaryBase = new URL(editorUrl).pathname === "/";
  if (name === "chromium" && primaryBase) {
    await qualifyPreviewSupersession(page);
  }
  await page.getByRole("button", { name: "Stop preview" }).click();
  const graphResult = await runGraphQualification(page, graph);
  assertEqual(graphResult.pureRegistered, false, `${name} pure registration`);
  assertEqual(graphResult.clientIdentity, true, `${name} client identity`);
  assertEqual(graphResult.entriesReady, true, `${name} public project entries`);
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

  if (name === "chromium" && primaryBase) {
    await qualifyInvalidProject(page, editorUrl);
    await qualifyProjectEditingAndInteraction(page, probeOrigin);
  } else if (name !== "chromium" && primaryBase) {
    await qualifyRepresentativeEditing(page, name);
  }
  if (name === "chromium") {
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

async function qualifyPreviewSupersession(page) {
  await page.evaluate(() => {
    const subtle = globalThis.crypto.subtle;
    const digest = subtle.digest.bind(subtle);
    Object.defineProperty(subtle, "digest", {
      configurable: true,
      value: (...arguments_) =>
        new Promise((resolve, reject) => {
          globalThis.setTimeout(() => {
            digest(...arguments_).then(resolve, reject);
          }, 250);
        }),
    });
  });

  await page.getByRole("button", { name: "Run" }).click();
  await page.getByRole("button", { name: "Stop preview" }).click();
  await page.waitForTimeout(350);
  assertEqual(
    await page.locator("#preview iframe").count(),
    0,
    "stopped in-flight preview stays stopped",
  );
  await page.getByText("Preview stopped.").waitFor();

  await page.getByRole("button", { name: "Run" }).click();
  await page.evaluate(() => {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("project", "unknown");
    globalThis.history.pushState(null, "", url);
    globalThis.dispatchEvent(new globalThis.PopStateEvent("popstate"));
  });
  await page.waitForTimeout(350);
  assertEqual(
    await page.locator("#preview iframe").count(),
    0,
    "invalid project supersedes in-flight preview",
  );
  await page
    .getByRole("alert")
    .filter({ hasText: 'Unknown project "unknown"' })
    .waitFor();
  await page.evaluate(() => {
    delete globalThis.crypto.subtle.digest;
  });
  await page.selectOption("#project-select", "source-card");
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
}

async function qualifyProjectRenders(page, name) {
  for (const [project, tag] of Object.entries(projects)) {
    await selectProject(page, project);
    const frame = previewFrame(page);
    await frame.locator(tag).waitFor({ state: "attached" });
    assertEqual(
      await frame.locator(tag).count(),
      1,
      `${name} ${project} element`,
    );
    assertEqual(
      await frame.getByRole("button", { name: "Load previews" }).count(),
      0,
      `${name} ${project} no network-bearing preview control`,
    );
  }
}

async function qualifyInvalidProject(page, editorUrl) {
  await page.goto(`${editorUrl}?project=not-maintained`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "Unknown project" })
    .waitFor();
  assertEqual(
    await page.locator("#preview iframe").count(),
    0,
    "unknown project executes no fallback preview",
  );
  assertEqual(
    await page.getByRole("button", { name: "Run" }).isDisabled(),
    true,
    "unknown project disables Run",
  );
  await page.selectOption("#project-select", "source-card");
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  assertEqual(
    new URL(page.url()).searchParams.get("project"),
    "source-card",
    "chooser recovers URL state",
  );
}

async function qualifyProjectEditingAndInteraction(page, destination) {
  for (const project of Object.keys(projects)) {
    await selectProject(page, project);
    await editEveryFile(page, project);
    await interactWithProject(page, project);
  }

  await selectProject(page, "source-card");
  await page.getByRole("button", { name: "Run" }).click();
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Jump to preview" }).click();
  await page.waitForFunction(
    () => globalThis.document.activeElement?.id === "preview-title",
  );
  assertEqual(
    await page.evaluate(() => globalThis.document.activeElement?.id),
    "preview-title",
    "jump-to-preview focus",
  );
  const previewTitlePosition = await page
    .locator("#preview-title")
    .boundingBox();
  const viewport = page.viewportSize();
  if (
    !previewTitlePosition ||
    !viewport ||
    previewTitlePosition.y < 0 ||
    previewTitlePosition.y + previewTitlePosition.height > viewport.height
  ) {
    throw new Error(
      `Jump-to-preview did not reveal the result heading: ${JSON.stringify(
        previewTitlePosition,
      )}.`,
    );
  }
  await page.getByRole("button", { name: "Back to editor" }).click();
  await page.waitForFunction(
    () => globalThis.document.activeElement?.id === "project-title",
  );
  assertEqual(
    await page.evaluate(() => globalThis.document.activeElement?.id),
    "project-title",
    "back-to-editor focus",
  );
  await page.getByRole("tab", { name: "HTML" }).focus();
  await page.keyboard.press("ArrowRight");
  assertEqual(
    await page.getByRole("tab", { name: "CSS" }).getAttribute("aria-selected"),
    "true",
    "keyboard tab selection",
  );
  const editor = page.locator(".cm-content");
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

async function editEveryFile(page, project) {
  const frame = previewFrame(page);
  const edits = {
    HTML: {
      suffix: `\n<p id="html-proof">HTML ${project}</p>`,
      prove: async () => frame.getByText(`HTML ${project}`).waitFor(),
    },
    CSS: {
      suffix: "\n.example { outline: 7px solid rgb(1, 2, 3); }",
      prove: async () =>
        assertEqual(
          await frame
            .locator(".example")
            .evaluate(
              (element) => globalThis.getComputedStyle(element).outlineWidth,
            ),
          "7px",
          `${project} CSS edit`,
        ),
    },
    JavaScript: {
      suffix: `\ndocument.body.insertAdjacentHTML("beforeend", '<p id="javascript-proof">JavaScript ${project}</p>');`,
      prove: async () => frame.getByText(`JavaScript ${project}`).waitFor(),
    },
  };
  for (const [tab, edit] of Object.entries(edits)) {
    await page.getByRole("tab", { name: tab }).click();
    const editor = page.locator(".cm-content");
    const maintained = projectSource(project, tab);
    await editor.fill(`${maintained}${edit.suffix}`);
    assertEqual(
      await frame.getByText(`${tab} ${project}`).count(),
      0,
      `${project} ${tab} draft isolation`,
    );
    await page.getByRole("button", { name: "Run" }).click();
    try {
      await page
        .getByText("Preview rendered with supplied data.")
        .waitFor({ timeout: 30_000 });
    } catch (error) {
      throw new Error(
        `${project} ${tab} edit did not render: ${await page.locator("#preview-status").textContent()} ${await page.locator("#diagnostic-list").textContent()}`,
        { cause: error },
      );
    }
    await edit.prove();
    assertEqual(
      await page.locator("#preview iframe").count(),
      1,
      `${project} single active preview`,
    );
    await page.getByRole("button", { name: "Reset" }).click();
    await page.getByText("Maintained source restored exactly.").waitFor();
  }
  await page.getByRole("button", { name: "Run" }).click();
  await page
    .getByText("Preview rendered with supplied data.")
    .waitFor({ timeout: 30_000 });
}

async function interactWithProject(page, project) {
  const frame = previewFrame(page);
  switch (project) {
    case "text-segment":
      await frame.locator("#edition").selectOption("english");
      await frame.getByText("en · ltr").waitFor();
      await frame
        .getByText(
          "He has shown you what is good: do justice, love mercy, and walk humbly with your God.",
        )
        .waitFor();
      break;
    case "bilingual-segment":
      await frame
        .getByRole("button", { name: "Show translation first" })
        .click();
      await frame.getByText("Translation side first.").waitFor();
      assertEqual(
        (await frame.locator('[lang="he"][dir="rtl"]').count()) > 0,
        true,
        "bilingual Hebrew direction",
      );
      assertEqual(
        (await frame.locator('[lang="en"][dir="ltr"]').count()) > 0,
        true,
        "bilingual English direction",
      );
      break;
    case "source-card":
      await frame
        .getByRole("button", { name: "Show connections for Micah 6:8" })
        .first()
        .click();
      await frame.getByText(/Selected Micah 6:8 at position/u).waitFor();
      await frame.locator("#vocalization").selectOption("none");
      await frame.locator("#vocalization").selectOption("taamim_and_nikkud");
      break;
    case "connections-panel":
      await frame.getByRole("button", { name: "More" }).click();
      await frame.getByText("Page 2").waitFor();
      await frame.getByLabel("Show captured previews").uncheck();
      await frame
        .getByText("Captured previews hidden without changing data.")
        .waitFor();
      break;
    case "reader": {
      await frame.locator("#vocalization").selectOption("none");
      const connectionsPane = frame.getByRole("button", {
        name: "Connections",
        exact: true,
      });
      if (await connectionsPane.isVisible()) {
        await connectionsPane.click();
      }
      await frame
        .getByRole("button", { name: /Open .* in context/u })
        .first()
        .click();
      await frame.getByText(/This supplied project does not cover/u).waitFor();
      await frame
        .getByRole("heading", { name: "Micah 6:8", exact: true })
        .waitFor();
      break;
    }
    default:
      throw new Error(`Missing interaction proof for ${project}.`);
  }
}

async function qualifyRepresentativeEditing(page, name) {
  await selectProject(page, "source-card");
  await page.getByRole("tab", { name: "HTML" }).click();
  const editor = page.locator(".cm-content");
  const maintained = projectSource("source-card", "HTML");
  await editor.fill(`${maintained}\n<p id="engine-proof">${name} edit</p>`);
  await page.getByRole("button", { name: "Run" }).click();
  await previewFrame(page).getByText(`${name} edit`).waitFor();
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByText("Maintained source restored exactly.").waitFor();
  await page.getByRole("button", { name: "Run" }).click();
  await previewFrame(page)
    .getByRole("button", {
      name: "Show connections for Micah 6:8",
    })
    .first()
    .press("Enter");
  await previewFrame(page)
    .getByText(/Selected Micah 6:8 at position/u)
    .waitFor();
}

async function selectProject(page, project) {
  if ((await page.locator("#project-select").inputValue()) !== project) {
    await page.selectOption("#project-select", project);
  }
  try {
    await page
      .getByText("Preview rendered with supplied data.")
      .waitFor({ timeout: 30_000 });
  } catch (error) {
    const status = await page.locator("#preview-status").textContent();
    const diagnostics = await page.locator("#diagnostic-list").textContent();
    throw new Error(`${project} did not render: ${status} ${diagnostics}`, {
      cause: error,
    });
  }
}

function previewFrame(page) {
  return page.frameLocator('iframe[title="Supplied-data component preview"]');
}

function projectSource(project, tab) {
  const directory = path.join(playground, "projects", project);
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "project.json"), "utf8"),
  );
  const kind = tab.toLowerCase();
  const file = manifest.files[kind];
  if (typeof file !== "string") {
    throw new Error(`Missing ${project} ${tab} maintained source.`);
  }
  return readFileSync(path.join(directory, file), "utf8");
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
      const source = await import("@arithmomaniac/sefaria-web-components/data-source");
      const textSegment = await import("@arithmomaniac/sefaria-web-components/text-segment");
      const bilingualSegment = await import("@arithmomaniac/sefaria-web-components/bilingual-segment");
      const connections = await import("@arithmomaniac/sefaria-web-components/connections-panel");
      const reader = await import("@arithmomaniac/sefaria-web-components/reader");
      const readerSession = await import("@arithmomaniac/sefaria-web-components/reader-session");
      const entriesReady = [
        source.configureSefariaDataSource,
        reader.resolveReaderSource,
        readerSession.createReaderSession,
      ].every((value) => typeof value === "function");
      const pureEntriesReady = [
        textSegment,
        bilingualSegment,
        pure,
        connections,
      ].every((value) => value !== null && typeof value === "object");
      const root = await import("@arithmomaniac/sefaria-web-components");
      const registered = customElements.get("sefaria-source-card");
      const second = await import("@arithmomaniac/sefaria-web-components");
      parent.postMessage({type:"graph-result", pureRegistered, clientIdentity:client.getResponseContract === validation.getResponseContract, entriesReady:entriesReady && pureEntriesReady, rootRegistered:registered === root.SefariaSourceCard, rootStable:second.SefariaSourceCard === registered},"*");
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
