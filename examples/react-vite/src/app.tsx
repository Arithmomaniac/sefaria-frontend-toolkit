import {
  createSefariaClient,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type { SefariaSourceCard } from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import {
  createSourceCardController,
  type SourceCardController,
  type SourceCardControllerSnapshot,
  type SourceCardTerminalViewModel,
  type SourceCardViewModel,
} from "@arithmomaniac/sefaria-web-components/source-card";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import payload from "./micah-6-8.json";
import { reactSourceCardSnippet } from "./source-snippet.js";

const suppliedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;

interface SourceSelection {
  readonly position: readonly number[];
  readonly ref: string;
}

export interface ReactSourceCardExampleProps {
  readonly client?: SefariaClient;
  readonly initialTref?: string;
}

export function ReactSourceCardExample({
  client: suppliedClient,
  initialTref = "Micah 6:8",
}: ReactSourceCardExampleProps) {
  const [client] = useState(
    () => suppliedClient ?? createSefariaClient({ cache: false }),
  );
  const [controller, setController] = useState<SourceCardController>();

  useEffect(() => {
    const next = createSourceCardController(client);
    next.setSuppliedData({ tref: "Micah 6:8" }, suppliedPayload);
    setController(next);
    return () => {
      setController((current) => (current === next ? undefined : current));
      next.dispose();
    };
  }, [client]);

  if (controller === undefined) {
    return (
      <main className="react-example">
        <p role="status">Preparing the validated supplied example.</p>
      </main>
    );
  }

  return (
    <ActiveReactSourceCardExample
      controller={controller}
      initialTref={initialTref}
    />
  );
}

function ActiveReactSourceCardExample({
  controller,
  initialTref,
}: {
  readonly controller: SourceCardController;
  readonly initialTref: string;
}) {
  const snapshot = useSourceCardSnapshot(controller);
  const [card, setCard] = useState<SefariaSourceCard | null>(null);
  const [tref, setTref] = useState(initialTref);
  const [selected, setSelected] = useState<SourceSelection>();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewWidth, setPreviewWidth] = useState(720);
  const [contentLanguage, setContentLanguage] = useState<
    "both" | "primary" | "translation"
  >("both");
  const [layout, setLayout] = useState<"auto" | "side-by-side" | "stacked">(
    "auto",
  );
  const [sideOrder, setSideOrder] = useState<
    "primary-first" | "translation-first"
  >("primary-first");
  const [vocalizationMode, setVocalizationMode] = useState<
    "taamim_and_nikkud" | "nikkud" | "none"
  >("taamim_and_nikkud");
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [inputFailure, setInputFailure] = useState<string>();
  const previousResult = useRef(snapshot.result);

  useEffect(() => {
    if (card === null) return;
    return bindSourceCardController(card, controller);
  }, [card, controller]);

  useEffect(() => {
    if (
      previousResult.current !== undefined &&
      snapshot.result !== undefined &&
      snapshot.result !== previousResult.current
    ) {
      setSelected(undefined);
    }
    previousResult.current = snapshot.result;
  }, [snapshot.result]);

  const onSourceSelection = useCallback(
    (event: CustomEvent<SourceSelection>): void => {
      setSelected({
        position: [...event.detail.position],
        ref: event.detail.ref,
      });
    },
    [],
  );

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const normalized = tref.trim();
    if (normalized.length === 0) {
      setInputFailure("Enter a non-blank Sefaria reference.");
      return;
    }
    setInputFailure(undefined);
    setLoadAttempts((count) => count + 1);
    void controller.load({ tref: normalized }).catch(() => undefined);
  };

  const viewModel = displayedViewModel(snapshot);
  const canonicalRef = committedCanonicalRef(snapshot);
  const failure =
    inputFailure ??
    (snapshot.attempt.state === "failed"
      ? errorMessage(snapshot.attempt.error)
      : undefined);
  const requestStatus = describeStatus(snapshot, loadAttempts, canonicalRef);

  return (
    <main className="react-example">
      <header className="intro">
        <p className="eyebrow">Standalone React consumer</p>
        <h1>Bind React state to a request-free Sefaria Web Component</h1>
        <p>
          Validated supplied data renders first. Submitting the form is the only
          live activation. React owns presentation properties and receives the
          component&apos;s canonical selection event; the shared controller and
          binder own loading, stale-result rejection, and view-model delivery.
        </p>
      </header>

      <section className="controls" aria-label="React host controls">
        <form onSubmit={onSubmit}>
          <label>
            Reference
            <input
              name="tref"
              value={tref}
              onChange={(event) => setTref(event.currentTarget.value)}
              required
            />
          </label>
          <button id="load-live" type="submit">
            Load reference
          </button>
        </form>
        <div className="display-controls">
          <button
            id="theme-toggle"
            type="button"
            onClick={() =>
              setTheme((value) => (value === "light" ? "dark" : "light"))
            }
          >
            Use {theme === "light" ? "dark" : "light"} theme
          </button>
          <label>
            Preview width
            <input
              id="preview-width"
              type="range"
              min="320"
              max="960"
              step="20"
              value={previewWidth}
              onChange={(event) =>
                setPreviewWidth(Number(event.currentTarget.value))
              }
            />
            <output>{previewWidth}px</output>
          </label>
          <label>
            Text sides
            <select
              id="content-language"
              value={contentLanguage}
              onChange={(event) =>
                setContentLanguage(
                  event.currentTarget.value as
                    "both" | "primary" | "translation",
                )
              }
            >
              <option value="both">Hebrew and translation</option>
              <option value="primary">Primary only</option>
              <option value="translation">Translation only</option>
            </select>
          </label>
          <label>
            Layout
            <select
              id="layout"
              value={layout}
              onChange={(event) =>
                setLayout(
                  event.currentTarget.value as
                    "auto" | "side-by-side" | "stacked",
                )
              }
            >
              <option value="auto">Automatic</option>
              <option value="side-by-side">Side by side</option>
              <option value="stacked">Stacked</option>
            </select>
          </label>
          <label>
            Side order
            <select
              id="side-order"
              value={sideOrder}
              onChange={(event) =>
                setSideOrder(
                  event.currentTarget.value as
                    "primary-first" | "translation-first",
                )
              }
            >
              <option value="primary-first">Primary first</option>
              <option value="translation-first">Translation first</option>
            </select>
          </label>
          <label>
            Hebrew marks
            <select
              id="vocalization-mode"
              value={vocalizationMode}
              onChange={(event) =>
                setVocalizationMode(
                  event.currentTarget.value as
                    "taamim_and_nikkud" | "nikkud" | "none",
                )
              }
            >
              <option value="taamim_and_nikkud">Cantillation and vowels</option>
              <option value="nikkud">Vowels only</option>
              <option value="none">No marks</option>
            </select>
          </label>
        </div>
      </section>

      <p id="request-status" className="status" role="status">
        {requestStatus}
      </p>
      <p id="request-count" className="status">
        Live load attempts: {loadAttempts}
      </p>
      <p id="committed-ref" className="status">
        {canonicalRef === undefined
          ? "Current result has no committed canonical reference."
          : `Current committed reference: ${canonicalRef}.`}
      </p>

      {failure === undefined ? null : (
        <p id="load-error" className="failure" role="alert">
          {failure}
          {inputFailure === undefined &&
          snapshot.attempt.state === "failed" &&
          canonicalRef !== undefined
            ? ` The prior committed ${canonicalRef} card remains displayed.`
            : ""}
        </p>
      )}

      <section
        id="preview"
        className="preview"
        data-theme={theme}
        style={{ maxWidth: `${previewWidth}px` }}
      >
        <sefaria-source-card
          ref={setCard}
          contentLanguage={contentLanguage}
          layout={layout}
          sideOrder={sideOrder}
          vocalizationMode={vocalizationMode}
          selectable={viewModel?.state === "data"}
          selectedPosition={selected?.position}
          onsefaria-source-select={onSourceSelection}
        />
      </section>

      <p id="selected-ref" className="event-state" aria-live="polite">
        {selected
          ? `React received selection: ${selected.ref}.`
          : "Select the rendered segment to send its canonical component event to React."}
      </p>

      <section className="diagnostics" aria-label="Optional diagnostics">
        <details>
          <summary>Actual React binding source</summary>
          <pre>
            <code>{reactSourceCardSnippet}</code>
          </pre>
        </details>
        <details>
          <summary>Current view model</summary>
          <pre>
            <code>{JSON.stringify(viewModel, null, 2)}</code>
          </pre>
        </details>
        <details>
          <summary>Latest component event</summary>
          <pre>
            <code>{JSON.stringify(selected ?? null, null, 2)}</code>
          </pre>
        </details>
      </section>
    </main>
  );
}

