import { zCoreV3TextsResponse } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import payload from "./micah-6-8.js";

const segment = requireElement("#segment");
const swap = requireElement("#swap");
const order = requireElement("#order");
segment.data = zCoreV3TextsResponse.parse(payload);
segment.setAttribute("primary-version-title", "Deterministic example Hebrew");
segment.setAttribute(
  "translation-version-title",
  "Deterministic example translation",
);
segment.setAttribute("layout", "side-by-side");

swap.addEventListener("click", () => {
  const translationFirst =
    segment.getAttribute("side-order") !== "translation-first";
  segment.setAttribute(
    "side-order",
    translationFirst ? "translation-first" : "primary-first",
  );
  swap.textContent = translationFirst
    ? "Show primary first"
    : "Show translation first";
  order.textContent = translationFirst
    ? "Translation side first."
    : "Primary side first.";
});

function requireElement(selector) {
  const element = globalThis.document.querySelector(selector);
  if (!element) throw new Error(`The example requires ${selector}.`);
  return element;
}
