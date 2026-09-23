import { createReaderSession } from "@arithmomaniac/sefaria-web-components/reader-session";
import * as readerSession from "@arithmomaniac/sefaria-web-components/reader-session";
import { expect, test } from "vitest";

test("the reader-session subpath exposes the semantic raw facade", () => {
  expect(Object.keys(readerSession)).toEqual(["createReaderSession"]);
  expect(createReaderSession).toBeTypeOf("function");
  expect(globalThis.document).toBeUndefined();
});
