export const reactSourceCardSnippet = `const snapshot = useSyncExternalStore(
  (notify) => controller.subscribe(() => notify()),
  () => controller.snapshot,
);
const [selected, setSelected] = useState<SourceSelection>();
const onSelection = useCallback((event: CustomEvent<SourceSelection>) => {
  setSelected({
    position: [...event.detail.position],
    ref: event.detail.ref,
  });
}, []);

return (
  <sefaria-source-card
    contentLanguage={contentLanguage}
    layout={layout}
    sideOrder={sideOrder}
    vocalizationMode={vocalizationMode}
    selectable={snapshot.result?.viewModel.state === "data"}
    selectedPosition={selected?.position}
    onsefaria-source-select={onSelection}
  />
);`;
