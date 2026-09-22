import {
  createSefariaClient,
  text,
  type CoreV3TextsResponse,
  type SefariaClient,
  zCoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaAcquisition,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";
import { useCallback, useRef, useState, type FormEvent } from "react";

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
  const [data, setData] = useState<CoreV3TextsResponse | undefined>(
    suppliedPayload,
  );
  const [sref, setSref] = useState("");
  const selectedMetadataRef = useRef<string | undefined>(undefined);
  const [acquisition] = useState<SefariaAcquisition>(() =>
    createSourceCardAcquisition(client, (ref) => {
      selectedMetadataRef.current = ref;
    }),
  );
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
  const [committedRef, setCommittedRef] = useState("Micah 6:8");
  const [status, setStatus] = useState(
    "Supplied Micah 6:8 data rendered with zero live loads.",
  );
  const cardObserver = useRef<MutationObserver | undefined>(undefined);
  const liveActivated = useRef(false);

  const setCard = useCallback((card: SefariaSourceCard | null) => {
    cardObserver.current?.disconnect();
    cardObserver.current = undefined;
    if (card === null) return;
    const synchronizeCommittedReference = (): void => {
      if (
        card.status !== "ready" ||
        selectedMetadataRef.current === undefined ||
        !liveActivated.current
      ) {
        return;
      }
      setCommittedRef(selectedMetadataRef.current);
      setStatus(
        `Committed canonical reference ${selectedMetadataRef.current}.`,
      );
    };
    const observer = new MutationObserver(synchronizeCommittedReference);
    observer.observe(card.shadowRoot!, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    cardObserver.current = observer;
    synchronizeCommittedReference();
    return () => {
      observer.disconnect();
      if (cardObserver.current === observer) {
        cardObserver.current = undefined;
      }
    };
  }, []);

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
    setSelected(undefined);
    liveActivated.current = true;
    setLoadAttempts((count) => count + 1);
    setStatus(
      `Activated ${normalized}. The Source Card reports loading and results inline.`,
    );
    selectedMetadataRef.current = undefined;
    setData(undefined);
    setSref(normalized);
  };

  return (
    <main className="react-example">
      <header className="intro">
        <p className="eyebrow">Standalone React consumer</p>
        <h1>Pass declarative inputs to a Sefaria Web Component</h1>
        <p>
          Validated supplied data renders first. Submitting the form is the only
          live activation. React owns presentation properties and receives the
          component&apos;s canonical selection event; the element owns
          acquisition, cancellation, loading, and error presentation.
        </p>
      </header>

      <section className="controls" aria-label="React host controls">
        <form onSubmit={onSubmit}>
          <label>
            Reference
            <input
              name="tref"
              value={tref}
              onChange={(event) => {
                setTref(event.currentTarget.value);
                setInputFailure(undefined);
              }}
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

      <p id="request-status" className="status">
        {status}
      </p>
      <p id="request-count" className="status">
        Live load attempts: {loadAttempts}
      </p>
      <p id="committed-ref" className="status">
        Current committed reference: {committedRef}.
      </p>
      {inputFailure === undefined ? null : (
        <p id="input-error" className="failure" role="alert">
          {inputFailure}
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
          data={data}
          sref={sref}
          acquisition={acquisition}
          contentLanguage={contentLanguage}
          layout={layout}
          sideOrder={sideOrder}
          vocalizationMode={vocalizationMode}
          selectable
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
          <summary>Actual React element source</summary>
          <pre>
            <code>{reactSourceCardSnippet}</code>
          </pre>
        </details>
        <details>
          <summary>Current declarative inputs</summary>
          <pre>
            <code>
              {JSON.stringify({ sref, hasData: data !== undefined }, null, 2)}
            </code>
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

function createSourceCardAcquisition(
  client: SefariaClient,
  selectMetadata: (ref: string) => void,
): SefariaAcquisition {
  return {
    kind: "capability",
    capability: {
      getText: async (request, signal) => {
        const result = await text.getV3Texts({
          client,
          path: { tref: request.sref },
          query: {
            version: [...request.versions],
            return_format: request.returnFormat,
          },
          signal,
        });
        if (result.data !== undefined) {
          selectMetadata(result.data.ref);
          return { payload: result.data, status: 200 };
        }
        if (result.error !== undefined && result.response !== undefined) {
          return {
            payload: result.error,
            status: result.response.status,
          };
        }
        throw new Error("The source-card request returned no result.");
      },
    },
  };
}
