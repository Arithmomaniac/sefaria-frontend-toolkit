const expectedQuery = [
  ["version", "primary"],
  ["version", "translation"],
  ["return_format", "default"],
] as const;

export function createMicahFixtureFetch(
  payload: unknown,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    if (
      request.method !== "GET" ||
      url.origin !== "https://example.invalid" ||
      (path !== "/api/v3/texts/Micah 6:8" &&
        path !== "/api/v3/texts/micah 6:8") ||
      JSON.stringify([...url.searchParams.entries()]) !==
        JSON.stringify(expectedQuery)
    ) {
      throw new Error(
        `Unexpected deterministic request: ${request.method} ${url}`,
      );
    }
    return Response.json(payload);
  };
}
