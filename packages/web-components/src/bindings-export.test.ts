import { expect, test } from "vitest";

test("exports registration-free DOM adapters from the bindings subpath", async () => {
  const bindings =
    await import("@arithmomaniac/sefaria-web-components/bindings");

  expect(bindings).toMatchObject({
    bindBilingualSegmentController: expect.any(Function),
    bindConnectionsController: expect.any(Function),
    bindPopupController: expect.any(Function),
    bindReaderController: expect.any(Function),
    bindRefLabelController: expect.any(Function),
    bindSourceCardController: expect.any(Function),
    bindTextSegmentController: expect.any(Function),
  });
  expect("customElements" in globalThis).toBe(false);
});
