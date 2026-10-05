import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";

import { showWeeklyPortion } from "./app.js";

const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
const status = document.querySelector<HTMLElement>("[data-portion-status]");
if (card !== null && status !== null) {
  showWeeklyPortion({ card, status }).catch((error: unknown) => {
    status.setAttribute("role", "alert");
    status.textContent = `The calendar could not be loaded: ${
      error instanceof Error ? error.message : String(error)
    }`;
  });
}
