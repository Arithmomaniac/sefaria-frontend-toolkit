const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const span = (kind: string, text: string) =>
  `<span class="tok-${kind}">${escapeHtml(text)}</span>`;

const jsonToken =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function highlightJson(source: string): string {
  let html = "";
  let last = 0;
  for (const match of source.matchAll(jsonToken)) {
    html += escapeHtml(source.slice(last, match.index));
    const [whole, string, colon, literal, number] = match;
    if (string !== undefined) {
      html += span(colon ? "key" : "string", string) + (colon ?? "");
    } else if (literal !== undefined) {
      html += span("literal", literal);
    } else if (number !== undefined) {
      html += span("number", number);
    }
    last = match.index + whole.length;
  }
  return html + escapeHtml(source.slice(last));
}

const hebrewRun =
  /[\u0590-\u05FF\uFB1D-\uFB4F](?:[\u0590-\u05FF\uFB1D-\uFB4F\s־׃,.;:!?"'-]*[\u0590-\u05FF\uFB1D-\uFB4F])?/g;

function textRun(text: string): string {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(hebrewRun)) {
    html += escapeHtml(text.slice(last, match.index));
    html += `<bdi dir="rtl">${escapeHtml(match[0])}</bdi>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

const htmlTag = /<\/?([\w-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)(\s*)\/?>/g;
const htmlAttribute = /(\s+)([\w:-]+)(?:=("[^"]*"))?/g;

const cssToken =
  /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|((?:^|[;{])\s*)(--[\w-]+|[a-z-]+)(?=\s*:(?![^;{}]*\{))|([^{};\s][^{};]*?)(?=\s*\{)|(#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|rem|em|%|ms|s|deg|vh|vw)?\b)/gm;

export function highlightCss(source: string): string {
  let html = "";
  let last = 0;
  for (const match of source.matchAll(cssToken)) {
    html += escapeHtml(source.slice(last, match.index));
    const [whole, comment, string, prefix, property, selector, number] = match;
    if (comment !== undefined) html += span("comment", comment);
    else if (string !== undefined) html += span("string", string);
    else if (property !== undefined)
      html += escapeHtml(prefix) + span("attr", property);
    else if (selector !== undefined) html += span("tag", selector);
    else if (number !== undefined) html += span("number", number);
    last = match.index + whole.length;
  }
  return html + escapeHtml(source.slice(last));
}

export interface HighlightOptions {
  readonly prettyBreaks?: boolean;
}

export function highlightHtml(
  source: string,
  options: HighlightOptions = {},
): string {
  let html = "";
  let last = 0;
  let rawBlock: string | undefined;
  const between = (text: string) =>
    rawBlock === "style"
      ? highlightCss(text)
      : rawBlock === "script"
        ? highlightScript(text)
        : textRun(text);
  for (const match of source.matchAll(htmlTag)) {
    html += between(source.slice(last, match.index));
    const [whole, name, attributes, trailing] = match;
    const open = whole.startsWith("</") ? "</" : "<";
    const close = whole.endsWith("/>") ? "/>" : ">";
    const lower = name.toLowerCase();
    rawBlock =
      open === "<" && (lower === "style" || lower === "script")
        ? lower
        : undefined;
    let attributeHtml = "";
    for (const attribute of attributes.matchAll(htmlAttribute)) {
      attributeHtml += attribute[1] + span("attr", attribute[2]);
      if (attribute[3] !== undefined) {
        attributeHtml += `=${span("string", attribute[3])}`;
      }
    }
    html +=
      span("punct", open) +
      span("tag", name) +
      attributeHtml +
      trailing +
      span("punct", close);
    last = match.index + whole.length;
    if (
      options.prettyBreaks &&
      /^<br\b|^<\//.test(whole) &&
      last < source.length &&
      !/^\s*\n/.test(source.slice(last))
    )
      html += "\n";
  }
  return html + textRun(source.slice(last));
}

const scriptToken =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(import|export|from|const|let|var|function|return|await|async|if|else|for|of|new|type|interface|as|default|class|extends|throw|try|catch)\b|\b(true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b/g;

export function highlightScript(source: string): string {
  let html = "";
  let last = 0;
  for (const match of source.matchAll(scriptToken)) {
    html += escapeHtml(source.slice(last, match.index));
    const [whole, comment, string, keyword, literal, number] = match;
    const kind = comment
      ? "comment"
      : string
        ? "string"
        : keyword
          ? "tag"
          : literal
            ? "literal"
            : number
              ? "number"
              : "punct";
    html += span(kind, whole);
    last = match.index + whole.length;
  }
  return html + escapeHtml(source.slice(last));
}

export type CodeLanguage = "json" | "html" | "js" | "ts";

export function highlight(
  source: string,
  language: CodeLanguage,
  options: HighlightOptions = {},
): string {
  if (language === "json") return highlightJson(source);
  if (language === "html") return highlightHtml(source, options);
  return highlightScript(source);
}
