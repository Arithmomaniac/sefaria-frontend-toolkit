import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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
      const owner = await readOwner(options.lockDirectory);
      if (owner?.token !== options.token) continue;
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
  const recoveryLockDirectory = `${lockDirectory}.recovery`;
  try {
    await mkdir(recoveryLockDirectory);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const recoveryInfo = await stat(recoveryLockDirectory).catch(
      () => undefined,
    );
    if (recoveryInfo && now() - recoveryInfo.mtimeMs > staleAfterMilliseconds) {
      await rm(recoveryLockDirectory, { recursive: true, force: true });
    }
    return false;
  }

  try {
    return await removeStaleLockWithRecoveryOwnership({
      lockDirectory,
      processAlive,
      staleAfterMilliseconds,
      initializationGraceMilliseconds,
      now,
    });
  } finally {
    await rm(recoveryLockDirectory, { recursive: true, force: true });
  }
}

async function removeStaleLockWithRecoveryOwnership({
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
    const currentOwner = await readOwner(lockDirectory);
    if (!sameOwner(currentOwner, owner)) return false;
    const trashDirectory = `${lockDirectory}.stale-${process.pid}-${randomUUID()}`;
    try {
      await rename(lockDirectory, trashDirectory);
    } catch (error) {
      if (error?.code === "ENOENT") return true;
      if (error?.code !== "EPERM") throw error;
      if (!sameOwner(await readOwner(lockDirectory), owner)) return false;
      await rm(lockDirectory, { recursive: true, force: true });
      return true;
    }
    await rm(trashDirectory, { recursive: true, force: true });
    return true;
  }
  return false;
}

function sameOwner(left, right) {
  return (
    left?.pid === right?.pid &&
    left?.token === right?.token &&
    left?.createdAt === right?.createdAt
  );
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

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "EPERM") return true;
    if (error?.code === "ESRCH") return false;
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
