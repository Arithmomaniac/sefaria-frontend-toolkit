import type { BilingualPairSide } from "./bilingual-pair.js";
import type { SourceCardRequest } from "./source-card.js";
import { normalizeTranslationLanguage } from "./translation-selection.js";

const SIDES: readonly BilingualPairSide[] = ["primary", "translation"];

/** Serializes source-card edition selectors for every source-card request path. */
export function serializeSourceCardSelectors(
  request: SourceCardRequest,
): string[] {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Source card reference must not be blank.");
  }
  return SIDES.map((side) => {
    const selector =
      side === "translation" && request.translationLanguage !== undefined
        ? normalizeTranslationLanguage(request.translationLanguage)
        : side;
    const versionTitle = request[side]?.versionTitle;
    if (versionTitle === undefined) return selector;
    if (versionTitle.trim().length === 0) {
      throw new TypeError(
        `Source card ${side} version title must not be blank.`,
      );
    }
    return `${selector}|${versionTitle}`;
  });
}
