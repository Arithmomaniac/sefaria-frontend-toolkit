import { expect, test } from "vitest";
import packageJson from "../package.json";

test("retires the bindings package export", () => {
  expect(packageJson.exports).not.toHaveProperty("./bindings");
});
