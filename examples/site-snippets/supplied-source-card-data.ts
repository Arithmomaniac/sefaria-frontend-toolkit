import { validateExternalResponse } from "@arithmomaniac/sefaria-client";
import { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";

// A Micah 6:8 response you saved earlier, served from your own site.
const stored: unknown = await (await fetch("/data/micah-6-8.json")).json();

// Check it against the API description before you hand it over.
const check = validateExternalResponse(
  { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
  stored,
);
for (const issue of check.issues) {
  console.error(
    `Stored text is invalid at ${issue.instancePath}: ${issue.message}`,
  );
}

// With data set, the card renders it and doesn't ask Sefaria for anything.
const card = document.querySelector("sefaria-source-card");
if (card instanceof SefariaSourceCard) {
  card.data = stored;
}
