export const BASELINE_TEST_INVENTORY_SOURCE =
  "Arithmomaniac/sefaria-web-components@7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7";
export const PRE_RETIREMENT_SHOWCASE_INVENTORY_SOURCE =
  "Arithmomaniac/sefaria-web-components@d7e2d59645ebf7427dcff2cbdd78073e2e7df58c";

export const BASELINE_TEST_INVENTORY = Object.freeze([
  "demos/explorer/src/authored/development-status.browser.test.ts",
  "demos/explorer/src/bilingual-segment/app.browser.test.ts",
  "demos/explorer/src/connections/app.browser.test.ts",
  "demos/explorer/src/ref-label/app.browser.test.ts",
  "demos/explorer/src/source-card/app.browser.test.ts",
  "demos/explorer/src/text-segment/app.browser.test.ts",
  "demos/linker/src/detection.test.ts",
  "demos/linker/src/linker.browser.test.ts",
  "demos/live-demo-core.browser.test.ts",
  "demos/mcp/app/src/app.browser.test.ts",
  "demos/mcp/scripts/launch-vscode-demo.test.ts",
  "demos/mcp/scripts/vscode-capture-layout.test.ts",
  "demos/mcp/scripts/vscode-demo-profile.test.ts",
  "demos/mcp/scripts/vscode-video-recorder.test.ts",
  "demos/reader-workspace/src/app.browser.test.ts",
  "demos/reader-workspace/src/workspace-state.test.ts",
  "demos/showcase/loop.test.ts",
  "demos/showcase/presentation.test.ts",
  "demos/showcase/scripts/build-pages-plan.test.ts",
  "demos/showcase/src/factory-binding.browser.test.tsx",
  "demos/showcase/src/presentation-navigation.browser.test.ts",
  "demos/showcase/src/presentation-navigation.test.ts",
  "demos/showcase/src/viewport-guard.browser.test.ts",
  "demos/showcase/src/viewport-guard.test.ts",
  "demos/showcase/src/workspace-preview.browser.test.ts",
  "packages/client/test/cache.browser.test.ts",
  "packages/client/test/client.test.ts",
  "packages/client/test/generation.test.ts",
  "packages/client/test/payload-agreement.test.ts",
  "packages/client/test/refresh-fixtures.test.ts",
  "packages/client/test/type-contract.test.ts",
  "packages/client/test/validation.test.ts",
  "packages/components/src/bilingual-segment.browser.test.ts",
  "packages/components/src/bilingual-segment.test.ts",
  "packages/components/src/connections-panel-export.test.ts",
  "packages/components/src/connections-panel.browser.test.ts",
  "packages/components/src/connections-panel.test.ts",
  "packages/components/src/popup-export.test.ts",
  "packages/components/src/popup.browser.test.ts",
  "packages/components/src/popup.test.ts",
  "packages/components/src/reader-controller-export.test.ts",
  "packages/components/src/reader-controller.browser.test.ts",
  "packages/components/src/reader-controller.test.ts",
  "packages/components/src/reader-export.test.ts",
  "packages/components/src/reader-session-export.test.ts",
  "packages/components/src/reader-session.test.ts",
  "packages/components/src/reader.browser.test.ts",
  "packages/components/src/reader.test.ts",
  "packages/components/src/ref-label.browser.test.ts",
  "packages/components/src/ref-label.test.ts",
  "packages/components/src/root-import.browser.test.ts",
  "packages/components/src/sefaria-element.browser.test.ts",
  "packages/components/src/source-card-export.test.ts",
  "packages/components/src/source-card-selection.test.ts",
  "packages/components/src/source-card.browser.test.ts",
  "packages/components/src/source-card.test.ts",
  "packages/components/src/text-segment-export.test.ts",
  "packages/components/src/text-segment.browser.test.ts",
  "packages/components/src/text-segment.test.ts",
  "packages/text-transform/src/preview.test.ts",
  "packages/text-transform/test/footnotes.test.ts",
  "packages/text-transform/test/sanitize.test.ts",
  "packages/text-transform/test/vocalization.test.ts",
  "tests/api-docs.test.ts",
  "tests/check-runner.test.ts",
  "tests/compatibility/src/cross-package-smoke.test.ts",
  "tests/compatibility/src/index.test.ts",
  "tests/compatibility/src/no-network.test.ts",
  "tests/compatibility/src/qualification.test.ts",
  "tests/compatibility/src/text-transform.test.ts",
  "tests/compatibility/src/workspace-dependencies.test.ts",
  "tests/toolchain-compatibility.test.ts",
  "tests/toolchain-versions.test.ts",
]);

