import * as sourceCard from "@sefaria/web-components/source-card";
import { expect, test } from "vitest";

test("keeps source-card preparation private", () => {
  expect(Object.keys(sourceCard)).toEqual([]);
});
