import { createSefariaClient, text } from "@arithmomaniac/sefaria-client";
import { normalizeText } from "@arithmomaniac/sefaria-text-transform";

const client = createSefariaClient();

const { data, error, response } = await text.getV3Texts({
  client,
  path: { tref: "Micah 6:8" },
  query: { version: ["translation"] },
});

if (data === undefined) {
  console.log(`Sefaria answered HTTP ${response.status}:`, error);
} else {
  for (const version of data.versions) {
    if (typeof version.text !== "string") continue;
    const { bodyHtml, notes } = normalizeText(version.text);
    console.log(`${version.versionTitle}:`);
    console.log(bodyHtml);
    console.log(`${notes.length} footnote(s) kept separately.`);
  }
}
