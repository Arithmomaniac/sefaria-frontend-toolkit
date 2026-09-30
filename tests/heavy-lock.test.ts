import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import { withHeavyStageLock } from "../scripts/heavy-lock.mjs";

it("recovers a stale machine-wide heavy-stage lock", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(lock, { recursive: true });
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(
      path.join(lock, "owner.json"),
      JSON.stringify({ pid: 999999, createdAt: 0 }),
    ),
  );

  const result = await withHeavyStageLock(() => "ok", {
    lockDirectory: lock,
    processAlive: () => false,
    wait: async () => {},
    now: () => 1,
  });

  expect(result).toBe("ok");
  await expect(
    readFile(path.join(lock, "owner.json"), "utf8"),
  ).rejects.toMatchObject({
    code: "ENOENT",
  });
});

it("does not remove a newly created lock before owner metadata appears", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(lock, { recursive: true });
  let waited = false;

  const pending = withHeavyStageLock(() => "ok", {
    lockDirectory: lock,
    processAlive: () => true,
    wait: async () => {
      waited = true;
      await import("node:fs/promises").then(({ rm }) =>
        rm(lock, { recursive: true, force: true }),
      );
    },
    now: () => Date.now(),
  });

  await expect(pending).resolves.toBe("ok");
  expect(waited).toBe(true);
});
