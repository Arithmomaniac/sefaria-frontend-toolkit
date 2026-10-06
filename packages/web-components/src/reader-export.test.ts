import {
  createSefariaReaderRecordLoader,
  resolveReaderSource,
} from "@sefaria/web-components/reader";
import * as reader from "@sefaria/web-components/reader";
import { expect, test } from "vitest";

test("exports DOM-free raw Reader source and qualification", () => {
  expect(Object.keys(reader).sort()).toEqual([
    "createSefariaReaderRecordLoader",
    "resolveReaderSource",
  ]);
  expect(createSefariaReaderRecordLoader).toBeTypeOf("function");
  expect(resolveReaderSource).toBeTypeOf("function");
  expect(globalThis.document).toBeUndefined();
});