function useSourceCardSnapshot(
  controller: SourceCardController,
): SourceCardControllerSnapshot {
  return useSyncExternalStore(
    (notify) => controller.subscribe(() => notify()),
    () => controller.snapshot,
  );
}

function displayedViewModel(
  snapshot: SourceCardControllerSnapshot,
): SourceCardViewModel | undefined {
  return snapshot.attempt.state === "loading"
    ? snapshot.attempt.viewModel
    : snapshot.result?.viewModel;
}

function committedCanonicalRef(
  snapshot: SourceCardControllerSnapshot,
): string | undefined {
  const viewModel: SourceCardTerminalViewModel | undefined =
    snapshot.result?.viewModel;
  return viewModel?.state === "data" || viewModel?.state === "empty"
    ? viewModel.header.ref
    : undefined;
}

function describeStatus(
  snapshot: SourceCardControllerSnapshot,
  loadAttempts: number,
  canonicalRef: string | undefined,
): string {
  if (snapshot.attempt.state === "loading") {
    return `Loading ${snapshot.attempt.request.tref} through the public controller.`;
  }
  if (snapshot.attempt.state === "failed") {
    return canonicalRef === undefined
      ? "The live load failed. No canonical result is committed."
      : `The live load failed. Showing the prior committed ${canonicalRef} result.`;
  }
  if (loadAttempts === 0) {
    return canonicalRef === undefined
      ? "Supplied component content rendered with zero live loads."
      : `Supplied ${canonicalRef} data rendered with zero live loads.`;
  }
  return canonicalRef === undefined
    ? "The component committed an error result without a canonical reference."
    : `Committed canonical reference ${canonicalRef}.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
