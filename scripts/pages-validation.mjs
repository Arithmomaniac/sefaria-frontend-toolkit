import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * Reports whether the triggering CI push run already passed `pnpm check` on
 * the exact commit that the Pages build checked out.
 * @param {{ eventName?: string, workflowName?: string, workflowEvent?: string, conclusion?: string, headSha?: string, checkoutSha?: string }} run
 * @returns {boolean}
 */
export function isCiValidatedCommit({
  eventName,
  workflowName,
  workflowEvent,
  conclusion,
  headSha,
  checkoutSha,
}) {
  return (
    eventName === "workflow_run" &&
    workflowName === "CI" &&
    workflowEvent === "push" &&
    conclusion === "success" &&
    /^[0-9a-f]{40}$/u.test(headSha ?? "") &&
    headSha === checkoutSha
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const validated = isCiValidatedCommit({
    eventName: process.env.EVENT_NAME,
    workflowName: process.env.WORKFLOW_NAME,
    workflowEvent: process.env.WORKFLOW_EVENT,
    conclusion: process.env.WORKFLOW_CONCLUSION,
    headSha: process.env.WORKFLOW_HEAD_SHA,
    checkoutSha: execFileSync("git", ["rev-parse", "HEAD"], {
      windowsHide: true,
      encoding: "utf8",
    }).trim(),
  });
  process.stdout.write(
    validated
      ? "CI already passed pnpm check on this commit; building the site only.\n"
      : "No matching successful CI push run; running the full check.\n",
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `validated=${validated}\n`);
  }
}
