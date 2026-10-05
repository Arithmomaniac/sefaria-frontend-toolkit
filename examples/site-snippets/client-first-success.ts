import { createSefariaClient, text } from "@sefaria/api-client";

const client = createSefariaClient();

// Fetch one passage. The client checks the response before you see it.
const { data, error, response } = await text.getV3Texts({
  client,
  path: { tref: "Micah 6:8" },
});

if (data === undefined) {
  console.log(`Sefaria answered HTTP ${response.status}:`, error);
} else {
  for (const version of data.versions) {
    console.log(`${data.ref} · ${version.language} · ${version.versionTitle}`);
  }
}
