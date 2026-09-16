import "./style.css";
import { startControlledReader } from "./controlled-app.js";
import { initialReaderReference } from "./initial-reference.js";

const initialRef = initialReaderReference(location.search);
const input = document.querySelector<HTMLInputElement>(
  '#reader-form input[name="tref"]',
);
if (!input) {
  throw new Error("The controlled Reader reference input is missing.");
}
input.value = initialRef;
startControlledReader(document);
