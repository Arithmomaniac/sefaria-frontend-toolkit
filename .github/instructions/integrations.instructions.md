---
description: "Rules for MCP and Linker integrations"
applyTo: "examples/mcp-app/**,examples/linked-article/**,docs/specs/integrations.md"
---

> Created/edited by GitHub Copilot; pending human review.

# Integration Instructions

- Integrate through built artifacts and public contracts.
- Do not copy the Sefaria Web application, mobile application, Linker, or MCP server.
- Let integrations own host input, activation policy, optional client or capability creation, and application-specific coordination.
- Prefer direct `sref` or validated raw `data` assignment to public elements.
- Do not construct or pass public prepared rendering models.
- Put a corrected API payload in MCP `structuredContent`; when MCP requires an object root for an array-shaped endpoint response, wrap the unchanged payload in the smallest specified integration envelope.
- Validate unknown MCP or server JSON with a public corrected `@arithmomaniac/sefaria-client` schema or generated validator.
- Report structured JSON paths before projection.
- Feed validated server-provided data through the same element-owned private preparation used after acquisition.
- Make the first MCP render use zero requests.
- Keep MCP continuation acquisition host-proxied. Do not let the App or element fall back to direct Sefaria HTTP.
- Do not add component HTML server rendering or hydration.
- Replace an alternate private wire format atomically.
- Do not add a dual-reader compatibility path.
- Keep host-page CSS isolated.
- Document host Content Security Policy, mixed-content, and network restrictions without bypassing them.
- Test real tool, resource, package, host, request-count, and cancellation boundaries.
- Keep fixture data representative, fixed, and source-pinned or dated.
- State host limitations separately from component failures.
- Keep maintained live pages explicitly activation-gated even though the public elements support immediate standalone loading.
- In the linked-article integration, assign Popup `sref` only after eligible activation and clear it on close or destroy; do not add automatic citation detection, polling, or bulk preload.
