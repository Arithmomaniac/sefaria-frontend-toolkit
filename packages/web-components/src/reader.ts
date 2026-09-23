import type { ConnectionsViewModel } from "./connections-panel.js";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
} from "./connections-panel.js";
import type {
  ReaderBreadcrumb,
  ReaderConnectionsEntryView,
  ReaderPresentationPatch,
  ReaderSessionView,
} from "./reader-session.js";
import type { SourceCardRequest, SourceCardViewModel } from "./source-card.js";

/** Unknown corrected source payload and exact metadata for a raw Reader seed. */
export interface ReaderRawSourceSeed {
  /** Unknown payload validated as a successful v3 text response. */
  readonly payload: unknown;
  /** Required successful source status. */
  readonly status: 200;
  /** Exact source-card request covered by the payload. */
  readonly effectiveRequest: SourceCardRequest;
}

/** Unknown corrected links payload and exact metadata for a raw Reader seed. */
export interface ReaderRawConnectionsSeed {
  /** Unknown payload validated against the documented links status. */
  readonly payload: unknown;
  /** Documented links status. */
  readonly status: 200 | 400;
  /** Exact connections request covered by the payload. */
  readonly effectiveRequest: ConnectionsRequest;
  /** Initial local connections projection. */
  readonly projection?: ConnectionsProjection;
}

/** Transactional raw input accepted by declarative `<sefaria-reader>`. */
export interface ReaderRawSeedData {
  /** Optional corrected source response and coverage metadata. */
  readonly source?: ReaderRawSourceSeed;
  /** Optional corrected links response and coverage metadata. */
  readonly connections?: ReaderRawConnectionsSeed;
  /** Exact canonical source-card item selected by the seed. */
  readonly selectedRef?: string;
  /** Initial entry-specific presentation. */
  readonly presentation?: ReaderPresentationPatch;
}

/** Reader pane selected by a compact host presentation. */
export type ReaderPane = "source" | "connections";

/** Source-card rendering state owned by the controlled reader surface. */
export interface ReaderSourceViewModel {
  /** Render-ready source-card state. */
  readonly viewModel: SourceCardViewModel;
  /** Selected source-card item position. */
  readonly selectedPosition?: readonly number[];
}

/** Connections state rendered by the existing connections-panel element. */
export interface ReaderConnectionsComponentViewModel {
  /** Reader connections discriminator. */
  readonly state: "component";
  /** Render-ready connections-panel state. */
  readonly viewModel: ConnectionsViewModel;
}

/** Reader-owned terminal state when no connections component data is available. */
export interface ReaderConnectionsUnavailableViewModel {
  /** Reader connections discriminator. */
  readonly state: "unavailable";
  /** Why endpoint-backed connections content is unavailable. */
  readonly reason: "interrupted" | "failed";
  /** Host-supplied terminal message. */
  readonly message: string;
}

/** Connections rendering state for the controlled reader surface. */
export type ReaderConnectionsViewModel =
  ReaderConnectionsComponentViewModel | ReaderConnectionsUnavailableViewModel;

/** Exact selected target available for an explicit host action. */
export interface ReaderSelectedTargetViewModel {
  /** Canonical target supplied by source-card addressability. */
  readonly ref: string;
}

/** Complete request-free rendering state accepted by `<sefaria-reader>`. */
export interface ReaderViewModel {
  /** Stable current semantic entry identity. */
  readonly currentEntryId: string;
  /** Current entry display label. */
  readonly label: string;
  /** Retained semantic history from oldest to current. */
  readonly breadcrumbs: readonly ReaderBreadcrumb[];
  /** Whether a retained predecessor can be activated through Back. */
  readonly canGoBack: boolean;
  /** Whether older history was evicted by bounded retention. */
  readonly historyTruncated: boolean;
  /** Current source-card rendering state, when present. */
  readonly source?: ReaderSourceViewModel;
  /** Current connections rendering state, when present. */
  readonly connections?: ReaderConnectionsViewModel;
  /** Exact selected target available for explicit export, when established. */
  readonly selectedTarget?: ReaderSelectedTargetViewModel;
}

/** Projects a reader-session snapshot into request-free rendering data. */
export function createReaderViewModel(
  session: ReaderSessionView,
): ReaderViewModel {
  const current = session.current;
  const source =
    current.source === undefined
      ? undefined
      : {
          viewModel: current.source.viewModel,
          ...(current.selectedPosition === undefined
            ? {}
            : { selectedPosition: current.selectedPosition }),
        };
  const connections = projectConnections(current.connections);
  const selectedTarget = selectedRef(
    current.source?.viewModel,
    current.selectedPosition,
  );
  return {
    currentEntryId: current.id,
    label: current.label,
    breadcrumbs: session.breadcrumbs,
    canGoBack: session.entries.length > 1,
    historyTruncated: session.historyTruncated,
    ...(source === undefined ? {} : { source }),
    ...(connections === undefined ? {} : { connections }),
    ...(selectedTarget === undefined
      ? {}
      : { selectedTarget: { ref: selectedTarget } }),
  };
}

function projectConnections(
  connections: ReaderConnectionsEntryView | undefined,
): ReaderConnectionsViewModel | undefined {
  if (connections === undefined) return undefined;
  if (connections.state === "unavailable") {
    return {
      state: "unavailable",
      reason: connections.reason,
      message: connections.message,
    };
  }
  return {
    state: "component",
    viewModel: connections.viewModel,
  };
}

function selectedRef(
  source: SourceCardViewModel | undefined,
  position: readonly number[] | undefined,
): string | undefined {
  if (source?.state !== "data" || position === undefined) return undefined;
  return source.items.find((item) => samePosition(item.position, position))
    ?.ref;
}

function samePosition(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
