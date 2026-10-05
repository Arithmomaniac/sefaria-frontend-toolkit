import { createSefariaClient } from "@sefaria/api-client";

import type { SefariaDataSource } from "./data-source.js";

let pending: SefariaDataSource | undefined;
let realized: SefariaDataSource | undefined;

/** Replaces the pending shared choice before first realization. */
export function setPendingSefariaDataSource(source: SefariaDataSource): void {
  if (realized !== undefined) {
    throw new Error("Shared Sefaria source has already been realized.");
  }
  pending = source;
}

/** Resolves an explicit override or realizes the module-local shared choice. */
export function resolveSefariaDataSource(
  override?: SefariaDataSource,
): SefariaDataSource {
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
