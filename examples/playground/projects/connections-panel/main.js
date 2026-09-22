import "@arithmomaniac/sefaria-web-components";
import links from "./links.js";

const panel = requireElement("#connections");
const previews = requireElement("#previews");
const selection = requireElement("#selection");
panel.sref = "Micah 6:8";
panel.withText = true;
panel.category = "Quoting Commentary";
panel.data = links;
panel.showPreviews = true;

previews.addEventListener("change", () => {
  panel.showPreviews = previews.checked;
  selection.textContent = previews.checked
    ? "Showing captured previews."
    : "Captured previews hidden without changing data.";
});
panel.addEventListener("sefaria-connection-select", (event) => {
  selection.textContent = `Selected ${event.detail.targetRef}; this supplied-data project does not navigate.`;
});

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
