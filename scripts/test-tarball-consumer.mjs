import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { preview } from "vite";
import YAML from "yaml";

import {
  isPathWithin,
  resolveModuleFromParent,
  validateConsumerLockfile,
  validateInstalledPath,
  validatePackedPackage,
} from "./tarball-consumer-validation.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const root = await mkdtemp(
  path.join(tmpdir(), "sefaria-toolkit-tarball-consumer-"),
);
const tarballs = path.join(root, "tarballs");
const consumers = {
  vanilla: path.join(root, "vanilla-consumer"),
  react: path.join(root, "react-consumer"),
  alpine: path.join(root, "alpine-consumer"),
};
const packageDefinitions = [
  {
    name: "@arithmomaniac/sefaria-client",
    directory: "client",
    filename: undefined,
    subpaths: [
      ".",
      "./client",
      "./contracts",
      "./errors",
      "./schemas",
      "./validation",
      "./validators",
    ],
  },
  {
    name: "@arithmomaniac/sefaria-text-transform",
    directory: "text-transform",
    filename: undefined,
    subpaths: ["."],
  },
  {
    name: "@arithmomaniac/sefaria-web-components",
    directory: "web-components",
    filename: undefined,
    subpaths: [
      ".",
      "./acquisition",
      "./bilingual-segment",
      "./connections-panel",
      "./popup",
      "./reader",
      "./reader-session",
      "./ref-label",
      "./source-card",
      "./text-segment",
    ],
  },
];

if (isPathWithin(repository, root) || root === repository) {
  throw new Error(
    "Tarball consumer must be staged outside the producer repository.",
  );
}

try {
  await mkdir(tarballs, { recursive: true });
  for (const packageDefinition of packageDefinitions) {
    const before = new Set(await readdir(tarballs));
    run("pnpm", [
      "--filter",
      packageDefinition.name,
      "pack",
      "--pack-destination",
      tarballs,
    ]);
    const emitted = (await readdir(tarballs)).filter(
      (filename) => filename.endsWith(".tgz") && !before.has(filename),
    );
    if (emitted.length !== 1) {
      throw new Error(
        `${packageDefinition.name} emitted ${emitted.length} tarballs: ${emitted.join(", ")}`,
      );
    }
    packageDefinition.filename = emitted[0];
    await inspectTarball(packageDefinition);
  }

  await stageConsumer({
    consumer: consumers.vanilla,
    example: "vanilla-vite",
    name: "sefaria-toolkit-tarball-vanilla-consumer",
  });
  await stageConsumer({
    consumer: consumers.react,
    example: "react-vite",
    name: "sefaria-toolkit-tarball-react-consumer",
  });
  await stageConsumer({
    consumer: consumers.alpine,
    example: "alpine-vite",
    name: "sefaria-toolkit-tarball-alpine-consumer",
  });
  for (const consumer of Object.values(consumers)) {
    run("pnpm", ["install", "--lockfile-only"], consumer);
    run("pnpm", ["install", "--frozen-lockfile"], consumer);
    await inspectConsumerResolution(consumer);
  }

  await rm(tarballs, { force: true, recursive: true });
  run("pnpm", ["build"], consumers.vanilla);
  run("pnpm", ["build"], consumers.react);
  run("pnpm", ["build"], consumers.alpine);
  await smokeVanillaChromium();
  await smokeReactChromium();
  await smokeAlpineChromium();

  process.stdout.write(
    "Tarball consumers: manifests, contents, resolution, all exports, vanilla, React, and Alpine builds, Node paths, and Chromium smokes passed.\n",
  );
} finally {
  await rm(root, { force: true, recursive: true });
}

