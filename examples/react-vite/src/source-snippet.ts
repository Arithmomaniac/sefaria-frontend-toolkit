export const reactSourceCardSnippet = `const [data, setData] = useState(suppliedPayload);
const [sref, setSref] = useState("");
const [acquisition, setAcquisition] = useState({
  kind: "client",
  client,
});

function loadReference(nextSref) {
  setData(undefined);
  setSref(nextSref);
  setAcquisition({ kind: "client", client });
}

return (
  <sefaria-source-card
    data={data}
    sref={sref}
    acquisition={acquisition}
    contentLanguage={contentLanguage}
    layout={layout}
    sideOrder={sideOrder}
    vocalizationMode={vocalizationMode}
    selectable
    selectedPosition={selected?.position}
    onsefaria-source-select={onSelection}
  />
);`;
