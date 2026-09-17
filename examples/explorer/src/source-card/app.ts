import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaSourceCard,
  SourceCardController,
  SourceCardRequest,
} from "@arithmomaniac/sefaria-web-components";
import { bindSourceCardController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createSourceCardController } from "@arithmomaniac/sefaria-web-components/source-card";

/** Controls the interactive live source-card demonstration. */
export interface SourceCardLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the request form, presets, and display controls to the source card. */
export function startSourceCardLiveDemo(
  root: Document,
  controller: SourceCardController = createSourceCardController(
    createSefariaClient(),
  ),
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
  bindSourceCardController(result, controller);

  const applyDisplaySettings = (): void => {
    const values = new FormData(displayForm);
    result.contentLanguage = readContentLanguage(values.get("contentLanguage"));
    result.layout = readLayout(values.get("layout"));
    result.sideOrder = readSideOrder(values.get("sideOrder"));
    result.vocalizationMode = readVocalizationMode(
      values.get("vocalizationMode"),
    );
  };

  const loadCurrentRequest = async (): Promise<void> => {
    const request = createRequest(
      trefInput.value,
      primaryTitleInput.value,
      translationTitleInput.value,
    );
    resultContent.hidden = false;
    requestState.dataset.state = "loading";
    requestState.textContent = `Loading ${request.tref} from Sefaria.`;
    hostError.hidden = true;
    hostError.textContent = "";
    submitButton.disabled = true;

    try {
      const viewModel = await controller.load(request);
      if (controller.snapshot.result?.viewModel !== viewModel) {
        return;
      }
      requestState.dataset.state = viewModel.state;
      requestState.textContent =
        viewModel.state === "data"
          ? `${request.tref} produced ${viewModel.items.length} items from one request.`
          : `${request.tref} produced ${viewModel.state}.`;
    } catch (error) {
      if (
        controller.snapshot.attempt.state !== "failed" ||
        controller.snapshot.attempt.error !== error
      ) {
        return;
      }
      requestState.dataset.state = "error";
      requestState.textContent = `${request.tref} could not complete.`;
      if (controller.snapshot.result === undefined) {
        resultContent.hidden = true;
      }
      hostError.hidden = false;
      hostError.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      if (controller.snapshot.attempt.state !== "loading") {
        submitButton.disabled = false;
      }
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void loadCurrentRequest();
  });
  displayForm.addEventListener("change", applyDisplaySettings);
  result.selectable = true;
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
