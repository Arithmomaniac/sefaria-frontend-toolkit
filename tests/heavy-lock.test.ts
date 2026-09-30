import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import {
  isProcessAlive,
  retireLock,
  withHeavyStageLock,
} from "../scripts/heavy-lock.mjs";

it("recovers a stale machine-wide heavy-stage lock", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(lock, { recursive: true });
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(
      path.join(lock, "owner.json"),
      JSON.stringify({ pid: 999999, token: "dead", createdAt: 0 }),
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

it("allows only one concurrent holder during stale-lock recovery", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(lock, { recursive: true });
  await writeFile(
    path.join(lock, "owner.json"),
    JSON.stringify({ pid: 999999, token: "stale", createdAt: 0 }),
  );

  let active = 0;
  let maximumActive = 0;
  let firstRelease!: () => void;
  const firstEntered = new Promise<void>((resolve) => {
    firstRelease = resolve;
  });

  async function action() {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await firstEntered;
    active -= 1;
  }

  const first = withHeavyStageLock(action, {
    lockDirectory: lock,
    processAlive: (pid: number) => pid !== 999999,
    wait: async () => {},
    now: () => 1_000,
  });
  const second = withHeavyStageLock(action, {
    lockDirectory: lock,
    processAlive: (pid: number) => pid !== 999999,
    wait: async () => {},
    now: () => 1_000,
  });

  await Promise.resolve();
  firstRelease();
  await Promise.all([first, second]);
  expect(maximumActive).toBe(1);
});

it("treats EPERM from process probing as an alive process", () => {
  const originalKill = process.kill;
  process.kill = (() => {
    const error = new Error("operation not permitted") as NodeJS.ErrnoException;
    error.code = "EPERM";
    throw error;
  }) as typeof process.kill;
  try {
    expect(isProcessAlive(123)).toBe(true);
  } finally {
    process.kill = originalKill;
  }
});

it("cannot retire a successor lock after another waiter already retired the stale owner", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(`${lock}.retired-stale`, { recursive: true });
  await writeFile(path.join(`${lock}.retired-stale`, "owner.json"), "{}");
  await mkdir(lock, { recursive: true });
  const live = JSON.stringify({
    pid: process.pid,
    token: "live",
    createdAt: 1,
  });
  await writeFile(path.join(lock, "owner.json"), live);

  await expect(retireLock(lock, "stale")).resolves.toBe(false);
  await expect(readFile(path.join(lock, "owner.json"), "utf8")).resolves.toBe(
    live,
  );
});

it("never reclaims a lock without a valid owner token", async () => {
  const root = path.join(".artifacts", `heavy-lock-${crypto.randomUUID()}`);
  const lock = path.join(root, "lock");
  await mkdir(lock, { recursive: true });
  await writeFile(
    path.join(lock, "owner.json"),
    JSON.stringify({ pid: 999999, createdAt: 0 }),
  );
  let waits = 0;

  const pending = withHeavyStageLock(() => "ok", {
    lockDirectory: lock,
    processAlive: () => false,
    wait: async () => {
      waits += 1;
      if (waits === 3) {
        await import("node:fs/promises").then(({ rm }) =>
          rm(lock, { recursive: true, force: true }),
        );
      }
    },
    now: () => Date.now() + 60 * 60 * 1_000,
  });

  await expect(pending).resolves.toBe("ok");
  expect(waits).toBe(3);
});
