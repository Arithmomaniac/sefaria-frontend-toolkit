import * as popup from "@arithmomaniac/sefaria-web-components/popup";
import { expect, test } from "vitest";

test("keeps popup preparation private", () => {
  expect(Object.keys(popup)).toEqual([]);
});
