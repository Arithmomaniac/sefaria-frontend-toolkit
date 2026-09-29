import {
  createSefariaClient,
  text,
  validateExternalResponse,
} from "@arithmomaniac/sefaria-client";

const client = createSefariaClient();

// 1. Fetch one passage. The client checks the response before you see it.
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

  // 2. Check JSON that reaches you another way, such as from storage.
  //    Here one field is damaged on purpose to show a failed check.
  const stored: unknown = { ...data, isSpanning: "no" };
  const check = validateExternalResponse(
    { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
    stored,
  );
  for (const issue of check.issues) {
    console.log(`Invalid at ${issue.instancePath}: ${issue.message}`);
  }
}
