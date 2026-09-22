import { expect, test } from "vitest";
import packageJson from "../package.json";

test("retires the reader-controller package export", () => {
  expect(packageJson.exports).not.toHaveProperty("./reader-controller");
});
