import type {
  SefariaConnectionsPanel,
  SefariaSourceCard,
} from "@sefaria/web-components";
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
        data?: SefariaSourceCard["data"];
        sref?: SefariaSourceCard["sref"];
        source?: SefariaSourceCard["source"];
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
      "sefaria-connections-panel": DetailedHTMLProps<
        HTMLAttributes<SefariaConnectionsPanel>,
        SefariaConnectionsPanel
      > & {
        ref?: Ref<SefariaConnectionsPanel>;
        sref?: SefariaConnectionsPanel["sref"];
      };
    }
  }
}

export {};
