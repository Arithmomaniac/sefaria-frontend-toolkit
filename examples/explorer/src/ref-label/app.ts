import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  RefLabelLanguage,
  SefariaRefLabel,
} from "@arithmomaniac/sefaria-web-components";
import type { RefLabelRequest } from "@arithmomaniac/sefaria-web-components/ref-label";
import {
  startLiveDemo,
  requireNamedInput,
  requireNamedSelect,
} from "../../../../demos/live-demo-core.js";

/** Controls the interactive live reference-label demonstration. */
export interface RefLabelLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the demo controls to the production reference-label factory. */
export function startRefLabelLiveDemo(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): RefLabelLiveDemo {
  return startLiveDemo(root, {
    title: "Live reference-label demo",
    description:
      "The activated Web Component loads the reference from the deployed Sefaria API.",
    requestHeading: "Choose a reference",
    presetsLabel: "Example references",
    controls: [
      {
        kind: "text",
        name: "tref",
        label: "Sefaria reference",
        value: "Micah 6:8",
        required: true,
      },
      {
        kind: "select",
        name: "labelLanguage",
        label: "Label language",
        value: "both",
        options: [
          { value: "english", label: "English" },
          { value: "hebrew", label: "Hebrew" },
          { value: "both", label: "Both" },
        ],
      },
      {
        kind: "checkbox",
        name: "linked",
        label: "Link behavior",
        description: "Render a canonical link",
        checked: true,
      },
    ],
    presets: [
      {
        id: "segment",
        label: "Segment",
        values: { tref: "Genesis 1:1" },
      },
      {
        id: "range",
        label: "Range",
        values: { tref: "Genesis 1:1-3" },
      },
      {
        id: "spanning",
        label: "Spanning range",
        values: { tref: "Genesis 1:31-2:2" },
      },
      {
        id: "commentary",
        label: "Commentary",
        values: { tref: "Rashi on Genesis 1:1:1" },
      },
      {
        id: "empty",
        label: "Unresolvable",
        values: { tref: "__missing_ref_label_probe__" },
      },
    ],
    submitLabel: "Load from Sefaria",
    createResultElement: (document) => {
      const result = document.createElement(
        "sefaria-ref-label",
      ) as SefariaRefLabel;
      result.acquisition = { kind: "client", client };
      return result;
    },
    load: loadReference,
    createRequest: (form) => ({
      tref: requireNamedInput(form, "tref").value.trim(),
    }),
    formatRequest: (request) => request.tref,
    configureResult: (result, form) => {
      result.setAttribute(
        "label-language",
        requireLabelLanguage(requireNamedSelect(form, "labelLanguage").value),
      );
      result.toggleAttribute(
        "linked",
        requireNamedInput(form, "linked").checked,
      );
    },
  });
}

async function loadReference(
  result: SefariaRefLabel,
  request: RefLabelRequest,
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
  result.addEventListener("sefaria-ref-label-error", onError);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    if (result.sref === request.tref) {
      result.setAttribute("sref", "");
      await result.updateComplete;
    }
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
    result.removeEventListener("sefaria-ref-label-error", onError);
    signal.removeEventListener("abort", onAbort);
  }
}

function requireLabelLanguage(value: string): RefLabelLanguage {
  if (value === "english" || value === "hebrew" || value === "both") {
    return value;
  }
  throw new TypeError(`Unsupported label language "${value}".`);
}
