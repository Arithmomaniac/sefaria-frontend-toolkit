import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";

import { init, parse } from "es-module-lexer";
import { build } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const publicEntries = {
  "@arithmomaniac/sefaria-client": "client",
  "@arithmomaniac/sefaria-client/validation": "client-validation",
  "@arithmomaniac/sefaria-web-components": "web-components",
  "@arithmomaniac/sefaria-web-components/source-card": "source-card",
};
const output = await build({
  configFile: false,
  logLevel: "warn",
  build: {
    write: false,
    minify: false,
    rollupOptions: {
      input: Object.fromEntries(
        Object.values(publicEntries).map((name) => [
          name,
          path.join(root, "src", "graph", `${name}.ts`),
        ]),
      ),
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        entryFileNames: "entry-[name].js",
        chunkFileNames: "chunk-[hash].js",
      },
    },
  },
});
if (Array.isArray(output)) {
  throw new Error("The playground runtime graph must produce one ES output.");
}

await init;
assertLexerReplacementSemantics();
const chunks = output.output.filter((item) => item.type === "chunk");
const chunkByFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
const synthetic = (fileName) => `@sefaria-playground/runtime/${fileName}`;
const imports = {};
for (const chunk of chunks) {
  const expectedEdges = new Set([...chunk.imports, ...chunk.dynamicImports]);
  const parsed = parse(chunk.code)[0].filter((entry) => entry.n !== undefined);
  const replacements = [];
  for (const entry of parsed) {
    const specifier = entry.n;
    const fileName = specifier.startsWith("./")
      ? specifier.slice(2)
      : specifier;
    if (!expectedEdges.has(fileName)) {
      throw new Error(`Unsupported runtime graph edge ${specifier}.`);
    }
    if (!chunkByFile.has(fileName)) {
      throw new Error(`Missing runtime graph chunk ${fileName}.`);
    }
    replacements.push({
      start: entry.s,
      end: entry.e,
      value: formatReplacement(entry, synthetic(fileName)),
    });
    expectedEdges.delete(fileName);
  }
  if (expectedEdges.size > 0) {
    throw new Error(
      `Unparsed runtime graph edges: ${[...expectedEdges].join(", ")}.`,
    );
  }
  let code = chunk.code;
  for (const replacement of replacements.sort(
    (left, right) => right.start - left.start,
  )) {
    code = `${code.slice(0, replacement.start)}${replacement.value}${code.slice(replacement.end)}`;
  }
  imports[synthetic(chunk.fileName)] = toDataUrl(code);
}
for (const [specifier, entryName] of Object.entries(publicEntries)) {
  const entry = chunks.find(
    (chunk) => chunk.isEntry && chunk.name === entryName,
  );
  if (!entry) throw new Error(`Missing runtime graph entry ${entryName}.`);
  imports[specifier] = imports[synthetic(entry.fileName)];
}

const destination = path.join(root, "public", "runtime-graph.json");
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(
  destination,
  `${JSON.stringify({ version: 1, imports }, null, 2)}\n`,
);

function toDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}

function formatReplacement(entry, specifier) {
  return entry.d === -1 ? specifier : JSON.stringify(specifier);
}

function assertLexerReplacementSemantics() {
  const fixture =
    'import "./static.js"; const dynamic = import("./dynamic.js");';
  const entries = parse(fixture)[0].filter((entry) => entry.n !== undefined);
  let rewritten = fixture;
  for (const entry of entries.sort((left, right) => right.s - left.s)) {
    const replacement = formatReplacement(entry, `mapped:${entry.n}`);
    rewritten = `${rewritten.slice(0, entry.s)}${replacement}${rewritten.slice(entry.e)}`;
  }
  const rewrittenEntries = parse(rewritten)[0];
  if (
    rewrittenEntries[0]?.n !== "mapped:./static.js" ||
    rewrittenEntries[1]?.n !== "mapped:./dynamic.js"
  ) {
    throw new Error("Runtime graph import rewriting failed qualification.");
  }
}
