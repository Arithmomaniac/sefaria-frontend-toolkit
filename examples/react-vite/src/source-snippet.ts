export const reactSourceCardSnippet = `const controller = createSourceCardController(client);
await controller.load({ tref });

const cardRef = useRef<SefariaSourceCard>(null);
const unbind = useRef<(() => void)>();
const [selected, setSelected] = useState<SourceSelection>();
useElementProperty(cardRef, "selectable", viewModel.state === "data");
useElementProperty(cardRef, "selectedPosition", selected?.position);

function onSourceSelection(event: Event) {
  const detail = (event as CustomEvent<SourceSelection>).detail;
  setSelected({ position: [...detail.position], ref: detail.ref });
}

const setCardRef = useCallback((card: SefariaSourceCard | null) => {
  cardRef.current?.removeEventListener(
    "sefaria-source-select",
    onSourceSelection,
  );
  unbind.current?.();
  cardRef.current = card;
  unbind.current =
    card === null ? undefined : bindSourceCardController(card, controller);
  card?.addEventListener("sefaria-source-select", onSourceSelection);
}, [controller]);

return (
  <>
    <sefaria-source-card ref={setCardRef} />
    <p>{selected ? \`React received selection: \${selected.ref}.\` : ""}</p>
  </>
);`;
