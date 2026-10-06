import { readFile } from "node:fs/promises";

import { createSefariaClient } from "@sefaria/api-client";
import { describe, expect, it, vi } from "vitest";

import { showWeeklyPortion } from "./app.js";

// Real response saved from https://www.sefaria.org/api/calendars on 2026-09-29.
const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/calendars-2027-01-08.json", import.meta.url),
    "utf8",
  ),
) as { readonly payload: unknown };

describe("this week's portion", () => {
  it("makes one calendar call for a fixed date and sets the portion on the card", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(fixture.payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const card = { sref: "" };
    const status = { textContent: null as string | null };

    const ref = await showWeeklyPortion({
      card,
      status,
      date: new Date(2027, 0, 8),
      client: createSefariaClient({ fetch: fetchMock, cache: false }),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]![0] as Request;
    const url = new URL(request.url);
    expect(url.origin + url.pathname).toBe(
      "https://www.sefaria.org/api/calendars",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      year: "2027",
      month: "1",
      day: "8",
      diaspora: "1",
    });
    expect(ref).toBe("Exodus 6:2-9:35");
    expect(card.sref).toBe("Exodus 6:2-9:35");
    expect(status.textContent).toBe("This week's portion: Vaera");
  });

  it("leaves the card empty when the calendar has no portion", async () => {
    const card = { sref: "" };
    const status = { textContent: null as string | null };
    await showWeeklyPortion({
      card,
      status,
      date: new Date(2027, 0, 8),
      client: createSefariaClient({
        cache: false,
        fetch: async () =>
          new Response(JSON.stringify({ calendar_items: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      }),
    });
    expect(card.sref).toBe("");
    expect(status.textContent).toMatch(/no Torah portion/);
  });
});
