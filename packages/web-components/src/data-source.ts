import type { SefariaClient } from "@arithmomaniac/sefaria-client";

import { setPendingSefariaDataSource } from "./data-source-state.js";

/** Corrected operation result returned by a host data loader. */
export interface SefariaDataLoaderResponse {
  /** Unknown corrected payload validated by the receiving component. */
  readonly payload: unknown;
  /** Documented HTTP-equivalent response status. */
  readonly status: number;
}

/** Text operation requested by a standalone component. */
export interface SefariaTextLoadRequest {
  /** Public Sefaria reference. */
  readonly sref: string;
  /** Serialized v3 version selectors. */
  readonly versions: readonly string[];
  /** Required v3 response format. */
  readonly returnFormat: "default";
}

/** Links operation requested by a standalone component. */
export interface SefariaLinksLoadRequest {
  /** Public Sefaria reference. */
  readonly sref: string;
  /** Whether connected text is required. */
  readonly withText: boolean;
}

/** Structural host data loader for environments such as MCP Apps. */
export interface SefariaDataLoader {
  /** Performs a v3 text operation when supported by the host. */
  readonly getText?: (
    request: SefariaTextLoadRequest,
    signal: AbortSignal,
  ) => Promise<SefariaDataLoaderResponse>;

  /** Performs a links operation when supported by the host. */
  readonly getLinks?: (
    request: SefariaLinksLoadRequest,
    signal: AbortSignal,
  ) => Promise<SefariaDataLoaderResponse>;
}

/** Explicit data source selected by configuration or one element. */
export type SefariaDataSource =
  | {
      /** Uses an existing branded toolkit client and its per-client cache. */
      readonly kind: "client";
      /** Existing branded toolkit client. */
      readonly client: SefariaClient;
    }
  | {
      /** Uses a structural host loader without browser fallback. */
      readonly kind: "custom";
      /** Host-provided operation loader. */
      readonly loader: SefariaDataLoader;
    }
  | {
      /** Disables standalone loading without browser fallback. */
      readonly kind: "disabled";
    };

/**
 * Replaces the pending module-local shared data source choice.
 *
 * @throws {Error} After the first element realizes the shared choice.
 */
export function configureSefariaDataSource(source: SefariaDataSource): void {
  setPendingSefariaDataSource(source);
}
