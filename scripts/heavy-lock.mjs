import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout } from "node:timers";

export const HEAVY_LOCK_DIRECTORY = path.join(
  os.tmpdir(),
  "sefaria-frontend-toolkit-heavy-stage.lock",
);

export async function withHeavyStageLock(
  action,
  {
    lockDirectory = HEAVY_LOCK_DIRECTORY,
    pid = process.pid,
    processAlive = isProcessAlive,
    wait = sleep,
    staleAfterMilliseconds = 30 * 60 * 1_000,
    initializationGraceMilliseconds = 5_000,
    now = Date.now,
  } = {},
) {
  const token = `${pid}-${randomUUID()}`;
  await acquireLock({
    lockDirectory,
    pid,
    token,
    processAlive,
    wait,
    staleAfterMilliseconds,
    initializationGraceMilliseconds,
    now,
  });
  try {
    return await action();
  } finally {
    const owner = await readOwner(lockDirectory);
    if (owner?.token === token) {
      await rm(lockDirectory, { recursive: true, force: true });
    }
  }
}

async function acquireLock(options) {
  for (;;) {
    try {
      await mkdir(options.lockDirectory);
      await writeFile(
        path.join(options.lockDirectory, "owner.json"),
        `${JSON.stringify({
          pid: options.pid,
          token: options.token,
          createdAt: options.now(),
        })}\n`,
      );
      return;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      if (error?.code !== "EEXIST") throw error;
      if (await removeStaleLock(options)) continue;
      await options.wait(250);
    }
  }
}

async function removeStaleLock({
  lockDirectory,
  processAlive,
  staleAfterMilliseconds,
  initializationGraceMilliseconds,
  now,
}) {
  const owner = await readOwner(lockDirectory);
  const info = await stat(lockDirectory).catch(() => undefined);
  const directoryAge = info === undefined ? 0 : now() - info.mtimeMs;
  if (owner === undefined && directoryAge < initializationGraceMilliseconds) {
    return false;
  }
  if (
    owner === undefined ||
    !Number.isInteger(owner.pid) ||
    !Number.isFinite(owner.createdAt) ||
    (now() - owner.createdAt > staleAfterMilliseconds &&
      !processAlive(owner.pid)) ||
    !processAlive(owner.pid)
  ) {
    await rm(lockDirectory, { recursive: true, force: true });
    return true;
  }
  return false;
}

async function readOwner(lockDirectory) {
  try {
    return JSON.parse(
      await readFile(path.join(lockDirectory, "owner.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
