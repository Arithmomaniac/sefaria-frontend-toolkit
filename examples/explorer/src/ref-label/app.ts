import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  RefLabelLanguage,
  RefLabelController,
  SefariaRefLabel,
} from "@arithmomaniac/sefaria-web-components";
import { bindRefLabelController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createRefLabelController } from "@arithmomaniac/sefaria-web-components/ref-label";

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
  controller: RefLabelController = createRefLabelController(
    createSefariaClient(),
  ),
): RefLabelLiveDemo {
  return startLiveDemo(root, {
    title: "Live reference-label demo",
    description:
      "The host calls the deployed Sefaria API and supplies the result to a request-free Web Component.",
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
    createResultElement: (document) =>
      document.createElement("sefaria-ref-label") as SefariaRefLabel,
    controller,
    bindController: (result) => {
      bindRefLabelController(result, controller);
    },
    createRequest: (form) => ({
      tref: requireNamedInput(form, "tref").value.trim(),
    }),
    formatRequest: (request) => request.tref,
    configureResult: (result, form) => {
      result.labelLanguage = requireLabelLanguage(
        requireNamedSelect(form, "labelLanguage").value,
      );
      result.linked = requireNamedInput(form, "linked").checked;
    },
  });
}

function requireLabelLanguage(value: string): RefLabelLanguage {
  if (value === "english" || value === "hebrew" || value === "both") {
    return value;
  }
  throw new TypeError(`Unsupported label language "${value}".`);
}
