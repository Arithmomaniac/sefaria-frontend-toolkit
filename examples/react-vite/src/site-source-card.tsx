import "@sefaria/web-components";
import { useState } from "react";

export function SourceCardWithSelection() {
  const [selected, setSelected] = useState<{
    position: readonly number[];
    ref: string;
  }>();

  return (
    <>
      <sefaria-source-card
        sref="Micah 6:6-8"
        selectable
        selectedPosition={selected?.position}
        onsefaria-source-select={(event) => setSelected(event.detail)}
      />
      <p>
        {selected
          ? `You selected ${selected.ref} (position ${selected.position.join(", ")}).`
          : "Select a verse number."}
      </p>
    </>
  );
}
