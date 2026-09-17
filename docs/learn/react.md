> Created/edited by GitHub Copilot; pending human review.

# Use the Web Components from React

## Objective

Use React 19 as the host for the same browser registration, source-card controller, view model, and event used by the vanilla path. Keep one custom-element instance mounted, bind its headless controller, assign presentation properties without attribute serialization, render a real selection event into React state, and clean up listeners and requests under StrictMode.

This is an integration pattern, not a React wrapper package or toolkit runtime dependency.

## Prerequisites

- Complete [Render supplied data](02-supplied-data.md) and [Load data and handle interaction](03-live-data.md).
- Include `examples/react-vite/src/custom-elements.d.ts` in the consumer's TypeScript project so JSX recognizes the element:

```tsx
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-source-card": DetailedHTMLProps<
        HTMLAttributes<SefariaSourceCard>,
        SefariaSourceCard
      > & { ref?: Ref<SefariaSourceCard> };
    }
  }
}
```

## Try it

Run the maintained app:

```powershell
pnpm dev:react
```

The initial card is validated supplied data. Select **Start live demo** to make the first Sefaria request; changing theme, width, or displayed sides does not fetch.

The app imports `@arithmomaniac/sefaria-web-components` once in its browser entry. Its reusable property helper assigns DOM properties during layout rather than serializing attributes:

```tsx
function useElementProperty<
  TElement extends HTMLElement,
  TKey extends keyof TElement,
>(ref: RefObject<TElement | null>, key: TKey, value: TElement[TKey]): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null) element[key] = value;
  }, [key, ref, value]);
}
```

The maintained component keeps the element stable, binds one source-card controller, enables selection for rendered data, attaches the native event once per element, and displays the event through React state:

```tsx
const [selected, setSelected] = useState<SourceSelection>();
const cardRef = useRef<SefariaSourceCard>(null);
const unbind = useRef<(() => void) | undefined>(undefined);

useElementProperty(cardRef, "selectable", viewModel.state === "data");
useElementProperty(cardRef, "selectedPosition", selected?.position);

const setCardRef = useCallback(
  (card: SefariaSourceCard | null): void => {
    const previous = cardRef.current;
    if (previous !== null) {
      previous.removeEventListener("sefaria-source-select", onSourceSelection);
    }
    unbind.current?.();
    unbind.current = undefined;
    cardRef.current = card;
    if (card !== null) {
      unbind.current = bindSourceCardController(card, controller);
      card.addEventListener("sefaria-source-select", onSourceSelection);
    }
  },
  [controller],
);

function onSourceSelection(event: Event): void {
  const detail = (event as CustomEvent<SourceSelection>).detail;
  setSelected({ position: [...detail.position], ref: detail.ref });
}

return (
  <>
    <sefaria-source-card ref={setCardRef} />
    <p aria-live="polite">
      {selected
        ? `React received selection: ${selected.ref}.`
        : "Select the rendered segment to send its event to React."}
    </p>
  </>
);
```

The component subpath's headless controller owns attempt identity, cancellation, and stale-result rejection. React subscribes only to keep its diagnostics and presentation state aligned, while the DOM binding supplies loading and terminal view models to the element:

```tsx
const [controller] = useState(() => {
  const next = createSourceCardController(client);
  next.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
  return next;
});
const mounted = useRef(true);

useEffect(() => {
  mounted.current = true;
  const unsubscribe = controller.subscribe((snapshot) => {
    const displayed =
      snapshot.attempt.state === "loading"
        ? snapshot.attempt.viewModel
        : snapshot.result?.viewModel;
    if (displayed !== undefined) setViewModel(displayed);
  });
  return () => {
    mounted.current = false;
    unsubscribe();
    controller.cancel();
  };
}, [controller]);

await controller.load({ tref: normalized });
```

## Expected result

The initial card comes from validated supplied data and reports zero requests. **Load from Sefaria** is the only action that calls the public controller's live operation. Selecting the rendered Micah 6:8 row emits `sefaria-source-select`, and the visible React status changes to `React received selection: Micah 6:8.` Theme, width, and displayed-side controls preserve the same element and do not refetch.

React development StrictMode may repeat setup and cleanup. The maintained code unbinds the previous element, removes its listener, makes no mount-time request, cancels unmounted work, and rejects stale completion without adding request coalescing or a hidden singleton.

<iframe class="example-frame react" title="React custom-element integration" src="../examples/react/index.html"></iframe>

## Who owns what

React owns state, the typed ref, presentation-property assignment, event listener and binding lifecycle, input, loading/error UI, and element placement. The source-card controller owns one surface's attempts, cancellation, stale-result rejection, supplied validation, request, and projection. The custom element remains request-free and owns rendering and event emission.

## Exercise

Select the Micah 6:8 segment and confirm the visible React event status changes without inspecting Shadow DOM. Then start two loads quickly and confirm the first signal aborts and cannot replace the second result. Finally unmount during a pending load and verify the signal aborts and listener additions equal removals.

## Source and run links

- [`app.tsx`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/app.tsx)
- [`custom-elements.d.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/custom-elements.d.ts)
- [`use-element-property.ts`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/use-element-property.ts)
- [`app.browser.test.tsx`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/src/app.browser.test.tsx)
- [React example README](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/blob/main/examples/react-vite/README.md)

## Next step

Continue with [Use the controlled Reader or compose a custom host](04-reader.md).
