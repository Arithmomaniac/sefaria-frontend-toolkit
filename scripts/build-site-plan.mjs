import process from "node:process";

export const EXAMPLE_BUILDS = [
  {
    route: "playground",
    packageName: "@sefaria-example/playground",
    pages: ["index.html"],
    playground: true,
  },
  {
    route: "explorer",
    packageName: "@sefaria-example/explorer",
    pages: [
      "index.html",
      "authored.html",
      "ref-label.html",
      "text-segment.html",
      "bilingual-segment.html",
      "source-card.html",
      "connections.html",
    ],
  },
  {
    route: "reader",
    packageName: "@sefaria-example/reader",
    pages: ["index.html", "controlled.html"],
  },
  {
    route: "vanilla",
    packageName: "@sefaria-example/vanilla-vite",
    pages: ["index.html"],
  },
  {
    route: "react",
    packageName: "@sefaria-example/react-vite",
    pages: ["index.html"],
  },
  {
    route: "linked-article",
    packageName: "@sefaria-example/linked-article",
    pages: ["index.html"],
  },
  {
    route: "mcp-app",
    packageName: "@sefaria-example/mcp-app",
    pages: ["index.html", "live.html"],
    mcpApp: true,
  },
];

export const SITE_REQUIRED_FILES = [
  "index.html",
  "README.html",
  "learn/01-web-components.html",
  "learn/02-supplied-data.html",
  "learn/03-live-data.html",
  "learn/04-reader.html",
  "learn/05-customization.html",
  "learn/06-host-integration.html",
  "learn/react.html",
  ...EXAMPLE_BUILDS.flatMap(({ route, pages }) =>
    pages.map((page) => `examples/${route}/${page}`),
  ),
];

export function normalizeSiteBasePath(value = "/") {
  if (!value.startsWith("/") || !value.endsWith("/")) {
    throw new Error("Site base path must start and end with /.");
  }
  if (value.includes("//") || value.includes("..")) {
    throw new Error("Site base path must be a normalized absolute path.");
  }
  return value;
}

export function readSiteBasePath(args, environment = process.env) {
  const options = args.filter((argument) =>
    argument.startsWith("--site-base="),
  );
  if (options.length > 1) {
    throw new Error("--site-base may be supplied only once.");
  }
  return normalizeSiteBasePath(
    options[0]?.slice("--site-base=".length) ??
      environment.SITE_BASE_PATH ??
      "/",
  );
}

export function hasSameOriginSourceLink(html) {
  return /href=["']\/(?:[^"']*\/)?src\//u.test(html);
}

export function createSiteBuildSteps({ skipTypecheck, siteBasePath = "/" }) {
  const base = normalizeSiteBasePath(siteBasePath);
  const steps = [];
  if (!skipTypecheck) {
    for (const packageName of [
      "@arithmomaniac/sefaria-client",
      "@arithmomaniac/sefaria-text-transform",
      "@arithmomaniac/sefaria-web-components",
    ]) {
      steps.push({
        kind: "pnpm",
        args: ["--filter", packageName, "build"],
      });
    }
  }
  for (const example of EXAMPLE_BUILDS) {
    if (!skipTypecheck) {
      steps.push({
        kind: "pnpm",
        args: ["--filter", example.packageName, "typecheck"],
      });
    }
    steps.push(
      example.playground
        ? {
            kind: "playground",
            packageName: example.packageName,
            route: example.route,
            base: `${base}examples/${example.route}/`,
          }
        : example.mcpApp
          ? {
              kind: "mcp-app",
              packageName: example.packageName,
              route: example.route,
              build: !skipTypecheck,
            }
          : {
              kind: "vite",
              packageName: example.packageName,
              route: example.route,
              base: `${base}examples/${example.route}/`,
            },
    );
  }
  steps.push({ kind: "vitepress" });
  return steps;
}
