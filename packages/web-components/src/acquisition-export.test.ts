import {
  configureSefariaAcquisition,
  type SefariaAcquisition,
  type SefariaAcquisitionCapability,
} from "@arithmomaniac/sefaria-web-components/acquisition";
import { expect, test } from "vitest";

test("exports DOM-free acquisition configuration and source types", () => {
  const capability: SefariaAcquisitionCapability = {};
  const acquisition: SefariaAcquisition = {
    kind: "capability",
    capability,
  };

  expect(configureSefariaAcquisition).toBeTypeOf("function");
  expect(acquisition.capability).toBe(capability);
});
