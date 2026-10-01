import {
  configureSefariaDataSource,
  type SefariaDataSource,
  type SefariaDataLoader,
} from "@arithmomaniac/sefaria-web-components/data-source";
import * as root from "@arithmomaniac/sefaria-web-components";
import manifest from "../package.json" with { type: "json" };
import { expect, test } from "vitest";

test("exports DOM-free data-source configuration and source types", () => {
  const loader: SefariaDataLoader = {};
  const source: SefariaDataSource = {
    kind: "custom",
    loader,
  };

  expect(configureSefariaDataSource).toBeTypeOf("function");
  expect(source.loader).toBe(loader);
});

test("does not expose the retired acquisition entry point or names", () => {
  expect(root).not.toHaveProperty("configureSefariaAcquisition");
  expect(root).not.toHaveProperty("SefariaAcquisition");
  expect(root).not.toHaveProperty("SefariaAcquisitionCapability");
  expect(manifest.exports).not.toHaveProperty("./acquisition");
  expect(manifest.exports).toHaveProperty("./data-source");
});
