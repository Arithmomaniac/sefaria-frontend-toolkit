import {
  createSefariaClient,
  text,
  validateExternalResponse,
} from "@sefaria/api-client";

// Get a response once and keep it as JSON text, as you would in a file or database.
const { data } = await text.getV3Texts({
  client: createSefariaClient(),
  path: { tref: "Micah 6:8" },
});
const stored = JSON.stringify(data);

// Later, read it back. Here one field is damaged on purpose to show a failed check.
const loaded: unknown = { ...JSON.parse(stored), isSpanning: "no" };

const check = validateExternalResponse(
  { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
  loaded,
);
for (const issue of check.issues) {
  console.log(`Invalid at ${issue.instancePath}: ${issue.message}`);
}
