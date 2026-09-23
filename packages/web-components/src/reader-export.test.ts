import {
  createSefariaReaderDataSource,
  resolveReaderSource,
} from "@arithmomaniac/sefaria-web-components/reader";
import * as reader from "@arithmomaniac/sefaria-web-components/reader";
import { expect, test } from "vitest";

test("exports DOM-free raw Reader acquisition and qualification", () => {
  expect(Object.keys(reader).sort()).toEqual([
    "createSefariaReaderDataSource",
    "resolveReaderSource",
  ]);
  expect(createSefariaReaderDataSource).toBeTypeOf("function");
  expect(resolveReaderSource).toBeTypeOf("function");
  expect(globalThis.document).toBeUndefined();
});
