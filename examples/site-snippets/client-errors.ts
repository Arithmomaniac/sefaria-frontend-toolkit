import {
  SefariaContractError,
  createSefariaClient,
  text,
} from "@arithmomaniac/sefaria-client";
import type { SefariaClient } from "@arithmomaniac/sefaria-client";

async function describePassage(
  client: SefariaClient,
  tref: string,
  signal?: AbortSignal,
) {
  try {
    const { data, error, response } = await text.getV3Texts({
      client,
      path: { tref },
      ...(signal === undefined ? {} : { signal }),
    });
    if (data === undefined) {
      // 1. Sefaria answered with an error it documents, such as 404.
      return `Sefaria error ${response.status}: ${error?.error}`;
    }
    return `${data.ref}: ${data.versions.length} edition(s)`;
  } catch (failure) {
    if (failure instanceof SefariaContractError) {
      // 2. The response didn't match the API description.
      const report = {
        operationId: failure.operationId,
        method: failure.method,
        path: failure.path,
        status: failure.status,
        issues: failure.issues.map((issue) => ({
          instancePath: issue.instancePath,
          keyword: issue.keyword,
          message: issue.message,
        })),
      };
      return `Unexpected response shape: ${JSON.stringify(report)}`;
    }
    // 3. The request failed or was cancelled. There is no data to show.
    return `Request failed: ${String(failure)}`;
  }
}

// Stand-in servers make each case happen on demand. Use createSefariaClient()
// with no options to talk to Sefaria.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const notFound = createSefariaClient({
  fetch: async () => json({ error: "Could not find title in reference" }, 404),
});
const htmlPage = createSefariaClient({
  fetch: async () =>
    new Response("<html>Service unavailable</html>", {
      headers: { "content-type": "text/html" },
    }),
});
const offline = createSefariaClient({
  fetch: async () => {
    throw new TypeError("fetch failed");
  },
});

console.log(await describePassage(notFound, "Micah 6:80"));
console.log(await describePassage(htmlPage, "Micah 6:8"));
console.log(await describePassage(offline, "Micah 6:8"));
console.log(
  await describePassage(
    createSefariaClient(),
    "Micah 6:8",
    AbortSignal.abort(new DOMException("Reader left the page", "AbortError")),
  ),
);
