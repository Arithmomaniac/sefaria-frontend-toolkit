import {
  calendars,
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";

const PORTION_TITLE = "Parashat Hashavua";

export interface WeeklyPortionOptions {
  readonly card: { sref: string };
  readonly status: { textContent: string | null };
  readonly date?: Date;
  readonly diaspora?: boolean;
  readonly client?: SefariaClient;
}

// #region calendar-call
/** Asks Sefaria's calendar for the week's Torah portion and shows it on a Source Card. */
export async function showWeeklyPortion({
  card,
  status,
  date = new Date(),
  diaspora = true,
  client = createSefariaClient(),
}: WeeklyPortionOptions): Promise<string | undefined> {
  const result = await calendars.getCalendars({
    client,
    query: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      diaspora: diaspora ? "1" : "0",
    },
  });
  const portion = result.data?.calendar_items?.find(
    (item) => item.title?.en === PORTION_TITLE,
  );
  if (portion?.ref === undefined) {
    status.textContent =
      "Sefaria's calendar has no Torah portion for this date.";
    return undefined;
  }
  status.textContent = `This week's portion: ${portion.displayValue?.en ?? portion.ref}`;
  card.sref = portion.ref;
  return portion.ref;
}
// #endregion calendar-call
