import "./style.css";
import { startReaderWorkspace } from "./app.js";
import { initialReaderReference } from "./initial-reference.js";

const initialRef = initialReaderReference(location.search);
const input = document.querySelector<HTMLInputElement>(
  '#reader-form input[name="tref"]',
);
if (!input) {
  throw new Error("The Reader reference input is missing.");
}
input.value = initialRef;
startReaderWorkspace(document);
