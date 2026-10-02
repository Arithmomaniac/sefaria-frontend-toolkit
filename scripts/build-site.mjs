import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { spawnSync } from "node:child_process";

import { build } from "vite";

import {
  createSiteBuildSteps,
  hasSameOriginSourceLink,
  readSiteBasePath,
  SITE_REQUIRED_FILES,
} from "./build-site-plan.mjs";
import {
  canReuseSiteBuild,
  createSiteBuildKey,
  writeSiteBuildKey,
} from "./build-site-cache.mjs";
import { buildScriptSource } from "./build-script-source.mjs";
import { runNodeScript, runPackageTool } from "./node-tool.mjs";
import { legacyRedirects } from "../docs/.vitepress/redirects.mjs";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "dist", "site");
const stagedPublic = path.join(root, "dist", "site-public");
const skipTypecheck = process.argv.includes("--skip-typecheck");
const examplesOnly = process.argv.includes("--examples-only");
const force = process.argv.includes("--force");
const siteBasePath = readSiteBasePath(process.argv.slice(2));
const buildKey =
  !skipTypecheck && !examplesOnly
    ? await createSiteBuildKey({
        root,
        siteBasePath,
        options: { skipTypecheck, examplesOnly },
      })
    : undefined;

if (
  buildKey !== undefined &&
  !force &&
  (await canReuseSiteBuild({
    siteDirectory: site,
    requiredFiles: SITE_REQUIRED_FILES,
    expectedKey: buildKey,
  }))
) {
  console.log("Reusing dist/site for matching build key.");
  process.exit(0);
}

await rm(stagedPublic, { recursive: true, force: true });
await mkdir(path.join(stagedPublic, "examples"), { recursive: true });
await mkdir(path.join(stagedPublic, "images"), { recursive: true });
if (!examplesOnly) {
  await rm(site, { recursive: true, force: true });
}

for (const step of createSiteBuildSteps({ skipTypecheck, siteBasePath })) {
  if (step.kind === "pnpm") {
    runPnpm(step.args);
    continue;
  }
  if (step.kind === "script-source") {
    await buildScriptSource({
      destination: path.join(stagedPublic, "cdn", "local"),
    });
    continue;
  }
  if (step.kind === "vite") {
    const destination = path.join(stagedPublic, "examples", step.route);
    await buildExample(step, destination);
    continue;
  }
  if (step.kind === "mcp-app") {
    const destination = path.join(stagedPublic, "examples", step.route);
    await mkdir(destination, { recursive: true });
    if (step.build) {
      runPnpm(["--filter", step.packageName, "build"]);
    }
    await copyFile(
      path.join(root, "examples", "mcp-app", "dist", "host", "live.html"),
      path.join(destination, "index.html"),
    );
    await copyFile(
      path.join(root, "examples", "mcp-app", "dist", "host", "live.html"),
      path.join(destination, "live.html"),
    );
    await copyFile(
      path.join(root, "examples", "mcp-app", "dist", "host", "mcp-app.html"),
      path.join(destination, "mcp-app.html"),
    );
    await cp(
      path.join(root, "examples", "mcp-app", "dist", "host", "assets"),
      path.join(destination, "assets"),
      { recursive: true },
    );
    continue;
  }
  if (step.kind === "playground") {
    const destination = path.join(stagedPublic, "examples", step.route);
    const playground = path.join(root, "examples", "playground");
    runNodeScript(
      path.join(playground, "scripts", "build-runtime-graph.mjs"),
      [],
      {
        cwd: playground,
      },
    );
    await buildExample(step, destination);
    continue;
  }
  if (!examplesOnly) {
    // EP7: llms.txt lists the site's pages, so it is rendered from the same sources.
    runPackageTool(
      "tsx",
      "tsx",
      ["scripts/reference/llms.ts", path.join(stagedPublic, "llms.txt")],
      { cwd: root },
    );
    runPackageTool("vitepress", "vitepress", ["build", "docs"], {
      cwd: root,
      env: { ...process.env, SITE_BASE_PATH: siteBasePath },
    });
  }
}

async function buildExample(step, destination) {
  const directory = step.packageName.slice("@sefaria-example/".length);
  await build({
    root: path.join(root, "examples", directory),
    base: step.base,
    build: { outDir: destination, emptyOutDir: true },
  });
}

if (!examplesOnly) {
  for (const relativePath of SITE_REQUIRED_FILES) {
    await access(path.join(site, relativePath));
  }
  await writeLegacyRedirects();
  await verifyBuiltRoutes();
  if (buildKey !== undefined) {
    await writeSiteBuildKey(site, buildKey);
  }
}

function runPnpm(args, env = process.env) {
  const windows = process.platform === "win32";
  const executable = windows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const executableArgs = windows
    ? ["/d", "/s", "/c", `pnpm ${args.map(quoteArgument).join(" ")}`]
    : args;
  const result = spawnSync(executable, executableArgs, {
    windowsHide: true,
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed.`);
  }
}

function quoteArgument(value) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

async function verifyBuiltRoutes() {
  for (const relativePath of SITE_REQUIRED_FILES.filter((file) =>
    file.endsWith(".html"),
  )) {
    const html = await readFile(path.join(site, relativePath), "utf8");
    if (html.length < 100 || !/<html[\s>]/iu.test(html)) {
      throw new Error(`${relativePath} is not a rendered HTML document.`);
    }
  }

  const authored = await readFile(
    path.join(site, "examples", "explorer", "authored.html"),
    "utf8",
  );
  if (hasSameOriginSourceLink(authored)) {
    throw new Error(
      "The authored explorer contains a same-origin source link.",
    );
  }
}

async function writeLegacyRedirects() {
  for (const [source, target] of Object.entries(legacyRedirects)) {
    await access(path.join(site, target.slice(1)));
    const destination = path.join(site, source);
    await mkdir(path.dirname(destination), { recursive: true });
    const href = `${siteBasePath}${target.slice(1)}`;
    const title = `Redirecting to ${href}`;
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=${href}">
    <link rel="canonical" href="${href}">
    <title>${title}</title>
  </head>
  <body>
    <p>This page moved to <a href="${href}">${href}</a>.</p>
  </body>
</html>
`;
    await writeFile(destination, html, "utf8");
  }
}
