> Created/edited by GitHub Copilot; pending human review.

# Troubleshooting

Start with the symptom, then check the owner of that boundary.

## The package cannot be installed

Use the authenticated GitHub Packages setup in [Get started](../get-started.md#installation-status). The packages are not published on npmjs.com or a CDN. Do not add a registry fallback or commit credentials.

## The custom element is unknown

Import `@arithmomaniac/sefaria-web-components` before creating the element. DOM-free subpaths do not register tags.

## A property change has no effect

Assign raw objects, arrays, acquisition choices, and anchors as JavaScript properties:

```ts
card.data = validatedPayload;
card.acquisition = { kind: "client", client };
popup.anchor = citationButton;
```

Do not serialize raw data into an attribute or assign prepared rendering.

## The supplied Reader says a target is unavailable

The supplied project has finite `Micah 6:8` coverage. Use the explicitly activated live Reader or provide a raw seed/host capability that covers the target. Do not fabricate empty content.

## The editor does not run after an edit

Read the preview error, use **Reset**, and reproduce the smallest edit. Do not loosen the sandbox or add network fallback.

## The browser reports a CSP or blocked-resource error

Keep the existing policy and inspect the blocked URL and resource type. Do not disable CSP.

## A documented HTTP result is confused with a network or schema failure

Preserve documented statuses, network/abort rejection, empty content, and invalid JSON as distinct outcomes. Invalid JSON reports structured issue paths before admission.

## A failed or superseded request erased the previous result

The element owns latest-wins identity and committed content. Replace input objects rather than mutating them, and do not create a second renderer or lifecycle for the same surface.

## The component remains active after the host removes it

Clear owned inputs or remove the element. Explicit host resources and listeners are released at the same boundary.

## Standalone loading starts too early

Prefill host input, not live `sref`. Assign `sref` only after the maintained page's activation gate.

## Supplied data suppresses standalone loading

Defined ordinary-element `data` is authoritative. Clear it before assigning a live reference.

## Popup visibility changes acquisition

`open` controls visibility only. Assign or clear Popup `sref` according to host policy.

Use the [data-flow guide](data-flow.md), [component catalog](../components.md), and generated [custom-element reference](../reference/custom-elements.md) for exact contracts.
