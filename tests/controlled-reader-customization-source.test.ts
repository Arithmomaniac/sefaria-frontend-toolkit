import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "vitest";

const repository = path.resolve(import.meta.dirname, "..");

test("uses public Reader state without private DOM event scraping", async () => {
  const source = await readFile(
    path.join(repository, "examples/reader/src/controlled-app.ts"),
    "utf8",
  );

  expect(source).not.toContain("shadowRoot");
  expect(source).not.toContain("composedPath");
  expect(source).toContain("snapshot.reader.selectedTarget?.ref");
});
