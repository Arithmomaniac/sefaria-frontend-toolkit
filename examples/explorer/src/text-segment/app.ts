import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaTextSegment } from "@arithmomaniac/sefaria-web-components";
import type { TextSegmentRequest } from "@arithmomaniac/sefaria-web-components/text-segment";

import {
  setOptionalElementAttribute,
  startLiveDemo,
  requireNamedInput,
} from "../../../../demos/live-demo-core.js";

/** Controls the interactive live text-segment demonstration. */
export interface TextSegmentLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the demo form and presets to the production text-segment factory. */
export function startTextSegmentLiveDemo(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): TextSegmentLiveDemo {
  return startLiveDemo(root, {
    title: "Live text-segment demo",
    description:
      "The activated Web Component loads text from the deployed Sefaria API.",
    requestHeading: "Choose a request",
    presetsLabel: "Example requests",
    controls: [
      {
        kind: "text",
        name: "tref",
        label: "Sefaria reference",
        value: "Micah 6:8",
        required: true,
      },
      {
        kind: "text",
        name: "language",
        label: "Language",
        value: "hebrew",
        required: true,
      },
      {
        kind: "text",
        name: "versionTitle",
        label: "Exact version title",
        value: "",
        placeholder: "Optional exact version title",
      },
    ],
    presets: [
      {
        id: "hebrew",
        label: "Hebrew segment",
        values: { tref: "Genesis 1:1", language: "hebrew", versionTitle: "" },
      },
      {
        id: "english-footnote",
        label: "English static footnote",
        values: {
          tref: "Genesis 1:1",
          language: "english",
          versionTitle:
            "The Contemporary Torah, Jewish Publication Society, 2006",
        },
      },
      {
        id: "hebrew-markup",
        label: "Retained Hebrew markup",
        values: {
          tref: "Obadiah 1:1",
          language: "hebrew",
          versionTitle: "Miqra according to the Masorah",
        },
      },
      {
        id: "missing",
        label: "Missing language",
        values: { tref: "Genesis 1:1", language: "klingon", versionTitle: "" },
      },
      {
        id: "range",
        label: "Wrong granularity",
        values: { tref: "Genesis 1", language: "hebrew", versionTitle: "" },
      },
    ],
    submitLabel: "Load from Sefaria",
    createResultElement: (document) => {
      const result = document.createElement(
        "sefaria-text-segment",
      ) as SefariaTextSegment;
      result.acquisition = { kind: "client", client };
      return result;
    },
    load: loadText,
    createRequest: (form) =>
      createRequest(
        requireNamedInput(form, "tref").value,
        requireNamedInput(form, "language").value,
        requireNamedInput(form, "versionTitle").value,
      ),
    formatRequest,
  });
}

async function loadText(
  result: SefariaTextSegment,
  request: TextSegmentRequest,
  signal: AbortSignal,
): Promise<string> {
  let acquisitionError: unknown;
  const onError = (event: Event): void => {
    acquisitionError = (event as CustomEvent<{ readonly error: unknown }>)
      .detail.error;
  };
  const onAbort = (): void => {
    if (result.sref === request.tref) result.setAttribute("sref", "");
  };
  result.addEventListener("sefaria-text-segment-error", onError);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    if (
      result.sref === request.tref &&
      result.versionLanguage === request.version.language &&
      result.versionTitle === request.version.versionTitle
    ) {
      result.setAttribute("sref", "");
      await result.updateComplete;
    }
    setOptionalElementAttribute(
      result,
      "version-language",
      request.version.language,
    );
    setOptionalElementAttribute(
      result,
      "version-title",
      request.version.versionTitle,
    );
    result.setAttribute("sref", request.tref);
    await result.updateComplete;
    while (!signal.aborted && result.status === "loading") {
      await new Promise((resolve) => setTimeout(resolve));
      await result.updateComplete;
    }

    await result.updateComplete;
    if (acquisitionError !== undefined) throw acquisitionError;
    return result.status;
  } finally {
    result.removeEventListener("sefaria-text-segment-error", onError);
    signal.removeEventListener("abort", onAbort);
  }
}

function createRequest(
  tref: string,
  language: string,
  versionTitle: string,
): TextSegmentRequest {
  const trimmedVersionTitle = versionTitle.trim();
  return {
    tref: tref.trim(),
    version:
      trimmedVersionTitle.length === 0
        ? { language: language.trim() }
        : {
            language: language.trim(),
            versionTitle: trimmedVersionTitle,
          },
  };
}

function formatRequest(request: TextSegmentRequest): string {
  const version =
    request.version.versionTitle === undefined
      ? request.version.language
      : `${request.version.language} | ${request.version.versionTitle}`;
  return `${request.tref} (${version})`;
}
