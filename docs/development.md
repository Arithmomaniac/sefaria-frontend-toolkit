> Created/edited by GitHub Copilot; pending human review.

# Development

This contributor guide describes the current source tree as of September 15, 2026. The repository's specifications define intended behavior; the implementation and tests establish what is currently delivered.

The sections below separate delivered baseline behavior, changes from older plans, and work that remains intended. A runnable command is not proof that the corresponding integration is finished.

## Replacement repository baseline

The toolkit is maintained on `main` in `Arithmomaniac/sefaria-frontend-toolkit`; implementation pull requests target `main`. Its workflow requires the complete deterministic gate on both Ubuntu and Windows behind the stable `check` status for pull requests and pushes to `main`. Package publication and Pages deployment are separate guarded workflows. Failure-only CI artifacts are restricted to setup/check results and maintained browser diagnostics.

The conditional GitHub-hosted Copilot setup workflow exists on the default branch, but real cloud-agent activation and qualification remain separate delivery work. The workflow recognizes the toolkit from its package identity rather than a branch name.

Run the deterministic workflow-policy regression with:

```powershell
pnpm test -- tests/workflow-policy.test.ts
```

The `integration:check` stage also parses active paths, package manifests, workflow YAML, and the lockfile. It rejects active Python runtime/build files, retired demo assembly, source export fallbacks, non-private manifests, publication or deployment capabilities, credential-like workflow fields, remote tarball resolutions, and unsupported installation, ownership, or deployment claims in maintained entry-point documentation. Historical evidence and immutable archive links are outside those active-path checks.

The same stage reconciles committed source-stamped inventories containing the 73 test files from `Arithmomaniac/sefaria-web-components@7bc2d258fac2959beb5252ebdbcbddbaccd0c7b7` and the nine pre-retirement showcase tests from `Arithmomaniac/sefaria-web-components@d7e2d59645ebf7427dcff2cbdd78073e2e7df58c`. It requires every retained destination to appear in Vitest's actual static discovery output and records a specific reason for each presentation-only or superseded retirement. The gate does not query or fetch the source repository's Git objects.

[`IMPLEMENTATION-PLAN.md`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/IMPLEMENTATION-PLAN.md) is a historical bootstrap artifact. Its follow-on waves are complete, and it is not a maintained execution handoff or a normative component or transport specification. Use this development guide for the current baseline and the [repository issues](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/issues) for remaining delivery work.

## Contributor guides

For reader-oriented explanations, use the friendly guides rather than the archived demo transcripts:

- [How the pieces fit together](guides/data-flow.md)
- [Render text](guides/render-text.md)
- [Text markup](guides/text-markup.md)
- [Intentional differences from Sefaria](guides/differences.md)
- [Reader navigation and host boundaries](guides/reader-navigation.md)

## Implemented on this baseline

| Area | Baseline status |
| --- | --- |
| `packages/client` | Delivers eight named Core GET and POST SDK functions, committed corrected TypeScript contracts, reusable Core schemas, Zod validators, and a status-aware fetch client with a bounded default-on per-client response cache. The corrected Core OpenAPI document is temporary generation output. |
| `packages/text-transform` | Delivers DOM-free sanitization, Hebrew vocalization modes, structured footnote extraction, and bounded connected-text previews. |
| `packages/web-components` | Delivers the current component-specific view models, pure and async factory subpaths, request-free elements for the current text, bilingual, reference-label, selectable source-card, connections-panel, popup, and controlled reader surfaces, plus the DOM-free bounded reader session and stateful reader controller. |
| `examples/explorer` | Provides one developer surface for request-free authored states and click-to-start live pages for reference labels, text segments, bilingual segments, source cards, and contextual connections. Opening a live route makes no Sefaria request before activation. |
| `examples/reader` | Demonstrates a regular website host with viewport-height spatial panes over the lower-level reader session and shared browser data source, plus an interactive host that uses `loadReaderController` and `bindReaderController` with the supported `<sefaria-reader>` component. |
| `examples/vanilla-vite` | Exercises installed public client, source-card factory, and custom-element registration paths with a validated supplied `Micah 6:8` response followed by an explicit live request. |
| `examples/react-vite` | Demonstrates React 19 custom-element properties and events over the public source-card controller and binder, including canonical readouts, reversible vocalization, StrictMode disposal, and explicit live activation. |
| `examples/alpine-vite` | Demonstrates the same source-card host flow with Alpine 3.17.2, a closure-owned non-proxied controller, element-local property effects, declarative events, and destroy cleanup. |
| `examples/linked-article` | Progressively enhances authored Sefaria anchors with the public popup factory while preserving native navigation, page-owned cancellation, visible failures, and request-free rendering. |
| `examples/mcp-app` | Exposes shared `get_text` and adaptive `get_links_between_texts` registration through compiled Node stdio and Streamable HTTP transports and a static in-browser MCP host, packages a single-file App, validates corrected payloads and metadata, proves AppBridge request counts and sandbox isolation, and retains the optional authenticated isolated VS Code hierarchy walkthrough with separate explicit chat export. |
| `examples/playground` | Provides one supplied-data-only HTML/CSS/JavaScript editor for reference label, text segment, bilingual segment, source card, popup, connections panel, and Reader projects, with a real locally built public-module graph, opaque preview boundary, and focused Chromium/Firefox/WebKit qualification. |
| `docs/` and `dist/site` | Provide one GitHub-readable learning sequence and a VitePress presentation that embeds isolated builds of the maintained examples and is published from validated `main`. |
| `tests/compatibility` | Delivers focused pinned client and transform comparisons, a composed v3 validate-to-transform smoke case, and grouped qualification output without network access. The evidence is representative and non-exhaustive. |

