---
name: openapi-drift-triage
description: Triage an upstream Sefaria OpenAPI drift issue by source review and propose a pinned refresh as a draft pull request for human source review.
---

# OpenAPI drift triage

You are assigned an issue opened by the scheduled `OpenAPI drift` workflow (`.github/workflows/openapi-drift.yml`). The issue body lists the pinned and upstream commits of Sefaria's `docs/openAPI.json`, the changed paths and schemas, and every `x-sefaria-guards` precondition that would fail. Drift is a review signal, not a correction authority. Your job is to prepare a reviewable proposal; a human performs the final source review.

## Prerequisites

- Read `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/client.instructions.md`, `docs/specs/client.md`, and the OpenAPI sections of `docs/evidence.md` before changing anything.
- The upstream commit to target is the complete SHA in the issue's `<!-- upstream-commit: ... -->` marker and in the assignment instructions. Never target a branch or tag.
- `pnpm setup:agent` prepares the checkout. `pnpm openapi:drift` and `pnpm openapi:refresh` need network access to `api.github.com` and `raw.githubusercontent.com`.

## Procedure

1. Run `pnpm openapi:drift` to confirm the issue still describes the current upstream commit. If upstream moved, work on the commit the command reports and say so in the pull request.
2. For each changed path, changed schema, and failed guard, inspect the upstream route, handler, response builder, and endpoint tests in `Sefaria/Sefaria-Project` at the target commit. Link them with complete commit SHAs.
3. Classify each change as exactly one of:
   - **No client impact**: documentation-only, or outside every generated contract.
   - **Guard update**: the source behavior our correction encodes is unchanged, but the guarded upstream text changed; update the precondition's expected value or digest.
   - **Correction change**: source shows the corrected contract must change; revise the overlay action and its guard.
   - **Correction retired**: upstream now documents what our correction supplied; remove the action and its guard.
   - **Unresolved**: source does not settle the question. Leave the overlay unchanged for that item and list it as an open question.
4. Edit `packages/client/openapi/overlay.yaml` only as the source review supports. Every mutation keeps an exact JSONPath target and a co-located old-state or absence precondition. Record provenance for each change in `docs/evidence.md`.
5. Run `pnpm openapi:refresh --commit <target SHA>`. It refuses while any guard fails; fix the guards through step 4 rather than weakening them.
6. Add or update tests for each corrected schema against the upstream implementation and its tests, then run `pnpm check`.
7. Open a **draft** pull request that says `Closes #<issue>` and contains:
   - a table with one row per change: item, classification, upstream source links, and local action
   - the open questions from step 3
   - a checklist for the human reviewer to confirm each source link and classification
   - the statement that the source review is agent-prepared and not yet human-reviewed

   If an earlier draft pull request for this issue is still open, link it and state that this one supersedes it.

## Limits

- Never mark the pull request ready for review, merge it, or approve it.
- Never use one live Sefaria response as the only authority for a correction.
- Do not change the thin client, add retries or caches, or edit generated files by hand; regenerate them.
- Do not use `Genesis 1:1` in new ordinary tests or examples.
