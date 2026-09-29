import { execFileSync } from "node:child_process";
import { defineLoader } from "vitepress";

export interface ReleaseData {
  readonly commit: string | null;
}

export declare const data: ReleaseData;

export default defineLoader({
  load(): ReleaseData {
    const fromEnvironment = process.env.GITHUB_SHA;
    if (fromEnvironment && /^[0-9a-f]{40}$/u.test(fromEnvironment)) {
      return { commit: fromEnvironment };
    }
    try {
      const commit = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      return { commit: /^[0-9a-f]{40}$/u.test(commit) ? commit : null };
    } catch {
      return { commit: null };
    }
  },
});
