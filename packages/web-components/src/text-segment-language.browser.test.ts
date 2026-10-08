import type { CoreV3TextsResponse } from "@sefaria/api-client";
import { afterEach, expect, test, vi } from "vitest";
import micah from "../../../examples/react-vite/src/micah-6-8.json";
import { validateSuppliedComponentData } from "./component-controller.js";
import { getPreparedState } from "./prepared-state.js";
import type { SefariaTextLoadRequest } from "./data-source.js";
import { SefariaTextSegment } from "./text-segment-element.js";
import { createTextSegmentViewModel } from "./text-segment.js";

function payload(): CoreV3TextsResponse {
  return validateSuppliedComponentData<CoreV3TextsResponse>(
    { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
    structuredClone(micah),
  );
}

afterEach(() => document.body.replaceChildren());

test.each([undefined, " Hebrew ", "english"])(
  "one optional language selects primary or family (%s) equally for supplied and acquired text",
  async (language) => {
    const capture = payload();
    const getText = vi.fn(async (_request: SefariaTextLoadRequest) => ({
      payload: capture,
      status: 200,
    }));
    const acquired = new SefariaTextSegment();
    acquired.sref = "Micah 6:8";
    acquired.source = { kind: "custom", loader: { getText } };
    if (language !== undefined) acquired.setAttribute("language", language);
    document.body.append(acquired);
    await vi.waitFor(() => expect(acquired.status).toBe("ready"));
    expect(getText).toHaveBeenCalledTimes(1);
    expect(getText.mock.calls[0]?.[0]).toMatchObject({
      versions: [language?.trim().toLowerCase() ?? "primary"],
    });

    const supplied = new SefariaTextSegment();
    supplied.data = capture;
    supplied.language = language;
    supplied.source = { kind: "disabled" };
    document.body.append(supplied);
    await supplied.updateComplete;
    expect(getPreparedState(supplied)).toEqual(getPreparedState(acquired));
    expect(supplied.shadowRoot?.innerHTML).toEqual(
      acquired.shadowRoot?.innerHTML,
    );
    expect(
      createTextSegmentViewModel(capture, {
        tref: "Micah 6:8",
        version: language === undefined ? {} : { language },
      }),
    ).toEqual(getPreparedState(acquired));
    expect("translationLanguage" in acquired).toBe(false);
    expect("versionLanguage" in acquired).toBe(false);
    acquired.removeAttribute("language");
    await vi.waitFor(() =>
      expect(getText).toHaveBeenCalledTimes(language === undefined ? 1 : 2),
    );
    await vi.waitFor(() => expect(acquired.status).toBe("ready"));
    expect(
      acquired.shadowRoot?.querySelector("article")?.getAttribute("lang"),
    ).toBe("he");
  },
);

test("one language input also opts into missing-language fallback", async () => {
  const missing = payload();
  missing.versions = missing.versions.filter((version) => version.isPrimary);
  missing.available_versions = missing.available_versions.filter(
    (version) => version.languageFamilyName !== "french",
  );
  missing.warnings = [
    { french: { warning_code: 102, message: "French unavailable." } },
  ];
  const getText = vi.fn(async (_request: SefariaTextLoadRequest) => ({
    payload: getText.mock.calls.length === 1 ? missing : payload(),
    status: 200,
  }));
  const element = new SefariaTextSegment();
  element.sref = "Micah 6:8";
  element.language = "french";
  element.translationFallback = "default";
  element.source = { kind: "custom", loader: { getText } };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(getText.mock.calls.map(([request]) => request.versions)).toEqual([
    ["french"],
    ["translation"],
  ]);
  expect(
    element.shadowRoot?.querySelector("article")?.getAttribute("lang"),
  ).toBe("en");
});

test.each([undefined, "hebrew", "english"])(
  "an exact title uses primary or family evidence without fallback (%s)",
  async (language) => {
    const capture = payload();
    capture.versions.reverse();
    const version = capture.versions.find((candidate) =>
      language === undefined
        ? candidate.isPrimary
        : candidate.languageFamilyName === language,
    )!;
    const getText = vi.fn(async (_request: SefariaTextLoadRequest) => ({
      payload: capture,
      status: 200,
    }));
    const element = new SefariaTextSegment();
    element.sref = capture.ref;
    element.language = language;
    element.versionTitle = version.versionTitle.replaceAll(" ", "_");
    element.translationFallback = "default";
    element.source = { kind: "custom", loader: { getText } };
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    expect(element.selectedVersion?.actualLanguage).toBe(
      version.actualLanguage,
    );
    expect(getText.mock.calls[0]?.[0].versions).toEqual([
      `${language ?? "primary"}|${element.versionTitle}`,
    ]);
    expect(
      createTextSegmentViewModel(capture, {
        tref: capture.ref,
        version: {
          ...(language === undefined ? {} : { language }),
          versionTitle: element.versionTitle,
        },
        translationFallback: "default",
      }),
    ).toEqual(getPreparedState(element));
    element.versionTitle = "Missing edition";
    await vi.waitFor(() => expect(element.status).toBe("empty"));
    expect(getText).toHaveBeenCalledTimes(2);
  },
);

test.each([
  "",
  " ",
  "primary",
  "translation",
  "all",
  "source",
  "french|edition",
  "french,english",
])(
  "invalid unified language cancels loading and suppresses ignored-abort completion (%j)",
  async (language) => {
    let complete!: (value: {
      payload: CoreV3TextsResponse;
      status: number;
    }) => void;
    let signal!: AbortSignal;
    const getText = vi.fn(
      async (_request: SefariaTextLoadRequest, currentSignal: AbortSignal) => {
        signal = currentSignal;
        return await new Promise<{
          payload: CoreV3TextsResponse;
          status: number;
        }>((resolve) => {
          complete = resolve;
        });
      },
    );
    const element = new SefariaTextSegment();
    element.sref = "Micah 6:8";
    element.source = { kind: "custom", loader: { getText } };
    document.body.append(element);
    await vi.waitFor(() => expect(getText).toHaveBeenCalledTimes(1));
    element.language = language;
    await vi.waitFor(() => expect(element.status).toBe("error"));
    expect(signal.aborted).toBe(true);
    complete({ payload: payload(), status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.status).toBe("error");
    expect(element.shadowRoot?.querySelector("article")).toBeNull();
    expect(getText).toHaveBeenCalledTimes(1);
  },
);

test("selected fragments must match both independent selection inputs", async () => {
  const capture = payload();
  const version = capture.versions.find((candidate) => candidate.isPrimary)!;
  const getText = vi.fn();
  const element = new SefariaTextSegment();
  element.sref = capture.ref;
  element.source = { kind: "custom", loader: { getText } };
  element.data = {
    kind: "selected",
    ref: capture.ref,
    heRef: capture.heRef,
    version,
  };
  element.language = "hebrew";
  element.versionTitle = version.versionTitle;
  document.body.append(element);
  await element.updateComplete;
  expect(element.status).toBe("ready");
  element.versionTitle = "Other edition";
  await element.updateComplete;
  expect(element.status).toBe("error");
  expect(element.shadowRoot?.textContent).toContain("/version/versionTitle");
  element.versionTitle = undefined;
  element.language = "english";
  await element.updateComplete;
  expect(element.status).toBe("error");
  expect(element.shadowRoot?.textContent).toContain("/version");
  element.language = undefined;
  await element.updateComplete;
  expect(element.status).toBe("ready");
  expect(getText).not.toHaveBeenCalled();
});
