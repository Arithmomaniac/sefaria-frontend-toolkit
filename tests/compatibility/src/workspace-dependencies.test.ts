import type { SefariaClientOptions } from "@arithmomaniac/sefaria-client";
import type { VocalizationOptions } from "@arithmomaniac/sefaria-text-transform";
import { expect, test } from "vitest";

import "./no-network.js";

test("composes the lower-layer workspace contracts", () => {
  const client = {
    baseUrl: "https://www.sefaria.org",
  } satisfies SefariaClientOptions;
  const vocalization = { paseq: "after-space" } satisfies VocalizationOptions;

  expect({ client, vocalization }).toBeDefined();
});
