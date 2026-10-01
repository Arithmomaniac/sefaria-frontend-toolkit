import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("shared source", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses the last configured choice before first shared use", async () => {
    const { configureSefariaDataSource } = await import("./data-source.js");
    const { resolveSefariaDataSource } = await import("./data-source-state.js");
    const first = {
      kind: "client" as const,
      client: createSefariaClient({ cache: false }),
    };
    const second = { kind: "disabled" as const };

    configureSefariaDataSource(first);
    configureSefariaDataSource(second);

    expect(resolveSefariaDataSource()).toBe(second);
  });

  it("rejects every configuration attempt after first shared use", async () => {
    const { configureSefariaDataSource } = await import("./data-source.js");
    const { resolveSefariaDataSource } = await import("./data-source-state.js");
    const choice = { kind: "disabled" as const };
    configureSefariaDataSource(choice);
    expect(resolveSefariaDataSource()).toBe(choice);

    expect(() => configureSefariaDataSource(choice)).toThrow(
      "already been realized",
    );
  });

  it("does not realize the shared choice for an explicit element override", async () => {
    const { configureSefariaDataSource } = await import("./data-source.js");
    const { resolveSefariaDataSource } = await import("./data-source-state.js");
    const override = { kind: "disabled" as const };

    expect(resolveSefariaDataSource(override)).toBe(override);

    const configured = {
      kind: "client" as const,
      client: createSefariaClient({ cache: false }),
    };
    expect(() => configureSefariaDataSource(configured)).not.toThrow();
    expect(resolveSefariaDataSource()).toBe(configured);
  });
});
