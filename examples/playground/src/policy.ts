import {
  ACTIVE_PREVIEW_LIMIT,
  ASSET_FILE_LIMIT,
  ASSET_TOTAL_LIMIT,
  DIAGNOSTIC_COUNT_LIMIT,
  DIAGNOSTIC_TEXT_LIMIT,
  MESSAGE_SIZE_LIMIT,
  SOURCE_FILE_LIMIT,
  SOURCE_TOTAL_LIMIT,
} from "./limits.js";

export type ProjectSources = Readonly<
  Record<"html" | "css" | "javascript", string>
>;
export type ProjectAssets = Readonly<Record<string, string>>;

export function validateProjectSources(
  sources: ProjectSources,
): string | undefined {
  for (const [kind, source] of Object.entries(sources)) {
    if (source.length > SOURCE_FILE_LIMIT) {
      return `${kind} exceeds the ${SOURCE_FILE_LIMIT} character file limit.`;
    }
  }
  const total = Object.values(sources).reduce(
    (sum, source) => sum + source.length,
    0,
  );
  return total > SOURCE_TOTAL_LIMIT
    ? `Project source exceeds the ${SOURCE_TOTAL_LIMIT} character total limit.`
    : undefined;
}

export function validateProjectAssets(
  assets: ProjectAssets,
): string | undefined {
  let total = 0;
  for (const [specifier, source] of Object.entries(assets)) {
    const size = new TextEncoder().encode(source).byteLength;
    if (size > ASSET_FILE_LIMIT) {
      return `${specifier} exceeds the ${ASSET_FILE_LIMIT} byte asset file limit.`;
    }
    total += size;
  }
  return total > ASSET_TOTAL_LIMIT
    ? `Project assets exceed the ${ASSET_TOTAL_LIMIT} byte asset total limit.`
    : undefined;
}

export function canCreatePreview(activeCount: number): boolean {
  return activeCount < ACTIVE_PREVIEW_LIMIT;
}

export function isBoundedDiagnosticMessage(value: unknown): boolean {
  try {
    if (JSON.stringify(value).length > MESSAGE_SIZE_LIMIT) return false;
  } catch {
    return false;
  }
  if (typeof value !== "object" || value === null) return false;
  const message = (value as { diagnostic?: { message?: unknown } }).diagnostic
    ?.message;
  return typeof message === "string" && message.length <= DIAGNOSTIC_TEXT_LIMIT;
}

export function canAcceptDiagnostic(currentCount: number): boolean {
  return currentCount < DIAGNOSTIC_COUNT_LIMIT;
}
