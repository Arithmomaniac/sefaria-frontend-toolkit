import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");

/** New-structure documentation that the Simple English rules cover. */
export const PROSE_DIRECTORIES = [
  "use-components",
  "data-and-text-tools",
  "across-components",
  "concepts",
  "help",
];
export const PROSE_FILES = [
  "index.md",
  "reference/components.md",
  "reference/client.md",
  "reference/text-transform.md",
  "reference/package-imports-and-exports.md",
  "reference/api-corrections.md",
  "examples/composed-multi-pane-reader.md",
  "examples/linked-article.md",
  "examples/reader-inside-ai-chat.md",
  "examples/this-weeks-portion.md",
];
export const MAX_SENTENCE_WORDS = 30;

// Pages that still warn instead of failing until their Simple English pass lands.
/** Brief-required wording kept verbatim; exempt from the semicolon rule. */
export const ALLOWED_SENTENCES = new Set([
  "Types are included; no `@types` package is needed.",
]);

/** Pages that only warn. Empty: every new-structure page must pass. */
export const WARN_ONLY = new Set([]);

/** Returns the checkable prose of a Markdown page, one paragraph per entry. */
export function proseParagraphs(markdown) {
  const withoutFront = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "");
  const paragraphs = [];
  let fenced = false;
  let inScript = false;
  let current = [];
  const flush = () => {
    if (current.length > 0) paragraphs.push(current.join(" "));
    current = [];
  };
  for (const line of withoutFront.split(/\r?\n/u)) {
    if (/^\s*(```|~~~)/u.test(line)) {
      fenced = !fenced;
      flush();
      continue;
    }
    if (!fenced && /^<script\b/u.test(line.trim())) {
      inScript = true;
      flush();
      continue;
    }
    if (!fenced && /^<\/script>/u.test(line.trim())) {
      inScript = false;
      flush();
      continue;
    }
    const trimmed = line.trim();
    if (
      fenced ||
      inScript ||
      trimmed === "" ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("<") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(":::") ||
      trimmed.startsWith("> Created/edited")
    ) {
      flush();
      continue;
    }
    if (/^([-*]|\d+\.)\s/u.test(trimmed)) flush();
    current.push(trimmed.replace(/^([-*]|\d+\.)\s+/u, ""));
  }
  flush();
  return paragraphs.map((paragraph) =>
    paragraph
      .replaceAll(/``[\s\S]*?``/gu, "CODE")
      .replaceAll(/``[\s\S]*?``/gu, "CODE")
      .replaceAll(/`[^`]*`/gu, "CODE")
      .replaceAll(/\]\([^)]*\)/gu, "]")
      .replaceAll(/<[^>]+>/gu, "")
      .replaceAll(/\{[.#][^}]*\}/gu, ""),
  );
}

/** Lists semicolons and long sentences in one page's prose. */
export function lintProse(markdown) {
  const issues = [];
  for (const paragraph of proseParagraphs(markdown)) {
    let checked = paragraph;
    for (const allowed of ALLOWED_SENTENCES) {
      checked = checked
        .replace(allowed, "")
        .replace(allowed.replace(/`[^`]*`/gu, "CODE"), "");
    }
    if (checked.includes(";")) {
      issues.push({ kind: "semicolon", text: paragraph });
    }
    for (const sentence of paragraph.split(/(?<=[.!?])\s+(?=[A-Z"“(*[`])/u)) {
      const words = sentence.split(/\s+/u).filter(Boolean).length;
      if (words > MAX_SENTENCE_WORDS) {
        issues.push({ kind: `${words} words`, text: sentence });
      }
    }
  }
  return issues;
}

async function listPages() {
  const pages = [...PROSE_FILES];
  for (const directory of PROSE_DIRECTORIES) {
    const pending = [directory];
    while (pending.length > 0) {
      const current = pending.pop();
      for (const entry of await readdir(path.join(docs, current), {
        withFileTypes: true,
      })) {
        const relative = `${current}/${entry.name}`;
        if (entry.isDirectory()) pending.push(relative);
        else if (entry.name.endsWith(".md")) pages.push(relative);
      }
    }
  }
  return pages.sort();
}

const warnOnly = (page) =>
  WARN_ONLY.has(page) || WARN_ONLY.has(page.split("/")[0]);

if (process.argv[1] === import.meta.filename) {
  let failures = 0;
  let warnings = 0;
  for (const page of await listPages()) {
    const source = await readFile(path.join(docs, page), "utf8");
    if (/^stub: true$/mu.test(source)) continue;
    for (const issue of lintProse(source)) {
      const label = warnOnly(page) ? "warning" : "error";
      if (label === "error") failures += 1;
      else warnings += 1;
      process.stdout.write(
        `${label}: docs/${page}: ${issue.kind}: ${issue.text.slice(0, 160)}\n`,
      );
    }
  }
  process.stdout.write(
    `Prose lint: ${failures} errors, ${warnings} warnings (semicolons; sentences over ${MAX_SENTENCE_WORDS} words).\n`,
  );
  if (failures > 0) process.exitCode = 1;
}
