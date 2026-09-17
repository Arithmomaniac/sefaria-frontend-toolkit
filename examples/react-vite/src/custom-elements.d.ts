import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

interface SourceSelection {
  readonly position: readonly number[];
  readonly ref: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-source-card": DetailedHTMLProps<
        HTMLAttributes<SefariaSourceCard>,
        SefariaSourceCard
      > & {
        ref?: Ref<SefariaSourceCard>;
        contentLanguage?: SefariaSourceCard["contentLanguage"];
        layout?: SefariaSourceCard["layout"];
        sideOrder?: SefariaSourceCard["sideOrder"];
        vocalizationMode?: SefariaSourceCard["vocalizationMode"];
        selectable?: SefariaSourceCard["selectable"];
        selectedPosition?: SefariaSourceCard["selectedPosition"];
        "onsefaria-source-select"?: (
          event: CustomEvent<SourceSelection>,
        ) => void;
      };
    }
  }
}

export {};
