import * as textSegment from "@sefaria/web-components/text-segment";
import { expect, test } from "vitest";

test("keeps text-segment preparation private", () => {
  expect(Object.keys(textSegment)).toEqual([]);
});
