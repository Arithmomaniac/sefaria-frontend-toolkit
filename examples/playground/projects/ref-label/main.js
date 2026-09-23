import "@arithmomaniac/sefaria-web-components";
import { resolved, unresolved } from "./reference.js";

const label = requireElement("#label");
const state = requireElement("#state");
label.setAttribute("sref", "Micah 6:8");
label.setAttribute("linked", "");

const show = (payload, message) => {
  label.data = payload;
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
