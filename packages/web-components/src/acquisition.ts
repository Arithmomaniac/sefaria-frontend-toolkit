import type { SefariaClient } from "@arithmomaniac/sefaria-client";

import { setPendingSefariaAcquisition } from "./acquisition-state.js";

/** Corrected operation result returned by a host acquisition capability. */
export interface SefariaAcquisitionResponse {
  /** Unknown corrected payload validated by the receiving component. */
  readonly payload: unknown;
  /** Documented HTTP-equivalent response status. */
  readonly status: number;
}

/** Text operation requested by a standalone component. */
export interface SefariaTextAcquisitionRequest {
  /** Public Sefaria reference. */
  readonly sref: string;
  /** Serialized v3 version selectors. */
  readonly versions: readonly string[];
  /** Required v3 response format. */
  readonly returnFormat: "default";
}

/** Reference-resolution operation requested by a standalone component. */
export interface SefariaReferenceAcquisitionRequest {
  /** Public Sefaria reference. */
  readonly sref: string;
}

/** Links operation requested by a standalone component. */
export interface SefariaLinksAcquisitionRequest {
  /** Public Sefaria reference. */
  readonly sref: string;
  /** Whether connected text is required. */
  readonly withText: boolean;
}

/** Structural host acquisition capability for environments such as MCP Apps. */
export interface SefariaAcquisitionCapability {
  /** Performs a v3 text operation when supported by the host. */
  readonly getText?: (
    request: SefariaTextAcquisitionRequest,
    signal: AbortSignal,
  ) => Promise<SefariaAcquisitionResponse>;
  /** Performs a reference-resolution operation when supported by the host. */
  readonly resolveReference?: (
    request: SefariaReferenceAcquisitionRequest,
    signal: AbortSignal,
  ) => Promise<SefariaAcquisitionResponse>;
  /** Performs a links operation when supported by the host. */
  readonly getLinks?: (
    request: SefariaLinksAcquisitionRequest,
    signal: AbortSignal,
  ) => Promise<SefariaAcquisitionResponse>;
}

/** Explicit acquisition source selected by configuration or one element. */
export type SefariaAcquisition =
  | {
      /** Uses an existing branded toolkit client and its per-client cache. */
      readonly kind: "client";
      /** Existing branded toolkit client. */
      readonly client: SefariaClient;
    }
  | {
      /** Uses a structural host capability without browser fallback. */
      readonly kind: "capability";
      /** Host-provided operation capability. */
      readonly capability: SefariaAcquisitionCapability;
    }
  | {
      /** Disables standalone acquisition without browser fallback. */
      readonly kind: "disabled";
    };

/**
 * Replaces the pending module-local shared acquisition choice.
 *
 * @throws {Error} After the first element realizes the shared choice.
 */
export function configureSefariaAcquisition(
  acquisition: SefariaAcquisition,
): void {
  setPendingSefariaAcquisition(acquisition);
}
