import { zCoreRefResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import { bindRefLabelController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createRefLabelController } from "@arithmomaniac/sefaria-web-components/ref-label";
import { resolved, unresolved } from "./reference.js";

const label = requireElement("#label");
const state = requireElement("#state");
const controller = createRefLabelController();
bindRefLabelController(label, controller);
label.linked = true;

const show = (payload, message) => {
  controller.setSuppliedData(
    { tref: "Micah 6:8" },
    zCoreRefResponse.parse(payload),
  );
  state.textContent = message;
};
requireElement("#resolved").addEventListener("click", () =>
  show(resolved, "Showing the resolved canonical link."),
);
requireElement("#unresolved").addEventListener("click", () =>
  show(unresolved, "Showing the endpoint's unresolved state."),
);
show(resolved, "Showing the resolved canonical link.");

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
