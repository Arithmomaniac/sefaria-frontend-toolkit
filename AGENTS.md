> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Contributor Instructions

These instructions apply to all repository changes. Read each applicable file in `.github/instructions` before you edit a matching path.

## Prepare a fresh checkout

Use Node.js 22.12 or later and the pnpm version pinned in `package.json`. From a fresh or shallow toolkit checkout, run:

```powershell
pnpm setup:agent
```

The command installs the frozen workspace, installs Chromium, Firefox, and WebKit, and proves that all three launch. The test-disposition gate uses committed source-stamped inventories and does not require historical Git objects. The command is safe to rerun and does not replace validation. Run focused tests while developing and `pnpm check` before review.

GitHub-hosted Copilot setup is conditional on the checked-out toolkit package identity, not on an exact branch name. Local Copilot CLI and Desktop worktrees run the same command explicitly. See [Development](docs/development.md#copilot-agent-and-fresh-worktree-setup) for platform requirements and failure handling.

## Architecture status

The specifications define intended behavior, including both implemented contracts and planned work. Use [Development](docs/development.md) to identify the implementation baseline and remaining work.

Mark every unimplemented contract as planned. Do not describe an unimplemented contract as current behavior.

## Reuse documented knowledge before investigating

Start with [the documentation index](docs/README.md), the relevant specification, and [the evidence record](docs/evidence.md). Existing guides cover the client/factory/view-model/element relationship, text markup, intentional Sefaria differences, and changed versus remaining plans. Reuse their findings and citations rather than restarting the same audit.

Before calling upstream behavior undocumented, consult Sefaria's current [documentation index](https://developers.sefaria.org/llms.txt) and refetch the relevant page. The [upstream documentation coverage record](docs/evidence.md#upstream-documentation-coverage) identifies material already documented by Sefaria; do not assume our earlier research discovered something absent from its documentation.

Distinguish documented upstream behavior, additional source or fixture observations, intentional local differences, and planned or superseded decisions. A topic not found in the pages reviewed is not proof that Sefaria never documented it.

Use narrowed session history to recover intent that the current documents do not explain. Inspect implementation source to answer a named unresolved question or satisfy a required contract review, then stop when that question is answered. This discovery order does not change the authority order or the source-review requirements below.

## Use the correct authority

Use this order:

1. Treat the repository specifications as intended behavior.
2. Inspect the original Sefaria route, handler, response builder, and tests at the pinned commit before an OpenAPI correction.
3. Use the pinned OpenAPI input as the documented-contract evidence.
4. Use deployed fixtures when source does not show runtime payload behavior.
5. Treat the pinned OpenAPI input plus guarded overlay as transport-payload authority.
6. Treat each component's private validated preparation as rendering-data authority; public raw inputs and generated payloads are not render-ready state.
7. Use downstream consumers as evidence of need, not behavior authority.

If evidence conflicts with a specification, record the observation in `docs/evidence.md`. Then change the owning specification or reviewed overlay before production code.

Use complete commit SHAs in upstream source links. Refetch mutable sources before you rely on them.

Do not infer an OpenAPI correction from one response sample. Record the pinned route, handler, response builder, upstream tests, and deployed fixture for that correction.

## State high-risk changes before implementation

Before a high-risk contract change, state:

- the source authority
- the data owner
- the exact failure
- one executable counterexample

High-risk changes include public API contracts, OpenAPI corrections, generated output, component view models, unknown JSON, partial data, request ownership, and integration payloads.

## Keep one owner for each concern

- `@arithmomaniac/sefaria-client` owns the pinned OpenAPI input, checksum, guarded overlay, generated contracts, Zod schemas, validators, thin client, and its bounded per-client response cache.
- `@arithmomaniac/sefaria-text-transform` owns pure sanitization, vocalization, and footnote operations.
- Non-DOM `@arithmomaniac/sefaria-web-components` subpaths own public raw input types, acquisition capabilities, Reader semantic/session contracts, and reusable pure preparation.
- Component elements own reactive input snapshots, acquisition selection, cancellation and stale-result suppression, private preparation, layout, interaction, accessibility, theming, and DOM rendering.
- Integrations own host input, activation policy, external unknown-JSON validation, optional client or capability creation, and application-specific coordination.
- Specifications own intended behavior.
- `docs/evidence.md` owns observations and source provenance.

Do not create a generalized domain-model package.

Do not add offline reference parsing without a concrete production consumer and a new design decision.

## Preserve transport semantics

Consume corrected generated API contracts directly.

Keep the public client thin. Its only transport policy is the specified bounded per-client response cache. Do not add a generalized facade, retries, request coalescing, stale fallback, persistence, or component-specific methods.

Preserve generated-client and Fetch API semantics. Documented HTTP errors remain typed error payloads.

Do not convert a network failure or abort into a success-shaped object.

Validate every JSON response from `@arithmomaniac/sefaria-client`.

Validate unknown JSON again when it enters through MCP, a server, a fixture, stored data, or user input.

Report structured JSON paths before projection.

Do not add an OpenAPI correction before source review or a runtime contract failure identifies a mismatch.

## Keep acquisition bounded and declarative

Every public element can accept `sref` and component-specific raw `data`. For the six non-Reader elements, defined `data` is authoritative and must suppress acquisition, including when it is validly empty or invalid.

Elements may accept only the documented tagged acquisition choice. Do not expose `fetch`, a base URL, arbitrary request functions, a host object, or a public prepared rendering model.

The component package owns one lazy default acquisition value per loaded module instance. Import, supplied-data rendering, and explicit per-element acquisition do not realize it. Explicitly disabled or unsupported acquisition must not fall through to browser HTTP.

Element-owned asynchronous work must preserve original failures, publish no stale completion, avoid unhandled rejections, abort eligible work on disconnection, and resume only the still-eligible interrupted phase on reconnection. Ordinary network failures are not automatically retried.

## Compose through captured data and private preparation

A composite that already owns a corrected payload must prepare children from that captured data through private pure helpers or a private prepared receiver.

Do not assign child `sref` or invoke child acquisition when the parent already owns the required data.

Ten child renderings from one response must use one outer request and zero child requests.

For the same captured successful payload and deterministic options, supplied and acquired paths must produce equal private preparation and visible behavior.

## Handle server-provided data

Server-provided means corrected API-shaped JSON. Validate it and use the same private preparation path as client mode.

Do not add component HTML server rendering or hydration.

MCP `structuredContent` carries a corrected API payload.

Replace an alternate private wire format atomically. Do not add a dual-reader period.

## Prove changed behavior

Write a failing test before you change behavior. Add a deterministic test for each named edge case.

Use the intended production path. Do not accept proof from a fallback, cache hit, mock default, or bypass.

Test supplied and acquired preparation equivalence with a captured payload.

Test exact request counts. Include the ten-child, one-request composite case.

Test stale generated output and every overlay old-state assertion.

Test each corrected schema against the pinned Sefaria implementation and its upstream tests.

Use realistic Sefaria payload sizes for synchronous code. Add a limit to work that can expand with payload size.

Do not use `Genesis 1:1` in demos, documentation examples, prompts, or newly authored ordinary test cases. Its unusually broad connection set makes it a stress case rather than a representative verse. Prefer a bounded reference such as `Micah 6:8`; retain or add `Genesis 1:1` only for an explicitly identified high-volume regression or stress test.

If code or configuration changes, run `pnpm check` before review.

## Use repository-installed tools

Prefer existing package scripts and locally installed executables over `npx` or `npm exec`. For focused Vitest runs, use `npm test -- <test-file>` or the equivalent `pnpm test -- <test-file>` rather than a transient executor. Use `npx` or `npm exec` only when the repository has neither an appropriate script nor an installed local binary; do not allow an executor to download an unpinned tool implicitly.

## Put information in one place

- Put normative behavior and acceptance rules in `docs/specs`.
- Put stable ownership and dependency boundaries in `docs/design.md`.
- Put source observations and provenance in `docs/evidence.md`.
- Put setup and current-versus-planned workflows in `docs/development.md`.
- Put review gates in `docs/review.md`.
- Put field-level API definitions in generated declarations.
- Put delivery status in GitHub issues.

Do not duplicate complete generated interfaces in specifications or READMEs.

Do not put a mutable issue or delivery DAG in normative documents.

Do not claim human review unless a person reviewed the content.

## Select review depth

Use normal review for ordinary changes.

Use tri-review for high-risk contracts, OpenAPI overlays, generated artifacts, Unicode behavior, unknown boundaries, or cross-package request ownership.

Use blind review when a finished artifact must work without its development history.
