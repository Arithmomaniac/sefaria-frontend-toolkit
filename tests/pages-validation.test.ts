import { describe, expect, it } from "vitest";

import { isCiValidatedCommit } from "../scripts/pages-validation.mjs";

const validated = {
  eventName: "workflow_run",
  workflowName: "CI",
  workflowEvent: "push",
  conclusion: "success",
  headSha: "a".repeat(40),
  checkoutSha: "a".repeat(40),
};

describe("Pages validation reuse", () => {
  it("reuses a successful CI push run only for the exact checked-out commit", () => {
    expect(isCiValidatedCommit(validated)).toBe(true);
  });

  it.each([
    ["a newer main commit", { checkoutSha: "b".repeat(40) }],
    ["a missing head SHA", { headSha: "" }],
    ["a manual dispatch", { eventName: "workflow_dispatch" }],
    ["script retirement", { workflowName: "Retire script version" }],
    ["a pull-request CI run", { workflowEvent: "pull_request" }],
    ["an unsuccessful CI run", { conclusion: "failure" }],
  ])("requires the full check for %s", (_label, change) => {
    expect(isCiValidatedCommit({ ...validated, ...change })).toBe(false);
  });
});