async function inspectTarball(packageDefinition) {
  if (packageDefinition.filename === undefined) {
    throw new Error(`${packageDefinition.name} did not emit a tarball.`);
  }
  const tarball = path.join(tarballs, packageDefinition.filename);
  await access(tarball);
  const manifest = JSON.parse(
    capture("tar", ["-xOf", tarball, "package/package.json"]),
  );
  const contents = new Set(
    capture("tar", ["-tf", tarball]).split(/\r?\n/u).filter(Boolean),
  );
  const customElements =
    packageDefinition.name === "@arithmomaniac/sefaria-web-components"
      ? JSON.parse(
          capture("tar", ["-xOf", tarball, "package/custom-elements.json"]),
        )
      : undefined;
  validatePackedPackage({
    definition: packageDefinition,
    manifest,
    contents,
    customElements,
  });
}

async function stageConsumer({ consumer, example, name }) {
  await mkdir(path.join(consumer, "src"), { recursive: true });
  for (const filename of ["index.html", "tsconfig.json"]) {
    await cp(
      path.join(repository, "examples", example, filename),
      path.join(consumer, filename),
    );
  }
  await cp(
    path.join(repository, "examples", example, "src"),
    path.join(consumer, "src"),
    { recursive: true },
  );
  const fileDependency = (filename) => {
    if (filename === undefined) {
      throw new Error("A package tarball filename is missing.");
    }
    return `file:../tarballs/${filename}`;
  };
  const exampleManifest = JSON.parse(
    await readFile(
      path.join(repository, "examples", example, "package.json"),
      "utf8",
    ),
  );
  const toolkitNames = new Set(
    packageDefinitions.map((definition) => definition.name),
  );
  const thirdPartyDependencies = Object.fromEntries(
    Object.entries(exampleManifest.dependencies ?? {}).filter(
      ([dependency]) => !toolkitNames.has(dependency),
    ),
  );
  const packageJson = {
    name,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      build: "tsc -p tsconfig.json && vite build",
      preview: "vite preview",
    },
    dependencies: {
      ...thirdPartyDependencies,
      ...Object.fromEntries(
        packageDefinitions.map((entry) => [
          entry.name,
          fileDependency(entry.filename),
        ]),
      ),
    },
    devDependencies: {
      ...(exampleManifest.devDependencies ?? {}),
      typescript: "7.0.2",
      vite: "^8.2.1",
    },
  };
  await writeFile(
    path.join(consumer, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  const overrides = Object.fromEntries(
    packageDefinitions.map((entry) => [
      entry.name,
      fileDependency(entry.filename),
    ]),
  );
  await writeFile(
    path.join(consumer, "pnpm-workspace.yaml"),
    YAML.stringify({
      overrides,
      allowBuilds: { esbuild: true },
    }),
  );
}

async function inspectConsumerResolution(consumer) {
  const lockfilePath = path.join(consumer, "pnpm-lock.yaml");
  const lockfile = await readFile(lockfilePath, "utf8");
  validateConsumerLockfile(lockfile, packageDefinitions);
  const canonicalConsumer = await realpath(consumer);
  const canonicalRepository = await realpath(repository);

  for (const packageDefinition of packageDefinitions) {
    const resolved = capture(
      "node",
      [
        "--input-type=module",
        "-e",
        `console.log(import.meta.resolve(${JSON.stringify(packageDefinition.name)}))`,
      ],
      consumer,
    ).trim();
    const installedPath = await realpath(fileURLToPath(resolved));
    validateInstalledPath({
      packageName: packageDefinition.name,
      installedPath,
      consumer: canonicalConsumer,
      repository: canonicalRepository,
    });
  }

  const allNodeSafeImports = [
    "@arithmomaniac/sefaria-client",
    "@arithmomaniac/sefaria-client/client",
    "@arithmomaniac/sefaria-client/contracts",
    "@arithmomaniac/sefaria-client/errors",
    "@arithmomaniac/sefaria-client/schemas",
    "@arithmomaniac/sefaria-client/validation",
    "@arithmomaniac/sefaria-client/validators",
    "@arithmomaniac/sefaria-text-transform",
    "@arithmomaniac/sefaria-web-components/acquisition",
    "@arithmomaniac/sefaria-web-components/bilingual-segment",
    "@arithmomaniac/sefaria-web-components/connections-panel",
    "@arithmomaniac/sefaria-web-components/popup",
    "@arithmomaniac/sefaria-web-components/reader",
    "@arithmomaniac/sefaria-web-components/reader-session",
    "@arithmomaniac/sefaria-web-components/ref-label",
    "@arithmomaniac/sefaria-web-components/source-card",
    "@arithmomaniac/sefaria-web-components/text-segment",
  ];
  capture(
    "node",
    [
      "--input-type=module",
      "-e",
      [
        `await Promise.all(${JSON.stringify(allNodeSafeImports)}.map((specifier) => import(specifier)));`,
        "if ('customElements' in globalThis) throw new Error('DOM registration leaked into Node-safe imports');",
      ].join(""),
    ],
    consumer,
  );
  capture(
    "node",
    [
      "--input-type=module",
      "-e",
      [
        "const clientModule = await import('@arithmomaniac/sefaria-client');",
        `const namespaceNames = ${JSON.stringify([
          "text",
          "index",
          "related",
          "calendars",
          "lexicon",
          "topic",
          "term",
          "sheets",
          "collections",
          "misc",
          "ref",
        ])};`,
        "for (const name of namespaceNames) {",
        "  if (typeof clientModule[name] !== 'object') throw new Error(`Missing client namespace: ${name}`);",
        "}",
        "if ('getV3Texts' in clientModule) throw new Error('Flat endpoint export getV3Texts is still public');",
        "let requestCount = 0;",
        "const client = clientModule.createSefariaClient({",
        "  cache: false,",
        "  fetch: async (request) => {",
        "    requestCount += 1;",
        "    const url = new URL(request.url);",
        "    if (url.pathname.startsWith('/api/texts/versions/')) {",
        "      return new Response('[]', { headers: { 'content-type': 'application/json' } });",
        "    }",
        "    if (url.pathname.startsWith('/api/img-gen/')) {",
        "      return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });",
        "    }",
        "    throw new Error(`Unexpected client request: ${url.pathname}`);",
        "  },",
        "});",
        "const json = await clientModule.text.getTextVersions({ client, path: { tref: 'Micah 6:8' } });",
        "if (!Array.isArray(json.data)) throw new Error('Namespaced JSON request did not return validated data');",
        "const png = await clientModule.misc.getImgGen({ client, path: { tref: 'Micah 6:8' } });",
        "if (!(png.data instanceof Blob) || png.data.type !== 'image/png') throw new Error('Namespaced PNG request did not return an image Blob');",
        "if (requestCount !== 2) throw new Error(`Expected two package requests, received ${requestCount}`);",
      ].join("\n"),
    ],
    consumer,
  );

  const uiSourceCard = capture(
    "node",
    [
      "--input-type=module",
      "-e",
      "console.log(import.meta.resolve('@arithmomaniac/sefaria-web-components/source-card'))",
    ],
    consumer,
  ).trim();
  const transitiveClient = resolveModuleFromParent({
    specifier: "@arithmomaniac/sefaria-client",
    parentUrl: uiSourceCard,
    cwd: consumer,
  });
  validateInstalledPath({
    packageName:
      "@arithmomaniac/sefaria-web-components transitive @arithmomaniac/sefaria-client",
    installedPath: await realpath(fileURLToPath(transitiveClient)),
    consumer: canonicalConsumer,
    repository: canonicalRepository,
  });
}

async function smokeVanillaChromium() {
  const fixture = JSON.parse(
    await readFile(
      path.join(consumers.vanilla, "src", "micah-6-8.json"),
      "utf8",
    ),
  );
  const server = await preview({
    root: consumers.vanilla,
    preview: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Vite preview did not expose its assigned address.");
    }
    const url = `http://127.0.0.1:${address.port}/`;
    await waitForServer(url);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.route(
        "https://www.sefaria.org/api/v3/texts/**",
        async (route) => {
          const request = route.request();
          const requestUrl = new globalThis.URL(request.url());
          const expectedQuery = [
            ["version", "primary"],
            ["version", "translation"],
            ["return_format", "default"],
          ];
          if (
            request.method() !== "GET" ||
            decodeURIComponent(requestUrl.pathname) !==
              "/api/v3/texts/Micah 6:8" ||
            JSON.stringify([...requestUrl.searchParams.entries()]) !==
              JSON.stringify(expectedQuery)
          ) {
            throw new Error(
              `Unexpected packed vanilla request: ${request.method()} ${requestUrl}`,
            );
          }
          await route.fulfill({ json: fixture });
        },
      );
      await page.addInitScript(() => {
        const originalFetch = globalThis.fetch;
        globalThis.__exampleGlobalFetchCount = 0;
        globalThis.fetch = (...args) => {
          globalThis.__exampleGlobalFetchCount += 1;
          return originalFetch(...args);
        };
      });
      await page.goto(url);
      await page.locator("#status[data-request-count='0']").waitFor();
      const initial = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        return {
          state: card?.status,
          globalFetchCount: globalThis.__exampleGlobalFetchCount,
        };
      });
      if (initial.state !== "ready" || initial.globalFetchCount !== 0) {
        throw new Error(
          `Vanilla supplied-data render was not request-free: ${JSON.stringify(initial)}`,
        );
      }
      await page.locator("#load-live").click();
      await page
        .locator("#status[data-request-count='1']")
        .filter({ hasText: "Committed canonical reference Micah 6:8" })
        .waitFor();
      const result = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        return {
          registered:
            globalThis.customElements.get("sefaria-source-card") !== undefined,
          registeredTags: [
            "sefaria-bilingual-segment",
            "sefaria-connections-panel",
            "sefaria-popup",
            "sefaria-reader",
            "sefaria-ref-label",
            "sefaria-source-card",
            "sefaria-text-segment",
          ].filter(
            (tagName) => globalThis.customElements.get(tagName) !== undefined,
          ),
          state: card?.status,
          text: card?.shadowRoot?.textContent,
          globalFetchCount: globalThis.__exampleGlobalFetchCount,
        };
      });
      if (
        !result.registered ||
        result.registeredTags.length !== 7 ||
        result.state !== "ready" ||
        result.globalFetchCount !== 1 ||
        !result.text?.includes("Deterministic example Hebrew") ||
        !result.text.includes("Deterministic example translation")
      ) {
        throw new Error(
          `Unexpected Chromium result: ${JSON.stringify(result)}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

async function smokeReactChromium() {
  const consumer = consumers.react;
  const fixture = JSON.parse(
    await readFile(path.join(consumer, "src", "micah-6-8.json"), "utf8"),
  );
  const server = await preview({
    root: consumer,
    preview: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error(
        "React Vite preview did not expose its assigned address.",
      );
    }
    const url = `http://127.0.0.1:${address.port}/`;
    await waitForServer(url);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      let requestCount = 0;
      await page.route(
        "https://www.sefaria.org/api/v3/texts/**",
        async (route) => {
          const request = route.request();
          const requestUrl = new globalThis.URL(request.url());
          const expectedQuery = [
            ["version", "primary"],
            ["version", "translation"],
            ["return_format", "default"],
          ];
          const requestPath = decodeURIComponent(requestUrl.pathname);
          if (
            request.method() !== "GET" ||
            requestUrl.origin !== "https://www.sefaria.org" ||
            (requestPath !== "/api/v3/texts/Micah 6:8" &&
              requestPath !== "/api/v3/texts/micah 6:8") ||
            JSON.stringify([...requestUrl.searchParams.entries()]) !==
              JSON.stringify(expectedQuery)
          ) {
            throw new Error(
              `Unexpected packed React request: ${request.method()} ${requestUrl}`,
            );
          }
          requestCount += 1;
          await route.fulfill({ json: fixture });
        },
      );
      await page.goto(url);
      await page.locator("sefaria-source-card").waitFor();
      const initial = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        Object.assign(globalThis, { __packedReactCard: card });
        return {
          registered:
            globalThis.customElements.get("sefaria-source-card") !== undefined,
          state: card?.status,
          serialized: card?.getAttribute("viewModel"),
          status:
            globalThis.document.querySelector("#request-status")?.textContent,
        };
      });
      if (
        !initial.registered ||
        initial.state !== "ready" ||
        initial.serialized !== null ||
        !initial.status?.includes("zero live loads") ||
        requestCount !== 0
      ) {
        throw new Error(
          `Unexpected packed React initial state: ${JSON.stringify(initial)}`,
        );
      }

      await page.locator("#theme-toggle").click();
      await page.locator("#preview-width").fill("520");
      const visual = await page.evaluate(() => ({
        stable:
          globalThis.document.querySelector("sefaria-source-card") ===
          globalThis.__packedReactCard,
        theme: globalThis.document.querySelector("#preview")?.dataset.theme,
      }));
      if (!visual.stable || visual.theme !== "dark" || requestCount !== 0) {
        throw new Error(
          `Packed React visual controls changed request ownership: ${JSON.stringify(visual)}`,
        );
      }

      await page.locator('input[name="tref"]').fill("micah 6:8");
      await page.locator("#load-live").click();
      await page
        .locator("#request-status")
        .filter({ hasText: "Committed canonical reference Micah 6:8" })
        .waitFor();
      await page.evaluate(async () => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        if (!card) throw new Error("Packed React source card is missing.");
        await card.updateComplete;
        const button = card.shadowRoot?.querySelector(
          'button[aria-label="Show connections for Micah 6:8"]',
        );
        if (!(button instanceof globalThis.HTMLButtonElement)) {
          throw new Error("Packed React selection control is missing.");
        }
        button.click();
      });
      await page
        .locator("#selected-ref")
        .filter({ hasText: "React received selection: Micah 6:8" })
        .waitFor();
      const loaded = await page.evaluate(() => {
        const card = globalThis.document.querySelector("sefaria-source-card");
        return {
          stable: card === globalThis.__packedReactCard,
          state: card?.status,
          selected: card?.selectedPosition,
          eventText:
            globalThis.document.querySelector("#selected-ref")?.textContent,
          requestText:
            globalThis.document.querySelector("#request-count")?.textContent,
        };
      });
      if (
        requestCount !== 1 ||
        !loaded.stable ||
        loaded.state !== "ready" ||
        JSON.stringify(loaded.selected) !== "[]" ||
        !loaded.eventText?.includes("React received selection: Micah 6:8") ||
        !loaded.requestText?.includes("1")
      ) {
        throw new Error(
          `Unexpected packed React live result: ${JSON.stringify(loaded)}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

async function smokeAlpineChromium() {
  const consumer = consumers.alpine;
  const fixture = JSON.parse(
    await readFile(path.join(consumer, "src", "micah-6-8.json"), "utf8"),
  );
  const server = await preview({
    root: consumer,
    preview: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error(
        "Alpine Vite preview did not expose its assigned address.",
      );
    }
    const url = `http://127.0.0.1:${address.port}/`;
    await waitForServer(url);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      let requestCount = 0;
      await page.route(
        "https://www.sefaria.org/api/v3/texts/**",
        async (route) => {
          const request = route.request();
          const requestUrl = new globalThis.URL(request.url());
          const requestPath = decodeURIComponent(requestUrl.pathname);
          const expectedQuery = [
            ["version", "primary"],
            ["version", "translation"],
            ["return_format", "default"],
          ];
          if (
            request.method() !== "GET" ||
            requestUrl.origin !== "https://www.sefaria.org" ||
            (requestPath !== "/api/v3/texts/Micah 6:8" &&
              requestPath !== "/api/v3/texts/micah 6:8") ||
            JSON.stringify([...requestUrl.searchParams.entries()]) !==
              JSON.stringify(expectedQuery)
          ) {
            throw new Error(
              `Unexpected packed Alpine request: ${request.method()} ${requestUrl}`,
            );
          }
          requestCount += 1;
          await route.fulfill({ json: fixture });
        },
      );
      await page.goto(url);
      const card = page.locator("sefaria-source-card");
      await card.waitFor();
      await page
        .locator("#request-status")
        .filter({ hasText: "zero live loads" })
        .waitFor();
      const initial = await page.evaluate(() => {
        const element = globalThis.document.querySelector(
          "sefaria-source-card",
        );
        Object.assign(globalThis, { __packedAlpineCard: element });
        return {
          registered:
            globalThis.customElements.get("sefaria-source-card") !== undefined,
          state: element?.status,
          serialized: element?.getAttribute("viewModel"),
        };
      });
      if (
        !initial.registered ||
        initial.state !== "ready" ||
        initial.serialized !== null ||
        requestCount !== 0
      ) {
        throw new Error(
          `Unexpected packed Alpine initial state: ${JSON.stringify(initial)}`,
        );
      }

      await page.locator("#layout").selectOption("stacked");
      await page.locator("#side-order").selectOption("translation-first");
      await page.locator("#vocalization-mode").selectOption("none");
      const visual = await page.evaluate(() => {
        const element = globalThis.document.querySelector(
          "sefaria-source-card",
        );
        return {
          stable: element === globalThis.__packedAlpineCard,
          layout: element?.layout,
          sideOrder: element?.sideOrder,
          vocalizationMode: element?.vocalizationMode,
          selectedAttribute: element?.getAttribute("selectedPosition"),
        };
      });
      if (
        !visual.stable ||
        visual.layout !== "stacked" ||
        visual.sideOrder !== "translation-first" ||
        visual.vocalizationMode !== "none" ||
        visual.selectedAttribute !== null ||
        requestCount !== 0
      ) {
        throw new Error(
          `Packed Alpine visual controls changed request ownership: ${JSON.stringify(visual)}`,
        );
      }

      await page.locator('input[name="tref"]').fill("micah 6:8");
      await page.locator("#load-live").click();
      await page
        .locator("#request-status")
        .filter({ hasText: "Committed canonical reference Micah 6:8" })
        .waitFor();
      await page.evaluate(async () => {
        const element = globalThis.document.querySelector(
          "sefaria-source-card",
        );
        if (!element) throw new Error("Packed Alpine source card is missing.");
        await element.updateComplete;
        const button = element.shadowRoot?.querySelector(
          'button[aria-label="Show connections for Micah 6:8"]',
        );
        if (!(button instanceof globalThis.HTMLButtonElement)) {
          throw new Error("Packed Alpine selection control is missing.");
        }
        button.click();
      });
      await page
        .locator("#selected-ref")
        .filter({ hasText: "Alpine received selection: Micah 6:8" })
        .waitFor();
      const loaded = await page.evaluate(() => {
        const element = globalThis.document.querySelector(
          "sefaria-source-card",
        );
        return {
          stable: element === globalThis.__packedAlpineCard,
          state: element?.status,
          selected: element?.selectedPosition,
          eventText:
            globalThis.document.querySelector("#selected-ref")?.textContent,
          requestText:
            globalThis.document.querySelector("#request-count")?.textContent,
          committedText:
            globalThis.document.querySelector("#committed-ref")?.textContent,
        };
      });
      if (
        requestCount !== 1 ||
        !loaded.stable ||
        loaded.state !== "ready" ||
        JSON.stringify(loaded.selected) !== "[]" ||
        !loaded.eventText?.includes("Alpine received selection: Micah 6:8") ||
        !loaded.requestText?.includes("1") ||
        !loaded.committedText?.includes("Micah 6:8")
      ) {
        throw new Error(
          `Unexpected packed Alpine live result: ${JSON.stringify(loaded)}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await globalThis.fetch(url);
      if (response.ok) return;
    } catch {
      // The bounded preview startup window is still open.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function run(command, args, cwd = repository) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.executable, spec.args, {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}.`,
    );
  }
}

function capture(command, args, cwd = repository) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.status}: ${result.stderr}`,
    );
  }
  return result.stdout;
}

function commandSpec(command, args) {
  if (process.platform !== "win32" || command !== "pnpm") {
    return { executable: command, args };
  }
  return {
    executable: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", `pnpm ${args.join(" ")}`],
  };
}
