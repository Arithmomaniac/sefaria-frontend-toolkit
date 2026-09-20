import {
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import {
  applyVocalizationToHtml,
  normalizeText,
} from "@arithmomaniac/sefaria-text-transform";
import { expect, it } from "vitest";

import "./no-network.js";
import {
  v3SourceBackedFixtureMetadata,
  v3SourceBackedPayload,
} from "./v3-source-backed.fixture.js";

it("validates and transforms one complete source-backed v3 payload", () => {
  const valid = validateGetV3Texts200(v3SourceBackedPayload);

  expect(valid).toBe(true);
  if (!valid) {
    throw new TypeError("Expected the source-backed v3 payload to be valid.");
  }

  const response = v3SourceBackedPayload as CoreV3TextsResponse;
  const html = response.versions[0]?.text;
  expect(typeof html).toBe("string");
  if (typeof html !== "string") {
    throw new TypeError("Expected the selected v3 version text to be HTML.");
  }

  expect(v3SourceBackedFixtureMetadata.textSources).toHaveLength(2);
  const normalized = normalizeText(html);

  expect({
    bodyHtml: applyVocalizationToHtml(normalized.bodyHtml, "none"),
    notes: normalized.notes.map((note) => ({
      ...note,
      markerHtml: applyVocalizationToHtml(note.markerHtml, "none"),
      contentHtml:
        note.contentHtml === null
          ? null
          : applyVocalizationToHtml(note.contentHtml, "none"),
    })),
  }).toEqual({
    bodyHtml:
      '<span data-sefaria-mam="mam-kq-trivial">שערו</span> — When God began to create<span data-sefaria-note="0"></span> heaven',
    notes: [
      {
        key: 0,
        markerHtml: "*",
        contentHtml: "<b>When God began to create </b>Others.",
      },
    ],
  });
});
