import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { toJavaScript } from "./strip-types.mjs";

// Documentation-site programs that must run from the packed packages.
const programs = [
  {
    name: "client-first-success",
    expected: [
      "Micah 6:8 · he · Miqra according to the Masorah",
      "Invalid at /isSpanning: Invalid input: expected boolean, received string",
    ],
  },
  {
    name: "text-transform-first-success",
    expected: ['<span data-sefaria-mam="setumah">{ס}</span>'],
  },
  {
    name: "client-and-text-first-success",
    expected: [
      "THE JPS TANAKH: Gender-Sensitive Edition:",
      "1 footnote(s) kept separately.",
    ],
  },
];

const offlineFetch = `
import { readFileSync } from "node:fs";
const { payload } = JSON.parse(readFileSync(new URL("./micah-6-8.json", import.meta.url), "utf8"));
globalThis.fetch = async (input) => {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith("https://www.sefaria.org/api/v3/texts/Micah%206%3A8")) {
    throw new TypeError("Offline smoke refused " + url);
  }
  const versions = new URL(url).searchParams.getAll("version");
  const body = versions.length === 1 && versions[0] === "translation"
    ? { ...payload, versions: payload.versions.filter((version) => !version.isPrimary) }
    : payload;
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
};
`;

export async function stageSiteSnippetConsumer({
  repository,
  consumer,
  dependencies,
}) {
  await mkdir(consumer, { recursive: true });
  await writeFile(
    path.join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "sefaria-toolkit-tarball-site-snippets-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies,
      },
      null,
      2,
    )}\n`,
  );
  await copyFile(
    path.join(
      repository,
      "tests",
      "site-fixtures",
      "micah-6-8-2026-09-28.json",
    ),
    path.join(consumer, "micah-6-8.json"),
  );
  await writeFile(path.join(consumer, "offline-fetch.mjs"), offlineFetch);
  for (const { name } of programs) {
    const typescript = await readFile(
      path.join(repository, "examples", "site-snippets", `${name}.ts`),
      "utf8",
    );
    await writeFile(path.join(consumer, `${name}.ts`), typescript);
    await writeFile(
      path.join(consumer, `${name}.mjs`),
      await toJavaScript(typescript),
    );
  }
}

export function smokeSiteSnippets(consumer) {
  for (const { name, expected } of programs) {
    const outputs = [`${name}.mjs`, `${name}.ts`].map((file) => {
      const result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "--import", "./offline-fetch.mjs", file],
        { cwd: consumer, encoding: "utf8", windowsHide: true },
      );
      if (result.status !== 0) {
        throw new Error(`${file} failed:\n${result.stderr}`);
      }
      return result.stdout;
    });
    if (outputs[0] !== outputs[1]) {
      throw new Error(`${name}: JavaScript and TypeScript outputs differ.`);
    }
    for (const line of expected) {
      if (!outputs[0].includes(line)) {
        throw new Error(`${name}: expected ${JSON.stringify(line)}.`);
      }
    }
  }
}
