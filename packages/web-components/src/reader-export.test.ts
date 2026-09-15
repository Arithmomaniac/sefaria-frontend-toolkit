import { createReaderViewModel } from "@arithmomaniac/sefaria-web-components/reader";
import { expect, test } from "vitest";

test("the reader model subpath is DOM-free", () => {
  expect(createReaderViewModel).toBeTypeOf("function");
  expect(globalThis.document).toBeUndefined();
});
