> Created/edited by GitHub Copilot; pending human review.

# 3. Load data and handle interaction

## Objective

Use the maintained controller and binding path after an explicit user action, show loading and failures, handle a real component event, cancel obsolete work, and prevent a stale result from replacing the latest selection.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md), or open the maintained vanilla host directly.
- Use a bounded ordinary reference such as `Micah 6:8`.
- Understand that documented HTTP results can become component error view models, while network failures and aborts reject.

## Try it

Open the maintained <SiteLink to="/examples/vanilla/index.html">vanilla controller host</SiteLink>. It starts with supplied data, makes no Sefaria request on entry, and loads a new reference only after you submit the form. The same complete HTML, TypeScript, and CSS are the source of the browser example; this lesson does not ask you to assemble a second lifecycle engine from disconnected fragments.

```ts
import {
  createSefariaClient,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import {
  createSourceCardController,
  type SourceCardControllerSnapshot,
} from "@arithmomaniac/sefaria-web-components/source-card";

export function mountSourceCard(
  suppliedPayload: CoreV3TextsResponse,
): () => void {
  const status = document.querySelector<HTMLElement>("[role=status]");
  const form = document.querySelector<HTMLFormElement>("form");
  const input = document.querySelector<HTMLInputElement>('input[name="tref"]');
  const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
  if (!status || !form || !input || !card) {
    throw new Error("The host markup is incomplete.");
  }
  const controller = createSourceCardController(
    createSefariaClient({ cache: false }),
  );
  const unbind = bindSourceCardController(card, controller);
  const unsubscribe = controller.subscribe(
    (snapshot: SourceCardControllerSnapshot) => {
      status.textContent =
        snapshot.attempt.state === "loading"
          ? `Loading ${snapshot.attempt.request.tref}.`
          : "The controller owns the current committed result.";
    },
  );

  controller.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
  card.selectable = true;

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void controller.load({ tref: input.value.trim() });
  };
  form.addEventListener("submit", onSubmit);

  return () => {
    form.removeEventListener("submit", onSubmit);
    unsubscribe();
    unbind();
    controller.dispose();
  };
}
```

The example above is the teaching shape; the maintained host adds the fixture import, structured failure text, presentation controls, committed-reference display, and event detail handling. The controller owns pending versus committed state and latest-wins cancellation. The binding supplies the current view model to the request-free element.

For the complete maintained source, open [`examples/vanilla-vite/index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/index.html) and [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts). The editor below remains the request-free half of the comparison; use it when you want to change presentation without activating a live request.

<PlaygroundEmbed project="source-card" title="Edit before adding live data" />

## Expected result

The maintained vanilla host opens with supplied data and makes no Sefaria request. Submit a bounded reference to call `controller.load`. The page displays loading or failure visibly, preserves the prior committed card after a rejected request, and rejects late completion when another selection supersedes it. Selecting a rendered source emits `sefaria-source-select`; the host receives the detail and decides what happens next.

**Explicit live action:** after starting `pnpm dev:vanilla`, <SiteLink to="/examples/vanilla/index.html">open the maintained vanilla host</SiteLink>, then submit the form. Opening the lesson or the live route makes no Sefaria request until that activation.

## Who owns what

The host creates the client and controller, supplies the initial validated payload, owns the form and visible failure message, binds the controller, and disposes the subscription and controller. The controller owns cancellation, pending versus committed state, and the async factory call. The element remains request-free and does not know why the host selected a reference.

The client cache is disabled in this example so request-count demonstrations measure the action directly. That is a host choice, not a new client policy.

For import, CSP, HTTP, network, stale-result, or cleanup failures, use the [troubleshooting guide](../guides/troubleshooting.md).

For the alternative where the host owns `AbortController`, operation identity, and latest-wins checks itself, see [Advanced: own the request lifecycle](../guides/data-flow.md#advanced-own-the-request-lifecycle). It is useful when a host composes several unrelated operations, but it is not the ordinary first integration.

## Exercise

Open the vanilla host and submit one reference, then immediately submit another. Confirm that the first operation cannot replace the second result. Trigger a source selection and display the event's `ref` and `position` without querying Shadow DOM. Return to the editor, change CSS or presentation JavaScript, and confirm that **Run** changes only the supplied-data preview.

## Source and run links

- Run: `pnpm dev:vanilla`
- Maintained host: [`examples/vanilla-vite/index.html`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/index.html)
- Maintained host logic: [`examples/vanilla-vite/src/main.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/main.ts)
- Maintained host styles: [`examples/vanilla-vite/src/style.css`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/vanilla-vite/src/style.css)
- Full supplied-data editor: <SiteLink to="/examples/playground/index.html?project=source-card">source-card project</SiteLink>
- Failure semantics: [Data-flow guide](../guides/data-flow.md#failures-stay-at-the-right-boundary)

## Next step

Continue to [Use the controlled Reader or compose a custom host](04-reader.md). React users should also read [Use the elements from React](react.md).