export const PRE_RETIREMENT_SHOWCASE_INVENTORY = Object.freeze([
  "demos/showcase/loop.test.ts",
  "demos/showcase/presentation.test.ts",
  "demos/showcase/scripts/build-pages-plan.test.ts",
  "demos/showcase/src/factory-binding.browser.test.tsx",
  "demos/showcase/src/presentation-navigation.browser.test.ts",
  "demos/showcase/src/presentation-navigation.test.ts",
  "demos/showcase/src/viewport-guard.browser.test.ts",
  "demos/showcase/src/viewport-guard.test.ts",
  "demos/showcase/src/workspace-preview.browser.test.ts",
]);

const RETIRED = new Map([
  [
    "demos/linker/src/detection.test.ts",
    "Automatic prose detection was superseded by authored anchors; native navigation and popup ownership are retained in the linked-article integration.",
  ],
  [
    "demos/mcp/scripts/vscode-video-recorder.test.ts",
    "Presentation recording mechanics were optional capture tooling, not MCP protocol or host behavior.",
  ],
  ["demos/showcase/loop.test.ts", "Booth-loop timing was presentation-only."],
  [
    "demos/showcase/presentation.test.ts",
    "Reveal deck assembly was presentation-only.",
  ],
  [
    "demos/showcase/scripts/build-pages-plan.test.ts",
    "The retired Pages assembly is not part of the local toolkit site.",
  ],
  [
    "demos/showcase/src/presentation-navigation.browser.test.ts",
    "Reveal navigation and iframe activation were presentation-only.",
  ],
  [
    "demos/showcase/src/presentation-navigation.test.ts",
    "Reveal navigation state was presentation-only.",
  ],
  [
    "demos/showcase/src/viewport-guard.browser.test.ts",
    "Large-slide viewport enforcement was presentation-only; maintained examples have responsive browser coverage.",
  ],
  [
    "demos/showcase/src/viewport-guard.test.ts",
    "Large-slide viewport calculations were presentation-only.",
  ],
]);

const REPLACEMENTS = new Map([
  [
    "demos/linker/src/linker.browser.test.ts",
    ["examples/linked-article/src/app.browser.test.ts"],
  ],
  [
    "demos/mcp/scripts/launch-vscode-demo.test.ts",
    ["examples/mcp-app/scripts/launch-vscode-host.test.ts"],
  ],
  [
    "demos/showcase/src/factory-binding.browser.test.tsx",
    ["examples/react-vite/src/app.browser.test.tsx"],
  ],
  [
    "demos/showcase/src/workspace-preview.browser.test.ts",
    ["examples/reader/src/app.browser.test.ts"],
  ],
]);

export function dispositionFor(baselinePath) {
  const retiredReason = RETIRED.get(baselinePath);
  if (retiredReason !== undefined) {
    return { status: "retired", reason: retiredReason, destinations: [] };
  }
  const replacements = REPLACEMENTS.get(baselinePath);
  if (replacements !== undefined) {
    return {
      status: "retained",
      reason: "Behavior retained in the maintained integration.",
      destinations: replacements,
    };
  }

  const destination = baselinePath
    .replace(/^packages\/components\//u, "packages/web-components/")
    .replace(/^demos\/explorer\//u, "examples/explorer/")
    .replace(/^demos\/reader-workspace\//u, "examples/reader/")
    .replace(/^demos\/mcp\/app\//u, "examples/mcp-app/")
    .replace(/^demos\/mcp\/scripts\//u, "examples/mcp-app/scripts/");
  return {
    status: "retained",
    reason:
      destination === baselinePath
        ? "Test remains at its baseline path."
        : "Test migrated with its maintained package or example.",
    destinations: [destination],
  };
}

export const EXPECTED_BASELINE_TEST_COUNT = 73;
export const EXPECTED_PRE_RETIREMENT_SHOWCASE_TEST_COUNT = 9;
export const EXPECTED_RETIRED_TEST_COUNT = RETIRED.size;
