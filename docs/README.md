> Created/edited by GitHub Copilot; pending human review.

# Documentation

Use the [product site](https://sefaria.github.io/sefaria-frontend-toolkit/) for the public learning path and interactive previews. This repository index also links contributor-only specifications, evidence, setup, and review material that is intentionally excluded from VitePress.

The packages are migrating to the Sefaria scope on GitHub Packages; first publication under the new names is pending qualification. Installation will require authentication, and the packages are not published on npmjs.com. The browser examples can be evaluated without cloning; repository development and local-package qualification use the contributor documentation below.

## Product documentation

| Goal | Document |
| --- | --- |
| Choose an integration depth | [Get started](use-components/start-here.md) |
| Follow the guided sequence | [Choose a surface and understand ownership](use-components/start-here.md) |
| Compare all rendering surfaces | [Component catalog](reference/components.md) |
| Edit a supplied-data component | [Six-project editor](examples/composed-multi-pane-reader.md) and [`examples/playground`](https://github.com/Sefaria/sefaria-frontend-toolkit/tree/main/examples/playground) |
| Find runnable examples | [Example catalog](examples/composed-multi-pane-reader.md) |
| Solve a task or understand data flow | [Guides](concepts/how-the-toolkit-works.md) |
| Add authored citation previews | [Linked article](examples/linked-article.md) |
| Integrate an MCP App | [MCP App demonstration](examples/reader-inside-ai-chat.md) |

## Package references

| Package or surface | Reference |
| --- | --- |
| Use the API client | [`@sefaria/api-client`](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/client/README.md) |
| Use text transforms without components | [`@sefaria/text-transform`](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/text-transform/README.md) |
| Choose declarative component, data-source, and Reader subpaths | [`@sefaria/web-components`](https://github.com/Sefaria/sefaria-frontend-toolkit/blob/main/packages/web-components/README.md) |
| Inspect generated element metadata | [Custom elements](reference/components.md) |
| Inspect declaration-derived package exports | [Public package exports](reference/package-imports-and-exports.md) |

## Repository-only documentation

These Markdown files are retained for contributors and auditors but excluded from the public VitePress routes.

| Goal | Document |
| --- | --- |
| Find the audience and owner of every maintained page | [Documentation map](README.md) |
| Set up the repository and run all checks | [Development](development.md) |
| Inspect stable ownership boundaries | [Design](design.md) |
| Review a change at the right depth | [Review](review.md) |
| Read source provenance and compatibility evidence | [Evidence](evidence.md) |
| Read normative contracts | [Specifications](specs/client.md) |
| Read package distribution rules | [Distribution specification](specs/distribution.md) |
| Find historical removed material | [Documentation archive](archive/README.md) |
| Resume repository work | [Handoff](handoff.md) |
