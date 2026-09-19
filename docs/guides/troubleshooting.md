> Created/edited by GitHub Copilot; pending human review.

# Troubleshooting

Start with the symptom, then check the owner of that boundary. The examples and lessons use supplied data first, keep live actions explicit, and preserve committed content when a later operation fails.

## The package cannot be installed

**Symptom:** a public registry or CDN lookup cannot find the toolkit package.

**Recovery:** public package installation is planned for release. For browser evaluation, use the [interactive examples](../examples.md), [component catalog](../components.md), or supplied-data editor without installing packages. For local development or authorized prerelease qualification, use the repository-only [private package setup](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/docs/development.md#build-and-pack-the-private-libraries).

Do not describe the current private qualification path as public publication, and do not add a registry fallback to application code.

## The custom element is unknown

**Symptom:** the browser reports an unknown element or the element renders no component behavior.

**Recovery:** load the browser package before creating the element:

```ts
import "@arithmomaniac/sefaria-web-components";
```

Use the non-DOM component subpaths when you only need factories, controllers, or view models. They do not register custom elements. The [Web Components lesson](../learn/01-web-components.md) explains registration and the [generated element reference](../reference/custom-elements.md) lists the supported properties.

## A property change has no effect

**Symptom:** assigning an object, array, view model, or DOM element through markup does not work.

**Recovery:** assign non-primitive values as JavaScript properties:

```ts
card.viewModel = viewModel;
popup.anchor = citationButton;
reader.viewModel = readerViewModel;
```

Use attributes for the documented primitive controls such as `layout`, `side-order`, `linked`, or `vocalization-mode`. Do not serialize a view model into an attribute and do not pass raw API JSON to an element. See the [component usage pages](../components/) and the [custom-element reference](../reference/custom-elements.md).

## The supplied Reader says a target is unavailable

**Symptom:** a Reader action reports `source-unavailable` after navigation.

**Recovery:** treat it as a finite-example boundary, not as an empty passage or a general Reader failure. The supplied project covers Micah 6:8 source and captured connections only. Use the <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">controlled live Reader</SiteLink> when the host is allowed to activate live data, or provide a data source that covers the target.

Do not add an implicit request to the supplied example merely to make an uncovered target appear to work.

## The editor does not run after an edit

**Symptom:** the playground reports an import, syntax, or runtime failure after **Run**.

**Recovery:** read the error in the preview first. Confirm that imports use the project-supported package entry points, that the edited file still exports or defines the symbols used by the project, and that the error is not from the example's own host markup. Use **Reset** to restore the maintained project, then reproduce the smallest edit.

The editor runs the selected project inside its existing opaque same-site preview. Do not loosen the iframe sandbox, bypass the import policy, or add a network request to hide a preview failure. For a complete maintained example, use the [vanilla host](../learn/03-live-data.md#try-it) or the matching component page.

## The browser reports a CSP or blocked-resource error

**Symptom:** a script, module, or resource is blocked by the browser's content-security policy.

**Recovery:** keep the existing policy and inspect the blocked resource. Use the documented same-site example path and supported package imports. Do not disable CSP, add unsafe inline execution, or work around the editor's opaque preview boundary.

If the failure is in an edited project, reset it and add one supported change at a time. If the failure is in a maintained host, report the exact URL, resource type, and browser console message against that host.

## A documented HTTP result is confused with a network or schema failure

**Symptom:** an application displays an empty success state for a failed request, or treats every non-success outcome as a missing passage.

**Recovery:** keep the boundaries distinct:

| Symptom or result | Correct handling |
| --- | --- |
| Documented HTTP error | Preserve the generated typed error payload or project it into the component's documented error state. |
| Valid response with no usable text | Render the component's empty or partial state. |
| Invalid JSON | Reject validation and report structured issue paths before projection. |
| Network failure or abort | Preserve the rejected operation; do not convert it to empty content. |

The [data-flow guide](data-flow.md#failures-stay-at-the-right-boundary) and [client package reference](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/packages/client/README.md) describe the current ownership.

## A failed or superseded request erased the previous result

**Symptom:** a loading indicator replaces useful committed content permanently, or an older request overwrites the newer selection.

**Recovery:** use the maintained controller and binding for the ordinary path. It keeps pending attempt state separate from the last committed view model and prevents obsolete completion from winning. The [live-data lesson](../learn/03-live-data.md) demonstrates this with the maintained vanilla host.

If a host owns the lifecycle manually, it must keep the abort signal, operation identity, committed result, and failure reporting together. Use the [advanced lifecycle explanation](data-flow.md#advanced-own-the-request-lifecycle) only when the host has a concrete multi-operation requirement.

## The component remains active after the host removes it

**Symptom:** subscriptions, requests, or event handlers continue after the page removes an element.

**Recovery:** dispose the controller and unbind it from the element when the host removes the surface:

```ts
unbind();
controller.dispose();
```

Remove host-owned listeners at the same boundary. The [Reader lesson](../learn/04-reader.md#try-it) and [live-data lesson](../learn/03-live-data.md#try-it) show the complete cleanup shape. The element itself does not own the client or decide when application resources are no longer needed.

## More exact detail

Use the [component usage directory](../components/) for surface-specific interaction guidance, the [API reference](../reference/custom-elements.md) for exact properties and events, and the [Reader lesson](../learn/04-reader.md) for controller lifecycle.
