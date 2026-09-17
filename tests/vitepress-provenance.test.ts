import { describe, expect, it } from "vitest";

import { removeLeadingProvenanceBlock } from "../docs/.vitepress/provenance";

function blockquote(content: string) {
  return [
    { type: "blockquote_open", content: "" },
    { type: "paragraph_open", content: "" },
    { type: "inline", content },
    { type: "paragraph_close", content: "" },
    { type: "blockquote_close", content: "" },
    { type: "heading_open", content: "" },
  ];
}

describe("VitePress provenance presentation", () => {
  it.each([
    "Created/edited by GitHub Copilot; pending human review.",
    "Created/edited by GitHub Copilot with human review/feedback by Avi Levin.",
  ])("removes the recognized leading block %s", (content) => {
    const state = { tokens: blockquote(content) };

    removeLeadingProvenanceBlock(state);

    expect(state.tokens.map((token) => token.type)).toEqual(["heading_open"]);
  });

  it("preserves ordinary leading blockquotes", () => {
    const state = {
      tokens: blockquote(
        "Start with the smallest surface that completes the user task.",
      ),
    };

    removeLeadingProvenanceBlock(state);

    expect(state.tokens).toHaveLength(6);
  });
});
