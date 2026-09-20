> Created/edited by GitHub Copilot; pending human review.

# Documentation

Use the [product site](https://arithmomaniac.github.io/sefaria-frontend-toolkit/) for the public learning path and interactive previews. This repository index also links contributor-only specifications, evidence, setup, and review material that is intentionally excluded from VitePress.

Public GitHub Packages prereleases are available for authenticated installation. Package names are subject to change, and the packages are not published on npmjs.com. The browser examples can be evaluated without cloning; repository development and local-package qualification use the contributor documentation below.

## Product documentation

| Goal | Document |
| --- | --- |
| Choose an integration depth | [Get started](get-started.md) |
| Follow the guided sequence | [Choose a surface and understand ownership](learn/01-web-components.md) |
| Compare all rendering surfaces | [Component catalog](components.md) |
| Edit a supplied-data component | [Seven-project editor](examples.md) and [`examples/playground`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground) |
| Find runnable examples | [Example catalog](examples.md) |
| Solve a task or understand data flow | [Guides](guides/index.md) |
| Add authored citation popups | [Linked article](linked-article.md) |
| Integrate an MCP App | [MCP App demonstration](mcp-app-demo.md) |

## Package references

| Package or surface | Reference |
| --- | --- |
| Use the API client | [`@arithmomaniac/sefaria-client`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md) |
| Use text transforms without components | [`@arithmomaniac/sefaria-text-transform`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md) |
| Choose component and Reader subpaths | [`@arithmomaniac/sefaria-web-components`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md) |
| Inspect generated element metadata | [Custom elements](reference/custom-elements.md) |
| Inspect declaration-derived package exports | [Public package exports](reference/public-exports.md) |

## Repository-only documentation

These Markdown files are retained for contributors and auditors but excluded from the public VitePress routes.

| Goal | Document |
| --- | --- |
| Find the audience and owner of every maintained page | [Documentation map](reference/documentation-map.md) |
| Set up the repository and run all checks | [Development](development.md) |
| Inspect stable ownership boundaries | [Design](design.md) |
| Review a change at the right depth | [Review](review.md) |
| Read source provenance and compatibility evidence | [Evidence](evidence.md) |
| Read normative contracts | [Specifications](specs/client.md) |
| Read package distribution rules | [Distribution specification](specs/distribution.md) |
| Find historical removed material | [Documentation archive](archive/README.md) |
| Resume repository work | [Handoff](handoff.md) |
