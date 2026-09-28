---
name: openapi-drift-triage
description: Qualify upstream Sefaria OpenAPI drift against source and bounded live probes, then propose a reviewed refresh or investigation as a draft pull request.
---

# OpenAPI drift triage

You are assigned an issue opened by the scheduled `OpenAPI drift` workflow (`.github/workflows/openapi-drift.yml`). The issue body lists the pinned and upstream commits of Sefaria's `docs/openAPI.json`, the changed paths and schemas, and every `x-sefaria-guards` precondition that would fail. Drift is a review signal, not a correction authority. Your job is to prepare a reviewable proposal; a human performs the final source review.

## Prerequisites

- Read `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/client.instructions.md`, `docs/specs/client.md`, and the OpenAPI sections of `docs/evidence.md` before changing anything.
- The upstream commit to target is the complete SHA in the issue's `<!-- upstream-commit: ... -->` marker and in the assignment instructions. Never target a branch or tag.
- `pnpm setup:agent` prepares the checkout. `pnpm openapi:drift` and `pnpm openapi:refresh` need network access to `api.github.com` and `raw.githubusercontent.com`.

## Procedure

1. Run `pnpm openapi:drift` to confirm the issue still describes the current upstream commit. If upstream moved, work on the commit the command reports and say so in the pull request.
2. For each changed path or schema, and each failed guard if any, compare the two OpenAPI documents and inspect the upstream route, handler, response builder, and endpoint tests in `Sefaria/Sefaria-Project` at the target commit. Link them with complete commit SHAs. If endpoint tests do not exist, say so and corroborate the change with the implementation. Changes without failed guards still need qualification.
3. Qualify affected request and response contracts against source branches and a small, bounded set of representative and edge-case requests to the live Sefaria API when the operation is public and safe to call. Vary inputs along branches the implementation distinguishes, such as default and explicit parameters, empty or missing data, conditional fields, and safe error cases; compare the resulting statuses and JSON shapes with the proposed contract. Record the exact inputs, date, outcomes, and request count in `docs/evidence.md`. Live results are dated observations, not evidence that the pinned source commit is deployed. Use a local MongoDB export only if it is already available and actually helps cover a branch; it is not a prerequisite and stored documents do not establish HTTP response shape. Do not probe authenticated, mutating, or otherwise unsafe operations: rely on pinned source and upstream tests or reviewed fixtures instead, and mark any unsupported claim unresolved. Bound the probe count and payload processing; use `Genesis 1:1` only for an explicitly named high-volume regression.
4. For each changed schema or response structure, compare it with existing reusable transport components and other operations that consume the same shape. Propose a shared OpenAPI component only if the pinned source and qualified payloads establish the same fields and conditional variants at more than one use site; do not create a generalized domain model or deduplicate by name or superficial similarity. If shared, specify which consumers change and guard every overlay mutation.
5. Classify each change as exactly one of:
   - **No client impact**: documentation-only, or outside every generated contract.
   - **Guard update**: the source behavior our correction encodes is unchanged, but the guarded upstream text changed; update the precondition's expected value or digest.
   - **Correction change**: source shows the corrected contract must change; revise the overlay action and its guard.
   - **Correction retired**: upstream now documents what our correction supplied; remove the action and its guard.
   - **Refresh only**: upstream documents a source-confirmed, qualified change in generated contracts, but no local overlay action or guard needs changing; advance the pin and test the resulting contract.
   - **Unresolved**: available source and qualification do not establish the new contract. Leave that contract unaccepted and list the missing evidence as an open question; a passing overlay guard does not qualify it.
6. Edit `packages/client/openapi/overlay.yaml` only as the source review supports. Every mutation keeps an exact JSONPath target and a co-located old-state or absence precondition. Record provenance for each reviewed change in `docs/evidence.md`. Record pre-existing mismatches separately as open questions, without expanding this refresh into unrelated corrections.
7. Once every changed contract is qualified, run `pnpm openapi:refresh --commit <target SHA>`. It refuses while any guard fails; fix the guards through step 6 rather than weakening them. If evidence is still unresolved, do not advance the pin: prepare an investigation-only draft that identifies the missing evidence. Refresh does not update hard-coded pin assertions or prose: check `packages/client/test/generation.test.ts`, `docs/design.md`, `docs/specs/client.md`, `docs/development.md`, and `docs/evidence.md` for old pin references and update the owning assertions and descriptions. Do not repin independent rendering-source audits in `tests/compatibility/`.
8. Add or update tests for each changed generated behavior, even if no overlay correction was needed; use upstream tests where they exist and record their absence otherwise. Add a changeset when public contracts change, selecting its release level based on the compatibility impact and explaining any uncertainty in the draft PR. Then run `pnpm check` if code, configuration, or generated output changed.
9. Open a **draft** pull request that says `Closes #<issue>` when it contains a qualified refresh; an investigation-only draft must not close the issue. The draft contains:
   - a table with one row per change: item, classification, upstream source links, dated probe or test evidence, shared-component assessment, and local action
   - the open questions from step 5 and any unqualified contracts
   - a checklist for the human reviewer to confirm each source link and classification
   - the statement that the source review is agent-prepared and not yet human-reviewed

   If an earlier draft pull request for this issue is still open, link it and state that this one supersedes it.

## Limits

- Never mark the pull request ready for review, merge it, or approve it.
- Never use one live Sefaria response as the only authority for a correction.
- Do not change the thin client, add retries or caches, or edit generated files by hand; regenerate them.
- Do not use `Genesis 1:1` in new ordinary tests or examples.
