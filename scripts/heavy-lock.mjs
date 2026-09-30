import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
    now,
  });
  try {
    return await action();
  } finally {
    const owner = await readOwner(lockDirectory);
    if (owner?.token === token) {
      await retireLock(lockDirectory, token);
    }
  }
}

async function acquireLock(options) {
  const pendingDirectory = `${options.lockDirectory}.pending-${options.token}`;
  for (;;) {
    await mkdir(pendingDirectory, { recursive: true });
    await writeFile(
      path.join(pendingDirectory, "owner.json"),
      `${JSON.stringify({
        pid: options.pid,
        token: options.token,
        createdAt: options.now(),
      })}\n`,
    );
    try {
      // Publishing a fully written directory means the lock is never observable
      // without its owner, and renaming onto a nonempty directory fails on
      // POSIX and Windows alike.
      await rename(pendingDirectory, options.lockDirectory);
      const owner = await readOwner(options.lockDirectory);
      if (owner?.token === options.token) return;
    } catch (error) {
      if (!["EEXIST", "ENOTEMPTY", "EPERM", "EACCES"].includes(error?.code)) {
        await rm(pendingDirectory, { recursive: true, force: true });
        throw error;
      }
    }
    if (await removeStaleLock(options)) continue;
    await options.wait(250);
  }
}

async function removeStaleLock({ lockDirectory, processAlive }) {
  const owner = await readOwner(lockDirectory);
  // Locks without a token were not created by this protocol; leave them for
  // manual removal rather than guessing their generation.
  if (typeof owner?.token !== "string" || owner.token.length === 0) {
    return false;
  }
  if (
    !Number.isInteger(owner.pid) ||
    !Number.isFinite(owner.createdAt) ||
    !processAlive(owner.pid)
  ) {
    return retireLock(lockDirectory, owner.token);
  }
  return false;
}

// Every relinquished generation, whether released or recovered, keeps a
// nonempty tombstone: a waiter holding an outdated observation of that
// generation cannot rename a successor lock onto the existing target.
export async function retireLock(lockDirectory, generation) {
  const tombstone = `${lockDirectory}.retired-${generation.replace(/[^\w.-]/g, "_")}`;
  try {
    await rename(lockDirectory, tombstone);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    return false;
  }
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
