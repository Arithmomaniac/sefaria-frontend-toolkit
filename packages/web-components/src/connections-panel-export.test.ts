import { expect, test } from "vitest";
import * as connections from "@arithmomaniac/sefaria-web-components/connections-panel";

test("the non-DOM subpath exposes only public mechanics in Node", () => {
  expect(Object.keys(connections)).toEqual(["CONNECTIONS_PAGE_SIZE"]);
  expect(typeof globalThis.document).toBe("undefined");
});
