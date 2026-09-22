import { createSefariaClient } from "@arithmomaniac/sefaria-client";

import type { SefariaAcquisition } from "./acquisition.js";

let pending: SefariaAcquisition | undefined;
let realized: SefariaAcquisition | undefined;

/** Replaces the pending shared choice before first realization. */
export function setPendingSefariaAcquisition(
  acquisition: SefariaAcquisition,
): void {
  if (realized !== undefined) {
    throw new Error("Shared Sefaria acquisition has already been realized.");
  }
  pending = acquisition;
}

/** Resolves an explicit override or realizes the module-local shared choice. */
export function resolveSefariaAcquisition(
  override?: SefariaAcquisition,
): SefariaAcquisition {
  if (override !== undefined) return override;
  if (realized === undefined) {
    realized =
      pending ??
      Object.freeze({
        kind: "client" as const,
        client: createSefariaClient(),
      });
    pending = undefined;
  }
  return realized;
}
