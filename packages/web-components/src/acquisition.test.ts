import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("shared acquisition", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses the last configured choice before first shared use", async () => {
    const { configureSefariaAcquisition } = await import("./acquisition.js");
    const { resolveSefariaAcquisition } =
      await import("./acquisition-state.js");
    const first = {
      kind: "client" as const,
      client: createSefariaClient({ cache: false }),
    };
    const second = { kind: "disabled" as const };

    configureSefariaAcquisition(first);
    configureSefariaAcquisition(second);

    expect(resolveSefariaAcquisition()).toBe(second);
  });

  it("rejects every configuration attempt after first shared use", async () => {
    const { configureSefariaAcquisition } = await import("./acquisition.js");
    const { resolveSefariaAcquisition } =
      await import("./acquisition-state.js");
    const choice = { kind: "disabled" as const };
    configureSefariaAcquisition(choice);
    expect(resolveSefariaAcquisition()).toBe(choice);

    expect(() => configureSefariaAcquisition(choice)).toThrow(
      "already been realized",
    );
  });

  it("does not realize the shared choice for an explicit element override", async () => {
    const { configureSefariaAcquisition } = await import("./acquisition.js");
    const { resolveSefariaAcquisition } =
      await import("./acquisition-state.js");
    const override = { kind: "disabled" as const };

    expect(resolveSefariaAcquisition(override)).toBe(override);

    const configured = {
      kind: "client" as const,
      client: createSefariaClient({ cache: false }),
    };
    expect(() => configureSefariaAcquisition(configured)).not.toThrow();
    expect(resolveSefariaAcquisition()).toBe(configured);
  });
});
