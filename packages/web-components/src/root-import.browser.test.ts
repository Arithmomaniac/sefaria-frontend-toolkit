import { expect, test, vi } from "vitest";

vi.mock("@arithmomaniac/sefaria-client", () => {
  throw new Error(
    "The browser root must not load @arithmomaniac/sefaria-client.",
  );
});
vi.mock("@arithmomaniac/sefaria-text-transform", () => {
  throw new Error(
    "The browser root must not load @arithmomaniac/sefaria-text-transform.",
  );
});

test("imports the browser root without factory runtime dependencies", async () => {
  vi.resetModules();

  await expect(import("./index.js")).resolves.toMatchObject({
    SefariaBilingualSegment: expect.any(Function),
    SefariaConnectionsPanel: expect.any(Function),
    SefariaReader: expect.any(Function),
    SefariaRefLabel: expect.any(Function),
    SefariaTextSegment: expect.any(Function),
  });
});
