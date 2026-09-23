> Created/edited by GitHub Copilot; pending human review.

# 3. Load data and handle interaction

## Objective

Switch from authoritative supplied data to standalone `sref` after an explicit user action.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md).
- Use a bounded ordinary reference such as `Micah 6:8`.

## Try it

Open the maintained <SiteLink to="/examples/vanilla/index.html">vanilla host</SiteLink>. It begins with supplied `Micah 6:8` data. Form submission performs the cutover:

```ts
import "@arithmomaniac/sefaria-web-components";

const form = document.querySelector<HTMLFormElement>("form");
const input = document.querySelector<HTMLInputElement>('input[name="tref"]');
const card = document.querySelector("sefaria-source-card");
if (!form || !input || !card) throw new Error("The host is incomplete.");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = input.value.trim();
  if (next.length === 0) return;

  card.data = undefined;
  card.sref = next;
});
```

An application that needs a particular client can assign one tagged source:

```ts
card.acquisition = {
  kind: "client",
  client: createSefariaClient({ cache: false }),
};
```

## Expected result

Opening the route makes no Sefaria request. Submitting the form assigns `sref`; the element owns loading, cancellation, latest-wins behavior, private preparation, and accessible failures. A newer input prevents an older completion from publishing.

The `sefaria-source-select` event carries the selected canonical reference and position. The host decides what that action means; it does not query Shadow DOM.

<PlaygroundEmbed project="source-card" title="Edit before adding live data" />

## Who owns what

The host owns the activation gate, draft input, optional client choice, and visible application status. The element owns its request lifecycle. The client's bounded per-client cache remains the only response cache; the element adds no retry, coalescing, or stale fallback.

## Exercise

Submit two references quickly and confirm that the first completion cannot replace the second. Disconnect and reconnect the element during loading and confirm that only the still-eligible interrupted phase resumes.

## Source and run links

- Hosted example: <SiteLink to="/examples/vanilla/index.html">vanilla host</SiteLink>
- Full editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>

## Next step

Continue to [Use the Reader or compose a custom host](04-reader.md).
