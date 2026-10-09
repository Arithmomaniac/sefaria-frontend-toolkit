> Created/edited by GitHub Copilot; pending human review.

# Source handoff

This repository delivers reusable building blocks for placing Sefaria reading experiences in browser and MCP hosts. It is intentionally not a replacement for Sefaria.org, a stable package release, or a claim of exhaustive corpus compatibility. Sefaria owns this community-driven MIT project, backs and supports it, and preserves its Microsoft Global Hackathon 2026 origin. Consumers use public npm packages and version-pinned jsDelivr/UNPKG modules; [Evidence](evidence.md#conditional-post-launch-documentation) records the conditional merge/deploy gates and observed launch state. Retained Pages archives are not retired by a documentation change.

## What is delivered

The project addresses four steps between receiving JSON and presenting a reading experience:

1. `@sefaria/api-client` validates the corrected transport contract and preserves documented HTTP, network, and abort semantics.
2. `@sefaria/text-transform` safely prepares Sefaria's structured text markup and Hebrew vocalization.
3. Pure `@sefaria/web-components` factories project transport payloads into component-specific rendering data.
4. Declarative Web Components own input precedence, optional source, private preparation, layout, accessibility, interaction, and theming.

The same pieces support both packaged and host-specific compositions:

| DataLoader | Example |
| --- | --- |
| Text, bilingual, reference, source-card, and connections primitives | [Developer explorer source](https://github.com/Sefaria/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Supported packaged Reader | `examples/reader/controlled.html` |
| Custom host-owned spatial reading workflow | `examples/reader/index.html` |
| Reading surfaces embedded in an ordinary page | [Authored linked article](examples/linked-article.md) |
| The Reader delivered through an MCP App | [MCP App demonstration](examples/reader-inside-ai-chat.md) |
| Guided explanation of the complete story | [Start here](use-components/start-here.md) and local `pnpm dev:site` presentation |

The Reader is one composition of the reusable contracts, not the whole product. The spatial workspace deliberately demonstrates that a host can use lower-level session and component contracts when the packaged composition does not fit its interaction model.

## Maintainer responsibility map

| Source area | Maintained responsibility |
| --- | --- |
| `packages/client` | Pinned upstream OpenAPI input, guarded corrections, generated contracts and validators, thin client, and bounded per-client response cache |
| `packages/text-transform` | Pure sanitization, vocalization, footnotes, and connected-text previews |
| `packages/web-components` | Declarative elements, component-specific raw input types, tagged source, shared Reader qualification, and the advanced semantic/raw Reader session facade |
| `examples/explorer` | Authored component states and live developer diagnostics |
| `examples/reader`, `examples/linked-article`, `examples/mcp-app` | Distinct website, embedding, and host-transport examples |
| `docs/.vitepress`, `scripts/build-site.mjs` | Local presentation of canonical Markdown and isolated maintained examples |
| `docs/specs` | Intended behavior and acceptance rules |
| `docs/evidence.md` | Upstream observations, deployed fixtures, captures, and provenance |

The [design](design.md) defines ownership boundaries. The [development guide](development.md) is the setup and command reference. The [review guide](review.md) identifies the additional gates for contract, generated, Unicode, and integration changes.

## Source and behavior authority

Use this order when evidence conflicts:

1. Repository specifications define intended behavior.
2. The pinned Sefaria route, handler, response builder, and tests inform OpenAPI corrections.
3. The pinned OpenAPI input plus guarded overlay defines transport payloads.
4. Each component's private prepared state defines rendering data.
5. `docs/evidence.md` records observations and provenance.

The implementation deliberately differs from Sefaria in a small number of documented areas, including sanitizer policy and some interaction choices. Review [Intentional differences](concepts/sefarias-own-texts-and-tools.md) before treating visual or text-processing differences as regressions.

## Delivery limits

- The three libraries share initial npm version `0.1.0-alpha.0` under `alpha`. Source manifests remain private with `workspace:*` resolution; isolated public staging produces exact-version npm dependencies, built JavaScript, declarations and standalone browser modules. The root workspace and examples are not published packages.
- The project is experimental and has no support or stability guarantee.
- Compatibility evidence is focused and representative, not exhaustive across the Sefaria corpus.
- Linker public hosting and broad third-party-site qualification are outside this source delivery.
- MCP screenshots and acceptance records apply to the named host and captured workflow; they are not a promise about every MCP Apps host.
- No generalized domain model, retry layer, request coalescing or persistence format is included. Elements may load through their documented tagged source; composites reuse captured data rather than creating child requests.

## First review path

1. Run the browser setup and `pnpm check` from [Development](development.md).
2. Open `pnpm dev` for authored and live component exploration.
3. Run `pnpm dev:reader` to compare the supported Reader with the custom spatial composition.
4. Read [How the pieces fit together](concepts/how-the-toolkit-works.md), then inspect one element from raw input or `sref` through private preparation and rendering.
5. Use the specifications and evidence record for contract review rather than reconstructing intent from Git history or a historical presentation.
