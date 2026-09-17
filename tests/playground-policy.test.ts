import { describe, expect, it } from "vitest";

import {
  ACTIVE_PREVIEW_LIMIT,
  ASSET_FILE_LIMIT,
  ASSET_TOTAL_LIMIT,
  DIAGNOSTIC_COUNT_LIMIT,
  DIAGNOSTIC_TEXT_LIMIT,
  MESSAGE_SIZE_LIMIT,
  SOURCE_FILE_LIMIT,
  SOURCE_TOTAL_LIMIT,
} from "../examples/playground/src/limits.js";
import {
  canAcceptDiagnostic,
  canCreatePreview,
  isBoundedDiagnosticMessage,
  validateProjectAssets,
  validateProjectSources,
} from "../examples/playground/src/policy.js";
import { rewriteDeclaredAssets } from "../examples/playground/src/project-imports.js";

describe("playground policy bounds", () => {
  it("accepts source exactly at each bound and rejects one character over", () => {
    expect(
      validateProjectSources({
        html: "h".repeat(SOURCE_FILE_LIMIT),
        css: "",
        javascript: "",
      }),
    ).toBeUndefined();
    expect(
      validateProjectSources({
        html: "h".repeat(SOURCE_FILE_LIMIT + 1),
        css: "",
        javascript: "",
      }),
    ).toContain("html exceeds");
    expect(
      validateProjectSources({
        html: "h".repeat(SOURCE_FILE_LIMIT),
        css: "c".repeat(SOURCE_FILE_LIMIT),
        javascript: "j".repeat(SOURCE_TOTAL_LIMIT - SOURCE_FILE_LIMIT * 2),
      }),
    ).toBeUndefined();
    expect(
      validateProjectSources({
        html: "h".repeat(SOURCE_FILE_LIMIT),
        css: "c".repeat(SOURCE_FILE_LIMIT),
        javascript: "j".repeat(SOURCE_TOTAL_LIMIT - SOURCE_FILE_LIMIT * 2 + 1),
      }),
    ).toContain("total limit");
  });

  it("bounds declared assets separately from editable source", () => {
    expect(
      validateProjectAssets({
        "./one.js": "a".repeat(ASSET_FILE_LIMIT),
        "./two.js": "b".repeat(ASSET_TOTAL_LIMIT - ASSET_FILE_LIMIT),
      }),
    ).toBeUndefined();
    expect(
      validateProjectAssets({
        "./large.js": "a".repeat(ASSET_FILE_LIMIT + 1),
      }),
    ).toContain("./large.js exceeds");
    expect(
      validateProjectAssets({
        "./hebrew.js": "א".repeat(Math.floor(ASSET_FILE_LIMIT / 2) + 1),
      }),
    ).toContain("./hebrew.js exceeds");
    expect(
      validateProjectAssets({
        "./one.js": "a".repeat(40_000),
        "./two.js": "b".repeat(40_000),
        "./three.js": "c".repeat(20_001),
      }),
    ).toContain("asset total limit");
  });

  describe("playground project imports", () => {
    const assets = { "./micah-6-8.js": "data:text/javascript,fixture" };

    it("rewrites the declared static asset for imports and re-exports", () => {
      expect(
        rewriteDeclaredAssets(
          'import data from "./micah-6-8.js"; export { data };',
          assets,
        ),
      ).toContain('"data:text/javascript,fixture"');
      expect(
        rewriteDeclaredAssets('export * from "./micah-6-8.js";', assets),
      ).toBe('export * from "data:text/javascript,fixture";');
    });

    it("rejects dynamic imports and undeclared re-export edges", () => {
      expect(() =>
        rewriteDeclaredAssets(
          'import("https://example.test/module.js");',
          assets,
        ),
      ).toThrow("Dynamic imports are not supported");
      expect(() =>
        rewriteDeclaredAssets(
          'export * from "https://example.test/module.js";',
          assets,
        ),
      ).toThrow("Unsupported project import");
    });

    it("does not treat inherited object properties as declared assets", () => {
      expect(
        rewriteDeclaredAssets('import value from "toString";', assets),
      ).toBe('import value from "toString";');
    });
  });

  it("accepts the final preview and diagnostic slots but rejects one over", () => {
    expect(canCreatePreview(ACTIVE_PREVIEW_LIMIT - 1)).toBe(true);
    expect(canCreatePreview(ACTIVE_PREVIEW_LIMIT)).toBe(false);
    expect(canAcceptDiagnostic(DIAGNOSTIC_COUNT_LIMIT - 1)).toBe(true);
    expect(canAcceptDiagnostic(DIAGNOSTIC_COUNT_LIMIT)).toBe(false);
  });

  it("accepts bounded diagnostic messages and rejects text or envelopes over", () => {
    const atLimit = {
      diagnostic: { message: "x".repeat(DIAGNOSTIC_TEXT_LIMIT) },
    };
    expect(isBoundedDiagnosticMessage(atLimit)).toBe(true);
    expect(
      isBoundedDiagnosticMessage({
        diagnostic: { message: "x".repeat(DIAGNOSTIC_TEXT_LIMIT + 1) },
      }),
    ).toBe(false);
    expect(
      isBoundedDiagnosticMessage({
        diagnostic: { message: "ok" },
        padding: "x".repeat(MESSAGE_SIZE_LIMIT),
      }),
    ).toBe(false);
    const circular: { diagnostic: { message: string }; self?: unknown } = {
      diagnostic: { message: "ok" },
    };
    circular.self = circular;
    expect(isBoundedDiagnosticMessage(circular)).toBe(false);
  });
});
