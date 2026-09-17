import { expect, test, vi } from "vitest";

vi.mock("@arithmomaniac/sefaria-client", () => {
  throw new Error(
    "The browser root must not load @arithmomaniac/sefaria-client.",
  );
});

test("imports the browser root without the request-capable client", async () => {
  vi.resetModules();

  await expect(import("./index.js")).resolves.toMatchObject({
    SefariaBilingualSegment: expect.any(Function),
    SefariaConnectionsPanel: expect.any(Function),
    SefariaReader: expect.any(Function),
    SefariaRefLabel: expect.any(Function),
    SefariaTextSegment: expect.any(Function),
  });
});