## What changed from earlier plans

These are superseded decisions, not an uncompleted backlog:

- The generalized `@sefaria/model` foundation and broad offline reference parser are no longer the delivery architecture. The corrected OpenAPI contract and thin `@arithmomaniac/sefaria-client` own transport data; component factories own projections.
- The earlier unbounded or implicit cache proposal was removed from the baseline. The current client instead implements one bounded, default-on, per-client response cache with explicit opt-out; retries and request coalescing remain excluded.
- A separate text-range request and view-model stack was replaced by a bounded source-card collection. A single segment is a one-item collection, while a range remains one outer request with card-level reference data.
- Attribution belongs once at the source-card level for each displayed edition, not inside every repeated text segment.
- The private `SourceCardData` MCP wire format is superseded. The current integration uses corrected API-shaped JSON, boundary validation, and the same source-card pure factory as client mode.

The [historical decision record](evidence.md#historical-decision-provenance) explains the sources and supersession behind these changes. Work on other branches is not included in this baseline. Use the [repository issues](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/issues) page for live delivery tracking, not as the definition of a component contract.

## Still intended

These are remaining intended capabilities, not removed plans. A scaffold, command, or specification does not make them delivered.

| Planned capability | Intended result | Contract |
| --- | --- | --- |
| Broader compatibility coverage | Extend the small current suite with additional source-backed cases, without promising exhaustive corpus equivalence | [Compatibility evidence](evidence.md#current-focused-compatibility-qualification) |

The client, text-transform foundations, current components, controlled reader, contextual and multi-pane website reader demos, same-App MCP reader, named-host hierarchy acceptance, explicit chat export, and authored linked article are already delivered. New component slices still need concrete consumers; they do not justify restoring the superseded generalized model or hidden client policies.

## Technology

| Area                   | Technology                                       |
| ---------------------- | ------------------------------------------------ |
| Workspace              | pnpm 11                                          |
| Language               | TypeScript 7                                     |
| Components             | Lit 3                                            |
| Browser builds         | Vite 8                                           |
| TypeScript tests       | Vitest 4 and Playwright                          |
| MCP server and App     | MCP TypeScript SDK 1.30.0 and MCP Apps SDK 1.7.5 |
| MCP protocol inspector | MCP Inspector 1.0.2 on the compatible SDK 1 line |
| Continuous integration | GitHub Actions                                   |

TypeScript emits reusable ES modules. Vite builds the browser demonstrations and the single-file MCP App.

## Local documentation site

After a fresh checkout, run `pnpm install --frozen-lockfile` and `pnpm build` before any direct `pnpm dev:*` example command. Those Vite development scripts resolve the workspace packages from their built `dist` exports. `pnpm dev:site` is the exception: it builds the maintained example inputs before starting VitePress.

Run the development site:

```powershell
pnpm dev:site
```

The command first builds isolated copies of the maintained browser examples, then starts VitePress over the canonical Markdown in `docs/`. The examples remain independent workspace projects and do not import one another at runtime. The local server does not change the deployment.

Build and preview the production artifact:

```powershell
pnpm build:site
pnpm preview:site
```

Run the focused editor qualification:

```powershell
pnpm test:playground
```

This command builds the real editor graph and production host at both `/` and `/sefaria-frontend-toolkit/`, then checks Chromium, Firefox, and WebKit. It verifies parent and child CSP layers, all seven maintained project renders, required public factory/controller/binding entries, local module identity and root registration, zero delivered probe requests across fetch/socket/beacon/image/frame/navigation attempts, visible edits to every HTML/CSS/JavaScript tab, Run/Reset behavior, supported component interactions, explicit Reader coverage failure, one active preview, keyboard tabs and popup focus restoration, RTL/LTR output, a 390 px layout at 200% equivalent CSS width, and embedding from an ordinary same-origin documentation page. `pnpm setup:agent` installs and launches all three browser engines.

The generated `dist/site` directory contains the VitePress pages plus allowlisted example routes under `examples/`: playground, explorer, Reader, vanilla, React, linked article, and the live static MCP host. The playground uses only supplied data; the live MCP host proves in-memory protocol, resource, AppBridge, and opaque-sandbox behavior without an external backend; `pnpm dev:mcp` proves the compiled Streamable HTTP topology.

`pnpm build:site` typechecks each included example before bundling it. `pnpm build:site:bundles` skips those repeated typechecks and is used inside `pnpm check` after workspace builds. Both commands verify required output files and reject a same-origin authored-source fallback. `SITE_BASE_PATH` selects the normalized absolute base used by VitePress, every example bundle, and browser acceptance; local commands default to `/`, while the Pages workflow requires `/sefaria-frontend-toolkit/`.

The separate Pages workflow runs the complete repository gate on Ubuntu with the project base, uploads only `dist/site`, and deploys only from `main` with `pages: write` and `id-token: write` scoped to the deployment job. Pull requests validate the workflow and both local and project-path contracts without deploying. The previous Reveal.js showcase, booth loop, Pages assembly, QR assets, presentation media, and presentation-only tests remain available through the full-SHA links in the [documentation archive](archive/README.md#september-14-2026-presentation-snapshot).

## Workspace

| Path | Responsibility (status described above) |
| --- | --- |
| `packages/client` | Pinned OpenAPI input, formal guarded overlay, generated contracts, Zod schemas, validators, and named SDK functions |
| `packages/text-transform` | Pure sanitization, vocalization, and footnotes |
| `packages/web-components` | Non-DOM component factories and request-free Lit elements |
| `tests/compatibility` | Pinned compatibility evidence for retained pure behavior |
| `examples/explorer` | Request-free authored states and opt-in live diagnostics for component primitives and contextual connections |
| `examples/playground` | Maintained supplied-data editor projects, trusted CodeMirror host, locally built ESM graph, opaque preview confinement, and focused three-browser acceptance |
| `examples/mcp-app` | Shared corrected-payload MCP registration, compiled stdio and Streamable HTTP servers, static in-browser MCP host, self-contained App, AppBridge sandbox hosts, and isolated VS Code qualification tooling |
| `examples/linked-article` | Authored native citation navigation and page-owned popup integration |
| `examples/reader` | Interactive multi-pane website host and controlled `<sefaria-reader>` host over the DOM-free reader session |
| `examples/vanilla-vite` | Minimal supplied-data and explicit-live public-package consumption path |
| `examples/react-vite` | React 19 SourceCard controller, property, event, canonical-readout, and StrictMode integration |
| `examples/alpine-vite` | Alpine SourceCard controller, property-effect, event, canonical-readout, and destroy integration |
| `docs/.vitepress` and `scripts/build-site.mjs` | Documentation presentation, project-path navigation, styling, and isolated example assembly |

Workspace dependencies use `workspace:*`, and committed manifests remain private. Successful `main` validation publishes synchronized public GitHub Packages prereleases from isolated staged manifests; it does not change workspace dependency resolution.

## Required tools

Running the browser demos requires:

- Node.js 22.12 or later
- pnpm 11.22.0

Browser tests also require Chromium through Playwright.

The local deterministic browser acceptance uses the Playwright Chromium installation. An external MCP Apps-compatible host is optional for local App development and named-host qualification.

## Copilot agent and fresh-worktree setup

After Node.js and the pinned pnpm are available, prepare a fresh toolkit checkout with:

```powershell
pnpm setup:agent
```

The command performs a frozen install, installs Chromium, and launches and closes a headless browser. On Linux it also asks Playwright to install Chromium's system dependencies; that can require privileges supplied by the host. It uses the effective package-manager configuration and does not override registries. Historical test inventories are committed with their source repository and complete commit SHA, so setup does not need the original repository's Git objects.

Preparation can use the network for dependencies and Chromium and fails at the exact unsuccessful step. `pnpm check` remains the offline validation boundary: it does not fetch Git history, refresh fixtures, or contact Sefaria.

GitHub's `.github/workflows/copilot-setup-steps.yml` first checks for `packages/web-components/package.json` with package name `@arithmomaniac/sefaria-web-components`. Toolkit-derived branches prepare normally; an unrelated checkout logs an explicit skip. A checkout that looks like the toolkit but lacks the setup script fails rather than silently skipping. This capability-based behavior must be verified in real cloud sessions after the workflow is active on `main`.

Copilot CLI and Desktop do not automatically run the hosted workflow. Run `pnpm setup:agent` in each fresh local worktree. Concurrent Vitest browser runs may begin with port `6338`; Vitest selects another port when it is occupied. Tests on September 15, 2026 confirmed this fallback, so no custom port allocator is required.

## Install the workspace

For browser-only TypeScript work, run these commands from the repository root:

```powershell
corepack enable
pnpm install
pnpm exec playwright install chromium
```

If Corepack is unavailable, install the pinned pnpm release through your approved package-management path, then run the same commands. Do not let a transient executor download an unpinned tool.

The individual commands remain useful for targeted troubleshooting. Prefer `pnpm setup:agent` for a complete fresh-agent or fresh-worktree preparation.

## Current complete check

```powershell
pnpm check
```

The current command checks stale OpenAPI output, then runs Prettier, Oxlint, workspace builds, the production local-site assembly and browser acceptance, official Inspector stdio qualification, deterministic real HTTP/AppBridge browser acceptance, TypeScript checks, freshly emitted API-documentation checks, tests, the offline focused compatibility qualification, private tarball consumption, and changeset rehearsal. It prints the elapsed time and result of every completed stage, including the first failed stage, so a slow local run can be attributed without rerunning the complete gate. The qualification prints grouped pass, failure, unavailable-source, and intentional-difference results. It does not refresh network fixtures or contact Sefaria.

Every run writes a bounded machine-readable result to `.artifacts/check/result.json`. CI uploads that result and allowlisted browser diagnostics only after a platform failure. A Linux success cannot hide a Windows failure: the required `check` aggregation succeeds only when the complete matrix succeeds.

The MCP acceptance transport rejects unexpected requests and uses the compiled Node server, registered resource, separate host and sandbox origins, and packaged App. TypeScript projects use ignored incremental build-information files, which reduce repeated local typecheck and build work without changing emitted artifacts.

The deterministic gate does not contact Sefaria. To opt into a bounded live-data qualification of every maintained click-to-start route, including one Reader navigation and the embedded MCP text-to-links flow, run:

```powershell
pnpm test:site:live
```

This command rebuilds the production site, requires zero Sefaria requests before each activation, validates the returned live data through the production clients and factories, and exits nonzero with the failing route and stage. It uses bounded Micah references and request limits but does not assert a fixed live connection count or rewrite committed fixtures. Passing locally qualifies current CORS and payload availability; deployed Pages-origin evidence remains separate.

## Current focused checks

Run all TypeScript tests:

```powershell
pnpm test
```

Run the current focused compatibility qualification:

```powershell
pnpm compatibility:qualify
```

The command runs offline against committed and source-derived fixtures. It exits nonzero only for unexpected failures; unavailable sources and documented intentional differences remain separate visible result classes. The suite is representative and non-exhaustive.

Run the compatibility tests, including output semantics and network denial:

```powershell
pnpm exec vitest run tests/compatibility
```

Run the official Inspector against the compiled stdio server:

```powershell
pnpm build:mcp
pnpm --filter @sefaria-example/mcp-app inspect:stdio
```

Run the deterministic stdio, Streamable HTTP, resource, AppBridge, sandbox, and browser acceptance:

```powershell
pnpm --filter @sefaria-example/mcp-app demo
```

## OpenAPI workflow

### Explicit refresh

The refresh operation requires a complete Sefaria commit SHA. It can access the network.

```powershell
pnpm openapi:refresh --commit 1f7d0844ca6a9eddc8e48168962aacb09de75bd6
```

The operation downloads only the OpenAPI document from that commit. It validates the formal overlay guards before updating the committed pin, upstream input, SHA-256, and generated TypeScript.

It then applies the local overlay, creates the corrected document in temporary storage, and regenerates the TypeScript contracts and runtime validators.

### Offline generation

```powershell
pnpm openapi:generate
```

The operation validates the checksum and co-located overlay guards, applies `openapi/overlay.yaml` through `openapi-format` 1.33.6, extracts eight reviewed Core GET/POST operations and recursive references into temporary storage, and runs `@hey-api/openapi-ts` 0.99.0.

The generator configures a deterministic Zod object resolver for every retained `additionalProperties: false` schema. It also maps the explicitly typed OpenAPI 3.0 null-only branches to `z.null()` and applies the `minProperties: 1` warning-record correction that Hey API 0.99 does not emit correctly.

Refresh writes every new file into a sibling staging directory. Publication moves existing outputs to a rollback directory, replaces the generated TypeScript directory, then publishes `upstream.json` and `source.json` last. Any replacement failure restores every prior output.

It must not access Sefaria, GitHub, the current time, or environment-specific data.

### Stale-output check

```powershell
pnpm openapi:check
```

The check fails for changed, missing, or unexpected generated files. `pnpm check` includes this operation.

### Overlay failure

If upstream content differs from an asserted old value, generation stops with an exact path:

```text
OpenAPI precondition mismatch for versions-contract at $.paths['/api/texts/versions/{index}']
expected: SHA-256 <reviewed value>
actual: <current value>
```

The developer must review the new upstream document. Do not change an assertion only to make generation pass.

## Client fixture candidate capture

The current Genesis index candidate capture is explicit and networked. Replace `YYYY-MM-DD` with the actual caller-declared capture date:

```powershell
pnpm client:fixture:capture-candidate --write --capture-date YYYY-MM-DD
```

The command requires exactly `--write --capture-date YYYY-MM-DD`. It refuses an invalid date or an existing `index-genesis-YYYY-MM-DD.json` before fetching. It then fetches only the deployed Genesis index URL declared by the immutable September 1 manifest entry, validates the unknown response with the generated public validator, deterministically reduces it, stages it beside the fixture directory, verifies the dated target is still absent, and publishes the new candidate with one same-filesystem rename. Download, JSON parsing, validation, reduction, or publication failure leaves committed evidence unchanged.

Candidate generation does not update `manifest.json`, tests, or other references and is not automatic baseline replacement. A reviewer must inspect the candidate and manually update provenance and references in the same reviewed change if it should become committed evidence. The committed `index-genesis-2026-09-01.json` remains immutable. Existing prose-reduced payloads, reduced captures for the other Core endpoints, and hand-extracted markup fragments remain manual-review-only because their reductions depend on source interpretation rather than a general capture rule.

## Generated artifacts

`@arithmomaniac/sefaria-client` commits:

- the upstream OpenAPI input
- the complete commit pin
- the SHA-256
- the formal Overlay 1.1 document with co-located old-state guards
- generated named SDK functions and TypeScript operation declarations
- generated Zod schemas, status-aware response metadata, and public validators

Generated TypeScript files live under `packages/client/src/generated` and identify their source pin and generation command. The corrected Core OpenAPI document exists only in temporary generation storage.

Do not edit generated declarations by hand.

## Run the component explorer

```powershell
pnpm dev
```

The landing page links to authored states and click-to-start live diagnostics. Authored states exercise production elements without requests; live pages use ordinary HTML controls, the production client, component factories, and request-free elements. Opening the landing page or any live route does not contact Sefaria before **Start live demo**, an example preset, or an authored citation is activated.

## Run the interactive text-segment page

```powershell
pnpm dev:text-segment
```

The page uses ordinary HTML controls and the production client. It calls the deployed Sefaria API, owns cancellation and host errors, and supplies each result to `<sefaria-text-segment>`.

## Run the interactive bilingual-segment page

```powershell
pnpm dev:bilingual-segment
```

The page makes one request for the source and translation versions of a segment. Its display controls change the visible sides, the layout, and the side order without making another request.

## Run the contextual connections reader

```powershell
pnpm dev:connections
```

The host loads a connection target and its server-provided parent section when necessary, selects the first target segment, and requests that segment's links. Reader-row selection makes only a links request. Category changes, 20-entry paging, and showing or hiding captured previews make no request. A labels-only links response exposes an explicit Load previews action rather than fetching inside the element.

## Run the multi-pane website reader

```powershell
pnpm dev:reader
```

The command serves two linked interactive pages. The root page is a realistic regular-website consumer rather than a component state gallery: its host uses one DOM-free reader session for semantic entries and capture retention, while demo-private state owns ordered pane IDs, parent relationships, compact selection, and the 20-visible-pane limit. Wide containers scroll horizontally across independently scrolling source and connections panes; compact containers show one selected pane and a path switch.

`/controlled.html` demonstrates the public stateful convenience path. The host calls `loadReaderController` with the starting reference and client, then uses `@arithmomaniac/sefaria-web-components/bindings` to bind the returned controller to one persistent `<sefaria-reader>`. Later form submissions call `replaceRoot` on that controller, retaining the old committed source until the replacement qualifies and resetting breadcrumbs only after atomic admission. The controller owns continuing requests, cancellation, session transitions, captures, Back, breadcrumbs, external root replacement, and local connections projection while the element remains request-free.

## Run the MCP App server

```powershell
pnpm dev:mcp
```

The current command:

1. Builds the single-file MCP App, reference host, sandbox, and Node server.
2. Starts the compiled Streamable HTTP server plus separate host and sandbox origins.
3. Opens the reference browser host.

The server exposes `get_text(reference, version_language="both")`. It requests the deployed Sefaria v3 texts endpoint and returns one progressive result: plain text for every host, corrected API-shaped `structuredContent`, request/status metadata, and the App resource. The public `source`, `english`, and `both` choices select the source-card primary and translation roles through `version=primary`, `version=translation`, or both repeated values. The App bundles the generated validator and source-card factory into the staged HTML; no separate validator or payload fixture is staged.

VS Code reads the checked-in `.vscode/mcp.json`. It starts the compiled Node stdio server with `${workspaceFolder}`, so the configuration stays portable across worktrees.

```json
{
  "servers": {
    "sefaria-components-demo": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/examples/mcp-app/dist/server/stdio.js"]
    }
  }
}
```

The resource URI is `ui://sefaria/source-card.html`. Its MIME type is `text/html;profile=mcp-app`.

The server request is live. The App's first render is request-free, and repository tests mock the server transport so `pnpm check` remains offline.

Build and stage the App before opening the workspace in VS Code:

```powershell
pnpm build:mcp
```

In Copilot Chat Agent mode, enable the `sefaria-components-demo` tools and ask it to use `get_text` for a reference such as `Leviticus 19:18`.

Prepare the persistent isolated VS Code environment before the first automated run:

```powershell
pnpm setup:mcp:vscode
```

The command builds the App and Node server, creates dedicated user-data, extensions, Copilot home, shared-data, and process-home directories under `%LOCALAPPDATA%\SefariaMcpDemo`, writes deterministic user settings, writes empty VS Code and Agent Host MCP configurations, clears stale chat and MCP tool caches without deleting authentication state, and opens the worktree in that environment. The profile disables MCP discovery, MCP gallery browsing, plugins, and Settings Sync; ignores extension recommendations; and uses the empty extensions directory so no user-installed extensions are loaded. `COPILOT_HOME`, `HOME`, and `USERPROFILE` point at dedicated directories so Agent Host and customization discovery do not load servers, settings, plugins, agents, or other state from the standard user home. The explicit shared-data directory prevents VS Code from reading application state from the machine-wide `.vscode-shared` directory. VS Code's bundled Copilot and core built-in extensions remain available.

The isolated Copilot permission file records approval only for the `sefaria-components-demo` MCP server for this worktree. VS Code `1.137.0` still presents its normal host approval control for the tool call, so the acceptance harness clicks **Allow in this Session**. It does not enable bypass permissions, broad MCP auto-approval, writes, terminal commands, URLs, or any other server.

Sign in to GitHub Copilot once in that window, confirm the `sefaria-components-demo` workspace server when prompted, and close the window. Authentication remains in the dedicated user-data directory and is not committed.

The Playwright acceptance harness then launches a fresh VS Code process with that same user-data and extensions pair, connects over a reserved CDP port, accepts the narrow session approval, and runs the integrated Reader walkthrough. Screenshots remain under the ignored repository-local `.artifacts/vscode-mcp` staging area until every stage passes; then capture mode publishes the three maintained screenshots and `docs/images/mcp-app-vscode-walkthrough.json`. A failed walkthrough preserves the previous outputs and reports its diagnostic directory.

```powershell
pnpm walkthrough:mcp:vscode
```

The walkthrough writes its machine-readable result to `.artifacts/vscode-mcp/walkthrough.json` and publishes no screenshots. To run the same full walkthrough and, only after complete success, publish the three maintained initial Reader, retained hierarchy, and explicit chat-export screenshots plus `docs/images/mcp-app-vscode-walkthrough.json`:

```powershell
pnpm capture:mcp:vscode
```

To open the prepared isolated workspace without automation:

```powershell
pnpm launch:mcp:vscode
```

On Windows, the Node commands use a narrow PowerShell native-process helper that calls `CreateProcessW` with `SW_SHOWMINIMIZED`, `CREATE_NEW_PROCESS_GROUP`, an exact quoted argument vector, the isolated environment, and the requested working directory. The helper returns the created process PID; cleanup closes that window and then terminates the exact remaining process tree if necessary. Only walkthrough and capture enable the smoke-test driver and a reserved debugging port. Launch-only does not attach CDP, drive the UI, submit a prompt, or call a tool. Data navigation during walkthrough remains in one App through host-proxied tools. Explicit chat export fills the real composer through `ui/message`; the harness verifies that text without submitting it and records `host-message`.

`VSCODE_MCP_PROFILE_ROOT` overrides the default profile root. `VSCODE_USER_DATA_DIR`, `VSCODE_EXTENSIONS_DIR`, `VSCODE_EXECUTABLE_PATH`, `VSCODE_MCP_SCREENSHOT`, and `VSCODE_MCP_RESULT` override their individual paths. Failed walkthrough diagnostics remain under `.artifacts/vscode-mcp` and do not replace maintained screenshots or the maintained result.

The dedicated user-data, shared-data, Copilot home, and process-home directories are intentionally separate from the standard VS Code and Agent Host profiles. This guarantees a distinct Electron process, makes the CDP port reliable even while normal VS Code windows are open, excludes standard-profile MCP servers and shared application state, and avoids copying authentication or secret-storage files. A normal named profile can share standard-profile authentication, but it does not provide the same process or Agent Host configuration isolation.

## Run the authored linked article

```powershell
pnpm dev:linked-article
```

The development server shows the authored article page. The native citation is present in static HTML; the module enhancement calls the public popup factory only after an eligible unmodified activation.

The [authored linked-article guide](linked-article.md) covers native fallback, page-owned request lifecycle, strict deterministic transport, and the immutable archive for the retired automatic Linker.

The browser tests call the public popup async factory through a strict fixture fetch that accepts only the expected method, origin, decoded `Micah 6:8` path, and ordered query. Separate Playwright coverage starts the actual page on an assigned loopback port with JavaScript disabled and proves that activation follows the authored Sefaria URL.

## Build artifacts

Build all packages and demonstrations:

```powershell
pnpm build
```

Build only the current MCP App, host, sandbox, and Node server:

```powershell
pnpm build:mcp
```

The App build creates `examples/mcp-app/dist/app/mcp-app.html`; compiled server entries are under `examples/mcp-app/dist/server`, and host assets are under `examples/mcp-app/dist/host`.

The linked-article build creates `examples/linked-article/dist`.

If a required input file is missing, staging stops.

### Build and pack the library tarballs

The normal build creates `dist` JavaScript and declarations before workspace consumers typecheck:

```powershell
pnpm install --frozen-lockfile
pnpm build
$repository = (Resolve-Path .).Path
$destination = Join-Path $repository ".toolchain\tarballs"
New-Item -ItemType Directory -Force $destination
pnpm --filter @arithmomaniac/sefaria-client pack --pack-destination $destination
pnpm --filter @arithmomaniac/sefaria-text-transform pack --pack-destination $destination
pnpm --filter @arithmomaniac/sefaria-web-components pack --pack-destination $destination
```

`pnpm --filter ... pack` runs from each package directory, so the absolute destination is intentional. Copy the three emitted tarballs into an external Vite project and use the actual filenames in its `package.json`:

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "@arithmomaniac/sefaria-client": "file:./arithmomaniac-sefaria-client-0.0.0.tgz",
    "@arithmomaniac/sefaria-text-transform": "file:./arithmomaniac-sefaria-text-transform-0.0.0.tgz",
    "@arithmomaniac/sefaria-web-components": "file:./arithmomaniac-sefaria-web-components-0.0.0.tgz"
  }
}
```

Put matching transitive overrides in the external consumer's `pnpm-workspace.yaml`:

```yaml
overrides:
  "@arithmomaniac/sefaria-client": "file:./arithmomaniac-sefaria-client-0.0.0.tgz"
  "@arithmomaniac/sefaria-text-transform": "file:./arithmomaniac-sefaria-text-transform-0.0.0.tgz"
  "@arithmomaniac/sefaria-web-components": "file:./arithmomaniac-sefaria-web-components-0.0.0.tgz"

allowBuilds:
  esbuild: true
```

The committed source manifests remain private. The repository variable `PUBLIC_PACKAGES_ENABLED` is `true` after the September 20, 2026 public-visibility rollout. Both hosted validation platforms and the fail-closed `check` must succeed on a `main` push before the CI publish job stages copies with version `0.0.0-alpha.<run-id>.<run-attempt>`, rewrites toolkit dependencies to that exact version, and verifies the current package configuration before publishing the client, text transform, then Web Components package under the `alpha` tag. The job has repository-scoped `packages: write`; pull requests, failed validation, skipped aggregation, non-`main` refs, a disabled rollout gate, a stale main head, or a failed package preflight cannot publish. Main-push runs are not canceled after publication may have started.

The staged manifests alone set `private: false`, public access intent, and the GitHub npm registry. Committed manifests retain `private: true`, `0.0.0`, and `workspace:*`. Staging copies only built `dist`, package documentation, the root license, and Web Components metadata. Immediately before the first publish, the preflight authenticates to all three existing registry records, validates each record's current `alpha` version with the expected repository metadata and exact internal dependencies, and requires each anonymous repository package page to return HTTP 200 without following redirects. The records need not already share one `alpha` version, so a later main run can repair a prior publication that stopped between package publishes. GitHub package visibility is persistent package configuration rather than a manifest guarantee, so a new package identity must be created and manually confirmed public before it can be added to this publication set; the preflight intentionally fails when a registry record is absent, private, or redirected. Post-publication verification repeats the metadata and visibility checks for the new exact synchronized version, then installs all three versions into a temporary consumer whose lockfile contains no workspace, link, file, or tarball resolution. The verifier removes its token-referencing `.npmrc` and staged package directories before importing every Node-safe public subpath.

GitHub Packages requires authentication even for public npm-format packages. Consumers configure the `@arithmomaniac` scope for `https://npm.pkg.github.com`, supply a token through `NODE_AUTH_TOKEN`, and request one exact synchronized prerelease version for all three packages. A repository `GITHUB_TOKEN` can install packages when that repository has package access; external users need a classic personal access token with `read:packages`. Do not commit either token or an expanded `.npmrc`. The package names are subject to change, and the packages are not published on npmjs.com.

Run `pnpm package:smoke` to create an isolated Vite consumer, inspect each unchanged packed manifest and file list, override all three internal toolkit dependencies to their exact `file:` tarballs, inspect the lockfile and installed real paths, remove the producer tarballs, build, import the Node-safe subpaths, and render the source-card path in Chromium. Consumer-side overrides are required for this local private-tarball topology because pnpm otherwise attempts registry resolution for a packed package's internal toolkit dependency.

Run `pnpm metadata:generate` after changing a public export or element contract. `pnpm metadata:check` rejects stale `packages/web-components/custom-elements.json`, `packages/public-exports.json`, and their readable summaries under `docs/reference/`.

Run `pnpm changeset:rehearse` to exercise the pinned private fixed group in a disposable fixture. The current rehearsal proves the observed `0.1.1-alpha.0` to `0.1.1-alpha.1` sequence from a `0.1.0` fixture, synchronized internal dependencies and changelogs, retained private flags, and no automatic commit or tag. It remains a local Changesets qualification and is separate from the run-derived public GitHub Packages prerelease.

## Package index configuration

Keep package-index configuration outside the repository. pnpm can record mirror-specific tarball URLs. Make sure that `pnpm-lock.yaml` contains no private registry URL before a commit.

## Tool boundaries

Vite builds browser artifacts. TypeScript builds reusable ES modules.

Vitest runs TypeScript unit and protocol tests. Vitest Browser Mode and Playwright run Lit tests in Chromium. The official MCP Inspector qualifies the compiled stdio server, and the deterministic local harness exercises the compiled stdio and Streamable HTTP transports through the real AppBridge host and packaged App.

### Why this repository uses Oxlint

The repository moved away from ESLint because its required TypeScript integration was not compatible with the compiler upgrade: `typescript-eslint` 8.67.0 officially supports TypeScript versions below 6.1, not TypeScript 7. ESLint core alone does not provide the TypeScript parsing and rules this workspace used, so retaining the ESLint toolchain would have kept the workspace compiler on TypeScript 6.

The workspace uses TypeScript 7.0.2 and native Oxlint rules. `pnpm lint` does not enable Oxlint's type-aware rules; `pnpm typecheck` remains the compiler-owned type gate.

`pnpm check:api-docs` removes and freshly emits declaration files for handwritten package source and client scripts, then parses those declarations and requires JSDoc on exported declarations, exported interface properties, and public class properties. It ignores generated declarations and compiler-emitted private fields. This output check replaces the former `eslint-plugin-jsdoc` source check because Oxlint's JavaScript-plugin selector engine did not visit an exported class property during qualification.

`@hey-api/openapi-ts` 0.99.0 still uses the TypeScript 6 compiler API. `packages/client` therefore pins TypeScript 6.0.3 for that generator only. Its `build` and `typecheck` scripts explicitly invoke the workspace-root TypeScript 7 compiler. Do not remove the local generator pin or the workspace-root compiler invocation independently; `tests/toolchain-versions.test.ts` enforces both sides of this boundary.

This arrangement separates four responsibilities: Oxlint performs explicitly configured syntax and source-quality checks, the workspace TypeScript 7 compiler owns typechecking and package output, the API-documentation check owns JSDoc enforcement on freshly emitted public declarations, and the client-local TypeScript 6 compiler exists only inside the OpenAPI generator. It is a qualified compatibility arrangement, not a claim that Oxlint and declaration-output analysis are universally better than ESLint and source-AST plugins.

Reconsider ESLint when its TypeScript integration officially supports the workspace TypeScript version and the required source-level JSDoc policy can run without an incompatible compiler or plugin boundary. Also reconsider the choice if Oxlint loses required rule parity, develops platform reliability problems, or makes the lint policy materially harder to maintain. Evaluate a return with the repository's executable counterexamples, full checks, cross-platform runs, and measured performance rather than ecosystem preference alone. Do not remove the declaration-output check until a replacement demonstrably covers its exported-declaration and public-property cases; the client-local TypeScript 6 generator boundary is an independent compatibility issue.

The workspace does not use Nx or Turborepo. Add another task layer only after the pnpm scripts fail a measured need.
