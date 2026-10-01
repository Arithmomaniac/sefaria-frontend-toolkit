export const reactSourceCardSnippet = `const [data, setData] = useState(suppliedPayload);
const [sref, setSref] = useState("");
const [source, setSource] = useState({
  kind: "client",
  client,
});

function loadReference(nextSref) {
  setData(undefined);
  setSref(nextSref);
  setSource({ kind: "client", client });
}

return (
  <sefaria-source-card
    data={data}
    sref={sref}
    source={source}
    contentLanguage={contentLanguage}
    layout={layout}
    sideOrder={sideOrder}
    vocalizationMode={vocalizationMode}
    selectable
    selectedPosition={selected?.position}
    onsefaria-source-select={onSelection}
  />
);`;
