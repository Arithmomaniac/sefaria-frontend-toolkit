import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaAcquisition,
  SefariaSourceCard,
  SourceCardRequest,
} from "@arithmomaniac/sefaria-web-components";
import { setOptionalElementAttribute } from "../../../../demos/live-demo-core.js";

/** Controls the interactive live source-card demonstration. */
export interface SourceCardLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the request form, presets, and display controls to the source card. */
export function startSourceCardLiveDemo(
  root: Document,
  acquisition: SefariaAcquisition = {
    kind: "client",
    client: createSefariaClient(),
  },
): SourceCardLiveDemo {
  const form = requireElement<HTMLFormElement>(root, "#source-card-form");
  const trefInput = requireNamedInput(form, "tref");
  const primaryTitleInput = requireNamedInput(form, "primaryVersionTitle");
  const translationTitleInput = requireNamedInput(
    form,
    "translationVersionTitle",
  );
  const submitButton = requireElement<HTMLButtonElement>(
    form,
    'button[type="submit"]',
  );
  const displayForm = requireElement<HTMLFormElement>(root, "#display-form");
  const requestState = requireElement<HTMLElement>(root, "#request-state");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const resultContent = requireElement<HTMLElement>(
    root,
    "#source-card-content",
  );
  const result = requireElement<SefariaSourceCard>(root, "#source-card-result");
  let activeLoad = 0;
  let acquisitionError: unknown;
  result.addEventListener("sefaria-source-card-error", (event) => {
    acquisitionError = (event as CustomEvent<{ readonly error: unknown }>)
      .detail.error;
  });

  const applyDisplaySettings = (): void => {
    const values = new FormData(displayForm);
    result.setAttribute(
      "content-language",
      readContentLanguage(values.get("contentLanguage")),
    );
    result.setAttribute("layout", readLayout(values.get("layout")));
    result.setAttribute("side-order", readSideOrder(values.get("sideOrder")));
    result.setAttribute(
      "vocalization-mode",
      readVocalizationMode(values.get("vocalizationMode")),
    );
  };

  const loadCurrentRequest = async (): Promise<void> => {
    const request = createRequest(
      trefInput.value,
      primaryTitleInput.value,
      translationTitleInput.value,
    );
    const loadId = ++activeLoad;
    const hadCommittedContent = result.status === "ready";
    resultContent.hidden = false;
    requestState.dataset.state = "loading";
    requestState.textContent = `Loading ${request.tref} from Sefaria.`;
    hostError.hidden = true;
    hostError.textContent = "";
    submitButton.disabled = true;
    acquisitionError = undefined;
    result.acquisition = acquisition;
    if (result.sref === request.tref) {
      result.setAttribute("sref", "");
      await result.updateComplete;
    }
    setOptionalElementAttribute(
      result,
      "primary-version-title",
      request.primary?.versionTitle,
    );
    setOptionalElementAttribute(
      result,
      "translation-version-title",
      request.translation?.versionTitle,
    );
    result.setAttribute("sref", request.tref);

    await waitForTerminalStatus(result, loadId, () => activeLoad);
    if (loadId !== activeLoad) return;

    if (acquisitionError === undefined) {
      requestState.dataset.state = result.status;
      const itemCount =
        result.shadowRoot?.querySelectorAll(".items > [data-position]")
          .length ?? 0;
      requestState.textContent =
        result.status === "ready"
          ? `${request.tref} produced ${itemCount} items from one request.`
          : `${request.tref} produced ${result.status}.`;
    } else if (acquisitionError !== undefined) {
      requestState.dataset.state = "error";
      requestState.textContent = `${request.tref} could not complete.`;
      if (!hadCommittedContent) {
        resultContent.hidden = true;
      }

      hostError.hidden = false;
      hostError.textContent =
        acquisitionError instanceof Error
          ? acquisitionError.message
          : String(acquisitionError);
    }
    submitButton.disabled = false;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void loadCurrentRequest();
  });
  displayForm.addEventListener("change", applyDisplaySettings);
  result.setAttribute("selectable", "");
  result.addEventListener("sefaria-source-select", (event) => {
    const detail = (
      event as CustomEvent<{
        readonly position: readonly number[];
        readonly ref: string;
      }>
    ).detail;
    requestState.dataset.state = "selected";
    requestState.textContent = `Selected ${detail.ref} at [${detail.position.join(", ")}].`;
  });
  applyDisplaySettings();

  for (const preset of root.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  )) {
    preset.addEventListener("click", () => {
      trefInput.value = preset.dataset.tref ?? "";
      primaryTitleInput.value = preset.dataset.primaryVersionTitle ?? "";
      translationTitleInput.value =
        preset.dataset.translationVersionTitle ?? "";
      form.requestSubmit();
    });
  }

  async function waitForTerminalStatus(
    result: SefariaSourceCard,
    loadId: number,
    activeLoad: () => number,
  ): Promise<void> {
    await result.updateComplete;
    while (loadId === activeLoad() && result.status === "loading") {
      await new Promise((resolve) => setTimeout(resolve));
      await result.updateComplete;
    }
  }

  return { loadCurrentRequest };
}

function createRequest(
  tref: string,
  primaryVersionTitle: string,
  translationVersionTitle: string,
): SourceCardRequest {
  const primary = primaryVersionTitle.trim();
  const translation = translationVersionTitle.trim();
  return {
    tref: tref.trim(),
    ...(primary.length === 0 ? {} : { primary: { versionTitle: primary } }),
    ...(translation.length === 0
      ? {}
      : { translation: { versionTitle: translation } }),
  };
}

function readContentLanguage(
  value: FormDataEntryValue | null,
): SefariaSourceCard["contentLanguage"] {
  return value === "primary" || value === "translation" ? value : "both";
}

function readLayout(
  value: FormDataEntryValue | null,
): SefariaSourceCard["layout"] {
  return value === "stacked" || value === "side-by-side" ? value : "auto";
}

function readSideOrder(
  value: FormDataEntryValue | null,
): SefariaSourceCard["sideOrder"] {
  return value === "translation-first" ? value : "primary-first";
}

function readVocalizationMode(
  value: FormDataEntryValue | null,
): SefariaSourceCard["vocalizationMode"] {
  return value === "nikkud" || value === "none" ? value : "taamim_and_nikkud";
}

function requireNamedInput(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The demo requires ${selector}.`);
  }
  return element;
}
