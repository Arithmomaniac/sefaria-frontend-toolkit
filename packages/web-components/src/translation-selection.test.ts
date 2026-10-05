import { expect, test, vi } from "vitest";
import {
  createSefariaClient,
  type CoreV3TextsResponse,
} from "@sefaria/api-client";
import micah from "../../../examples/react-vite/src/micah-6-8.json";
import {
  createTextSegmentViewModel,
  loadTextSegmentViewModel,
} from "./text-segment.js";
import { createSourceCardViewModel } from "./source-card.js";
import {
  acquireSelectedText,
  needsTranslationFallback,
  preferredTranslation,
} from "./translation-selection.js";
import { validateSuppliedComponentData } from "./component-controller.js";

function capture() {
  const value = validateSuppliedComponentData<CoreV3TextsResponse>(
    { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
    structuredClone(micah),
  );
  value.available_versions = value.versions.map((version) => ({
    ...version,
    title: value.indexTitle,
  }));
  return value;
}

test("non-DOM Text Segment supports the same preferred-language request", async () => {
  const value = capture();
  const translated = value.versions.find((version) => !version.isSource)!;
  translated.languageFamilyName = "french";
  translated.actualLanguage = "fr";
  const request = {
    tref: "Micah 6:8",
    version: { translationLanguage: "french" },
  };
  const client = createSefariaClient({
    cache: false,
    fetch: async () => Response.json(value),
  });
  const supplied = createTextSegmentViewModel(value, request);
  expect(supplied.state).toBe("data");
  expect(supplied).toMatchObject({ actualLanguage: "fr" });
  expect(await loadTextSegmentViewModel(request, client)).toEqual(supplied);
});

test("candidate order does not replace the requested French edition with English", () => {
  const value = capture();
  const english = value.versions.find((version) => !version.isSource)!;
  const french = {
    ...english,
    versionTitle: "French edition",
    actualLanguage: "fr",
    languageFamilyName: "french",
  };
  value.versions = [english, french, value.versions[0]!];
  expect(preferredTranslation(value, "french")).toEqual(french);
  const first = createSourceCardViewModel(value, {
    tref: "Micah 6:8",
    translationLanguage: "french",
  });
  value.versions.reverse();
  expect(
    createSourceCardViewModel(value, {
      tref: "Micah 6:8",
      translationLanguage: "french",
    }),
  ).toEqual(first);
});

test("advertised but uncaptured preferred text is not an unavailable language", () => {
  const value = capture();
  value.available_versions.push({
    ...value.available_versions[1]!,
    languageFamilyName: "french",
    actualLanguage: "fr",
  });
  expect(() => preferredTranslation(value, "french")).toThrow("/versions");
  value.warnings = [{ french: { warning_code: 102, message: "Unavailable" } }];
  expect(() => needsTranslationFallback(value, "french")).toThrow("/warnings");
});

test("exact edition mismatch never selects another family's same-named edition", () => {
  const value = capture();
  expect(
    preferredTranslation(value, "french", value.versions[1]!.versionTitle),
  ).toBeUndefined();
  const result = createSourceCardViewModel(value, {
    tref: "Micah 6:8",
    translationLanguage: "french",
    translation: { versionTitle: value.versions[1]!.versionTitle },
  });
  expect(result.state).toBe("data");
  if (result.state === "data")
    expect(result.items[0]?.pair.state).toBe("partial");
});

test.each([400, 404])(
  "HTTP %s never becomes language fallback",
  async (status) => {
    const getText = vi.fn(async () => ({
      payload: { error: "Missing reference" },
      status,
    }));
    const result = await acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["primary", "french"],
      "french",
      "default",
      new AbortController().signal,
    );
    expect(result.status).toBe(status);
    expect(getText).toHaveBeenCalledTimes(1);
  },
);

test("network failure preserves the original cause and does not fall back", async () => {
  const error = new Error("Offline");
  const getText = vi.fn(async () => {
    throw error;
  });
  await expect(
    acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["french"],
      "french",
      "default",
      new AbortController().signal,
    ),
  ).rejects.toBe(error);
  expect(getText).toHaveBeenCalledTimes(1);
});

test("an acquired default without the requested family or missing warning is not a preferred success", async () => {
  const getText = vi.fn(async () => ({ payload: capture(), status: 200 }));
  await expect(
    acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["french"],
      "french",
      "default",
      new AbortController().signal,
    ),
  ).rejects.toThrow("/versions");
  expect(getText).toHaveBeenCalledTimes(1);
});

test("an acquired disabled fallback response without the requested family still needs the warning", async () => {
  const getText = vi.fn(async () => ({ payload: capture(), status: 200 }));
  await expect(
    acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["french"],
      "french",
      "none",
      new AbortController().signal,
    ),
  ).rejects.toThrow("/versions");
  expect(getText).toHaveBeenCalledTimes(1);
});

test("disabled fallback still rejects contradictory missing-language evidence", () => {
  const value = capture();
  value.warnings = [{ english: { warning_code: 102, message: "Unavailable" } }];
  expect(() =>
    createTextSegmentViewModel(value, {
      tref: "Micah 6:8",
      version: { translationLanguage: "english" },
      translationFallback: "none",
    }),
  ).toThrow("/warnings");
  expect(() =>
    createSourceCardViewModel(value, {
      tref: "Micah 6:8",
      translationLanguage: "english",
      translationFallback: "none",
    }),
  ).toThrow("/warnings");
});

test("malformed JSON is not permission to fall back", async () => {
  const getText = vi.fn(async () => ({
    payload: { warnings: [{ french: { warning_code: 102 } }] },
    status: 200,
  }));
  await expect(
    acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["french"],
      "french",
      "default",
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(getText).toHaveBeenCalledTimes(1);
});

test("a missing exact title is not a missing-language fallback", async () => {
  const value = capture();
  value.warnings = [
    {
      "french|Missing edition": {
        warning_code: 103,
        message: "Missing edition",
      },
    },
  ];
  const getText = vi.fn(async () => ({ payload: value, status: 200 }));
  await acquireSelectedText(
    { kind: "custom", loader: { getText } },
    "Micah 6:8",
    ["french|Missing edition"],
    "french",
    "default",
    new AbortController().signal,
  );
  expect(getText).toHaveBeenCalledTimes(1);
});

test("aborting an ignored-abort missing-language response prevents the fallback request", async () => {
  const controller = new AbortController();
  const value = capture();
  value.warnings = [{ french: { warning_code: 102, message: "Unavailable" } }];
  const getText = vi.fn(async () => {
    controller.abort(new Error("Superseded"));
    return { payload: value, status: 200 };
  });
  await expect(
    acquireSelectedText(
      { kind: "custom", loader: { getText } },
      "Micah 6:8",
      ["french"],
      "french",
      "default",
      controller.signal,
    ),
  ).rejects.toBe(controller.signal.reason);
  expect(getText).toHaveBeenCalledTimes(1);
});
