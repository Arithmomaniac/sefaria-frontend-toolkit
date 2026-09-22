---
description: "Rules for component factories, Lit elements, and browser demonstrations"
applyTo: "packages/web-components/**,examples/explorer/src/authored/**,examples/react-vite/**,examples/reader/**,docs/specs/components.md"
---

> Created/edited by GitHub Copilot; pending human review.

# Component Instructions

- Give every public element component-specific `sref` and raw `data` inputs; do not expose a public prepared rendering model.
- Keep raw input, acquisition options, events, and diagnostics specific to one component surface. Do not create a generalized domain or data facade.
- For the six non-Reader elements, defined `data` is authoritative, including valid empty data and invalid data. Invalid supplied data must supersede pending acquisition, replace prior content with the validation error, and never fall through to `sref`.
- Keep deterministic validation, selection, normalization, and preparation independent of clients, caches, DOM state, and global state.
- Use corrected generated contracts directly for complete endpoint payloads. Define narrow validators only for the component-specific selected fragments or response-shaped slices the public contract actually accepts.
- Preserve network and abort rejections internally as original causes. Current element-owned failures must become accessible state and documented events without unhandled promise rejections; stale completions publish nothing.
- Keep layout, focus, selection, open state, placement, and other presentation controls as element properties.
- Permit only the documented tagged acquisition choice. Do not expose a base URL, arbitrary host, request function, or `fetch`.
- Use one lazy shared acquisition value per loaded module instance. Supplied data, import, and explicit per-element acquisition do not realize it. Configuration after first shared use always fails.
- An explicit disabled, failed, or unsupported acquisition choice never falls through to browser HTTP.
- Abort eligible active work on disconnection and resume only still-eligible interrupted work on reconnection. Do not automatically retry ordinary network failures.
- Keep Popup preparation independent of `open`; visibility alone must not start, restart, or cancel acquisition.
- Make composites prepare children from captured parent data through private pure helpers or private prepared receivers. Never substitute child `sref` when the parent already owns the data.
- Prove that ten child renderings use one outer request and zero child requests.
- Sanitize unsafe HTML before private prepared content reaches rendering.
- Add JSDoc to every handwritten exported declaration and every exported interface or class property. Link to package documentation for longer explanations.
- Use direction and attribution from payload data.
- Use real interactive controls, accessible names, visible focus, and keyboard operation.
- Use browser tests for structure, direction, focus, layout, event composition, token inheritance, supplied-data request absence, and standalone loading.
- Add authored explorer states from raw fixtures or real acquisition/validation paths, not public hand-built view models.
