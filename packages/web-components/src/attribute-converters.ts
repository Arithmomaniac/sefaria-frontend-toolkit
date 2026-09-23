import type { ComplexAttributeConverter } from "lit";

/** Converts a removed optional string attribute back to `undefined`. */
export const optionalStringConverter = {
  fromAttribute(value) {
    return value ?? undefined;
  },
  toAttribute(value) {
    return value ?? null;
  },
} satisfies ComplexAttributeConverter<string | undefined>;
