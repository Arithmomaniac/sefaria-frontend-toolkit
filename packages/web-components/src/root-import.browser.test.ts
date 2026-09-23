import { expect, test, vi } from "vitest";

test("imports the browser root without realizing acquisition", async () => {
  vi.resetModules();
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);

  await expect(import("./index.js")).resolves.toMatchObject({
    SefariaBilingualSegment: expect.any(Function),
    SefariaConnectionsPanel: expect.any(Function),
    SefariaReader: expect.any(Function),
    SefariaRefLabel: expect.any(Function),
    SefariaTextSegment: expect.any(Function),
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("does not expose prepared state through root exports or element properties", async () => {
  const root = await import("./index.js");
  const forbiddenExports = [
    "createTextSegmentViewModel",
    "loadTextSegmentViewModel",
    "createTextSegmentController",
    "createBilingualSegmentViewModel",
    "loadBilingualSegmentViewModel",
    "createBilingualSegmentController",
    "createRefLabelViewModel",
    "loadRefLabelViewModel",
    "createRefLabelController",
    "createSourceCardViewModel",
    "loadSourceCardViewModel",
    "createSourceCardController",
    "createPopupViewModel",
    "loadPopupViewModel",
    "createPopupController",
    "createConnectionsViewModel",
    "loadConnectionsViewModel",
    "createConnectionsController",
    "createReaderViewModel",
  ];
  for (const name of forbiddenExports) {
    expect(root).not.toHaveProperty(name);
  }

  for (const elementClass of [
    root.SefariaTextSegment,
    root.SefariaBilingualSegment,
    root.SefariaRefLabel,
    root.SefariaSourceCard,
    root.SefariaPopup,
    root.SefariaConnectionsPanel,
    root.SefariaReader,
  ]) {
    expect(elementClass.elementProperties.has("viewModel")).toBe(false);
  }
});
