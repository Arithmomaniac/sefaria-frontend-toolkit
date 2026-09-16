import path from "node:path";

import { expect, test } from "vitest";

import { startSitePreview } from "../scripts/site-preview-server.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("owns a distinct assigned port for each concurrent preview", async () => {
  const first = await startSitePreview({ root });
  const second = await startSitePreview({ root });
  try {
    expect(first.origin).not.toBe(second.origin);
    await Promise.all([first.waitUntilReady(), second.waitUntilReady()]);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

test("serves a project-path build from its configured base", async () => {
  const preview = await startSitePreview({
    root,
    siteBasePath: "/sefaria-frontend-toolkit/",
  });
  try {
    expect(preview.siteUrl).toBe(`${preview.origin}/sefaria-frontend-toolkit/`);
    await preview.waitUntilReady();
  } finally {
    await preview.close();
  }
});
