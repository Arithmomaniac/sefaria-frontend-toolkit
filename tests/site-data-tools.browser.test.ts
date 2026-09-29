import { expect, test, vi } from "vitest";

import type {
  SefariaReader,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";

import micah from "./site-fixtures/micah-6-8-2026-09-28.json";
import { createMcpReaderAcquisition } from "../examples/mcp-app/src/app.js";

function stubFetch() {
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    requests.push(url);
    if (url.endsWith("/data/micah-6-8.json")) {
      return new Response(JSON.stringify(micah.payload), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/api/links/")) {
      return new Response("[]", {
        headers: { "content-type": "application/json" },
      });
    }
    throw new TypeError(`Unexpected request: ${url}`);
  });
  return requests;
}

test("supplied Source Card data renders with zero Sefaria requests", async () => {
  const requests = stubFetch();
  document.body.innerHTML = "<sefaria-source-card></sefaria-source-card>";
  await import("../examples/site-snippets/supplied-source-card-data.ts");
  const card = document.querySelector(
    "sefaria-source-card",
  ) as SefariaSourceCard;
  await vi.waitFor(() => expect(card.status).toBe("ready"));
  expect(requests).toEqual(["/data/micah-6-8.json"]);
  vi.unstubAllGlobals();
});

test("a source-only Reader seed loads links once and no source text", async () => {
  const requests = stubFetch();
  document.body.innerHTML = "<sefaria-reader></sefaria-reader>";
  await import("../examples/site-snippets/supplied-reader-seed.ts");
  const reader = document.querySelector("sefaria-reader") as SefariaReader;
  await vi.waitFor(() =>
    expect(requests.filter((url) => url.includes("/api/links/"))).toHaveLength(
      1,
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requests.filter((url) => url.includes("/api/v3/texts/"))).toEqual([]);
  expect(reader.status).not.toBe("error");
  vi.unstubAllGlobals();
});

test("the MCP App Reader continues through host tools, never Sefaria", async () => {
  const requests = stubFetch();
  const callServerTool = vi.fn(async () => ({
    content: [],
    isError: true,
  }));
  const acquisition = createMcpReaderAcquisition({ callServerTool });
  document.body.innerHTML = "<sefaria-reader></sefaria-reader>";
  const reader = document.querySelector("sefaria-reader") as SefariaReader;
  reader.acquisition = acquisition;
  reader.data = {
    source: {
      payload: micah.payload,
      status: 200,
      effectiveRequest: { tref: "Micah 6:8" },
    },
    selectedRef: "Micah 6:8",
  };
  await vi.waitFor(() => expect(callServerTool).toHaveBeenCalledOnce());
  expect(callServerTool.mock.calls[0]?.[0]).toMatchObject({
    name: "get_links_between_texts",
    arguments: { reference: "Micah 6:8" },
  });
  expect(requests).toEqual([]);
  vi.unstubAllGlobals();
});
