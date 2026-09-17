import { createSefariaClient } from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  BilingualSegmentController,
  BilingualSegmentRequest,
  SefariaBilingualSegment,
} from "@arithmomaniac/sefaria-web-components";
import { bindBilingualSegmentController } from "@arithmomaniac/sefaria-web-components/bindings";
import { createBilingualSegmentController } from "@arithmomaniac/sefaria-web-components/bilingual-segment";

/** Controls the interactive live bilingual-segment demonstration. */
export interface BilingualSegmentLiveDemo {
  /** Loads the current form values. */
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Connects the demo form, presets, and display controls to the production factory. */
export function startBilingualSegmentLiveDemo(
  root: Document,
  controller: BilingualSegmentController = createBilingualSegmentController(
    createSefariaClient(),
  ),
): BilingualSegmentLiveDemo {
  const form = requireElement<HTMLFormElement>(root, "#bilingual-request-form");
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
  const result = requireElement<SefariaBilingualSegment>(
    root,
    "#bilingual-result",
  );
  bindBilingualSegmentController(result, controller);

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

    requestState.dataset.state = "loading";
    requestState.textContent = `Loading ${formatRequest(request)} from Sefaria.`;
    hostError.hidden = true;
    hostError.textContent = "";
    submitButton.disabled = true;

    try {
      const viewModel = await controller.load(request);
      if (controller.snapshot.result?.viewModel !== viewModel) {
        return;
      }
      requestState.dataset.state = viewModel.state;
      requestState.textContent = `${formatRequest(request)} produced ${viewModel.state}.`;
    } catch (error) {
      if (
        controller.snapshot.attempt.state !== "failed" ||
        controller.snapshot.attempt.error !== error
      ) {
        return;
      }
      requestState.dataset.state = "error";
      requestState.textContent = `${formatRequest(request)} could not complete.`;
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
): BilingualSegmentRequest {
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

function formatRequest(request: BilingualSegmentRequest): string {
  const editions = [
    request.primary === undefined
      ? "primary"
      : `primary | ${request.primary.versionTitle}`,
    request.translation === undefined
      ? "translation"
      : `translation | ${request.translation.versionTitle}`,
  ];
  return `${request.tref} (${editions.join(", ")})`;
}

function readContentLanguage(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["contentLanguage"] {
  return value === "primary" || value === "translation" ? value : "both";
}

function readLayout(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["layout"] {
  return value === "stacked" || value === "side-by-side" ? value : "auto";
}

function readSideOrder(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["sideOrder"] {
  return value === "translation-first" ? value : "primary-first";
}

function readVocalizationMode(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["vocalizationMode"] {
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
