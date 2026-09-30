import {
  text,
  type CoreV3TextsResponse,
  type CoreV3Version,
} from "@arithmomaniac/sefaria-client";
import type { SefariaAcquisition } from "./acquisition.js";
import { validateSuppliedComponentData } from "./component-controller.js";

/** Normalizes one API language-family preference, not a language list or role. */
export function normalizeTranslationLanguage(value: string): string {
  const language = value.trim().toLowerCase();
  if (
    !language ||
    /[|,]/u.test(language) ||
    ["all", "primary", "source", "translation"].includes(language)
  ) {
    throw new TypeError(
      "Translation language must be one full language-family name.",
    );
  }
  return language;
}

/** Missing-translation fallback policy for preferred-language selection. */
export type TranslationFallback = "default" | "none";

/** Validates the public missing-translation fallback policy. */
export function normalizeTranslationFallback(
  value: string,
): TranslationFallback {
  const fallback = value.trim().toLowerCase();
  if (fallback !== "default" && fallback !== "none") {
    throw new TypeError('Translation fallback must be "default" or "none".');
  }
  return fallback;
}

/** Message shown when a preferred translation family is unavailable by choice. */
export function noTranslationLanguageMessage(language: string): string {
  return `No ${normalizeTranslationLanguage(language)} text.`;
}

/** Selects a preferred captured edition without acquiring missing coverage. */
export function preferredTranslation(
  payload: CoreV3TextsResponse,
  language: string,
  versionTitle?: string,
): CoreV3Version | undefined {
  const family = normalizeTranslationLanguage(language);
  needsTranslationFallback(payload, family);
  const matches = payload.versions.filter(
    (version) =>
      version.languageFamilyName.toLowerCase() === family &&
      (versionTitle === undefined ||
        version.versionTitle === versionTitle.replaceAll("_", " ")),
  );
  if (matches.some((version) => version.isSource)) {
    throw new TypeError(
      "/versions: the preferred language returned a source edition, not a translation.",
    );
  }
  if (matches.length > 1) {
    throw new TypeError(
      "/versions: more than one edition matches the preferred translation.",
    );
  }
  if (matches[0] !== undefined || versionTitle !== undefined) return matches[0];
  if (
    payload.available_versions.some(
      (version) => version.languageFamilyName.toLowerCase() === family,
    )
  ) {
    throw new TypeError(
      "/versions: preferred translation is available but its text was not captured.",
    );
  }
  return undefined;
}

/** Whether a validated API warning permits exactly one default-translation request. */
export function needsTranslationFallback(
  payload: CoreV3TextsResponse,
  language: string,
): boolean {
  const family = normalizeTranslationLanguage(language);
  const missing = payload.warnings.some(
    (warning) => warning[family]?.warning_code === 102,
  );
  if (!missing) return false;
  if (
    payload.versions.some(
      (version) => version.languageFamilyName.toLowerCase() === family,
    ) ||
    payload.available_versions.some(
      (version) => version.languageFamilyName.toLowerCase() === family,
    )
  ) {
    throw new TypeError(
      "/warnings: missing-language warning contradicts captured edition evidence.",
    );
  }
  return true;
}

/** One corrected response, including documented HTTP failures. */
export type SelectedTextResponse =
  | { readonly status: 200; readonly payload: CoreV3TextsResponse }
  | {
      readonly status: 400 | 404;
      readonly payload: { readonly error: string };
    };

/** Element-owned phase marker; retains no response data. */
export interface SelectedTextProgress {
  /** Whether the original operation already established language absence. */
  fallback: boolean;
}

/** Acquires text with at most one explicit missing-language fallback. */
export async function acquireSelectedText(
  acquisition: SefariaAcquisition,
  sref: string,
  versions: readonly string[],
  translationLanguage: string | undefined,
  translationFallback: TranslationFallback = "default",
  signal: AbortSignal,
  progress: SelectedTextProgress = { fallback: false },
): Promise<SelectedTextResponse> {
  const family =
    translationLanguage === undefined
      ? undefined
      : normalizeTranslationLanguage(translationLanguage);
  const fallbackSelectors = versions.map((selector) =>
    selector === family ? "translation" : selector,
  );
  if (progress.fallback) return await load(fallbackSelectors);
  const first = await load(versions);
  if (
    first.status === 200 &&
    family !== undefined &&
    versions.includes(family) &&
    translationFallback === "default" &&
    needsTranslationFallback(first.payload, family)
  ) {
    progress.fallback = true;
    return await load(fallbackSelectors);
  }
  if (
    first.status === 200 &&
    family !== undefined &&
    versions.includes(family) &&
    !first.payload.versions.some(
      (version) => version.languageFamilyName.toLowerCase() === family,
    ) &&
    !needsTranslationFallback(first.payload, family)
  ) {
    throw new TypeError(
      "/versions: the requested language is absent without a matching missing-language warning.",
    );
  }
  return first;

  async function load(
    selectors: readonly string[],
  ): Promise<SelectedTextResponse> {
    signal.throwIfAborted();
    let payload: unknown;
    let status: number;
    if (acquisition.kind === "disabled") {
      throw new Error("Standalone Sefaria acquisition is disabled.");
    }
    if (acquisition.kind === "client") {
      const result = await text.getV3Texts({
        client: acquisition.client,
        path: { tref: sref },
        query: { version: [...selectors], return_format: "default" },
        signal,
      });
      payload = result.data ?? result.error;
      status = result.response.status;
    } else {
      if (acquisition.capability.getText === undefined) {
        throw new Error(
          "The selected acquisition source does not support text.",
        );
      }
      const result = await acquisition.capability.getText(
        { sref, versions: selectors, returnFormat: "default" },
        signal,
      );
      payload = result.payload;
      status = result.status;
    }
    signal.throwIfAborted();
    if (status === 200) {
      return {
        status,
        payload: validateSuppliedComponentData<CoreV3TextsResponse>(
          { method: "GET", path: "/api/v3/texts/{tref}", status },
          payload,
        ),
      };
    }
    if (status === 400 || status === 404) {
      return {
        status,
        payload: validateSuppliedComponentData<{ readonly error: string }>(
          { method: "GET", path: "/api/v3/texts/{tref}", status },
          payload,
        ),
      };
    }
    throw new Error(`Unsupported text response status ${status}.`);
  }
}
