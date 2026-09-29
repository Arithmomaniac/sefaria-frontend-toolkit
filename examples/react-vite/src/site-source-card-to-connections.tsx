import "@arithmomaniac/sefaria-web-components";
import { useState } from "react";

export function SourceCardToConnections() {
  const [selected, setSelected] = useState({
    position: [2] as readonly number[],
    ref: "Micah 6:8",
  });

  return (
    <>
      <sefaria-source-card
        sref="Micah 6:6-8"
        selectable
        selectedPosition={selected.position}
        onsefaria-source-select={(event) => setSelected(event.detail)}
      />
      <sefaria-connections-panel sref={selected.ref} />
    </>
  );
}
