import {
  createSefariaClient,
  validateGetV3Texts200,
  type CoreV3TextsResponse,
} from "@arithmomaniac/sefaria-client";
import { afterEach, expect, test, vi } from "vitest";
import micah from "../../../examples/react-vite/src/micah-6-8.json";
import captures from "../test/fixtures/translation-preference-2026-09-27.json";
import { validateSuppliedComponentData } from "./component-controller.js";
import { SefariaTextSegment } from "./text-segment-element.js";
import { SefariaBilingualSegment } from "./bilingual-segment-element.js";
import { SefariaSourceCard } from "./source-card-element.js";
import { getPreparedState } from "./prepared-state.js";

function payload(french: boolean, empty = false): CoreV3TextsResponse {
  if (!validateGetV3Texts200(micah)) throw new Error("Invalid Micah fixture.");
  const result = structuredClone(micah) as CoreV3TextsResponse;
  if (french) {
    const translation = result.versions.find((version) => !version.isSource)!;
    translation.versionTitle = "French fixture edition";
    translation.languageFamilyName = "french";
    translation.actualLanguage = "fr";
    translation.text = empty ? null : "French fixture text";
  }
  result.available_versions = result.versions.map((version) => ({
    ...version,
    title: result.indexTitle,
  }));
  return result;
}

function missing(): CoreV3TextsResponse {
  return captured("berakhotMissingFrench");
}

function captured(name: keyof typeof captures): CoreV3TextsResponse {
  return validateSuppliedComponentData<CoreV3TextsResponse>(
    { method: "GET", path: "/api/v3/texts/{tref}", status: 200 },
    structuredClone(captures[name].payload),
  );
}

function response(value: unknown): Response {
  return Response.json(value);
}

afterEach(() => document.body.replaceChildren());

for (const Constructor of [
  SefariaTextSegment,
  SefariaBilingualSegment,
  SefariaSourceCard,
]) {
  test(`${Constructor.name} requests the preferred family directly and preserves supplied equivalence`, async () => {
    const capture = captured("micahFrench");
    const fetchMock = vi.fn<typeof fetch>(async () => response(capture));
    const element = new Constructor();
    element.setAttribute("translation-language", " French ");
    element.sref = "Micah 6:8";
    element.acquisition = {
      kind: "client",
      client: createSefariaClient({ cache: false, fetch: fetchMock }),
    };
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot?.textContent).toContain(
      "Bible du Rabbinat 1899 [fr]",
    );
    expect(element.shadowRoot?.textContent).toContain("french");
    const input = fetchMock.mock.calls[0]![0];
    const url = new URL(input instanceof Request ? input.url : String(input));
    expect(url.searchParams.getAll("version")).toEqual(
      Constructor === SefariaTextSegment ? ["french"] : ["primary", "french"],
    );
    const supplied = new Constructor();
    supplied.setAttribute("translation-language", "french");
    supplied.data = capture;
    document.body.append(supplied);
    await supplied.updateComplete;
    expect(getPreparedState(supplied)).toEqual(getPreparedState(element));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test(`${Constructor.name} falls back only after a missing-language warning`, async () => {
    const requested: string[][] = [];
    const element = new Constructor();
    element.setAttribute("translation-language", "french");
    element.sref = "Berakhot 2a:1";
    element.acquisition = {
      kind: "capability",
      capability: {
        getText: async (request) => {
          requested.push([...request.versions]);
          return {
            payload:
              requested.length === 1 ? missing() : captured("berakhotDefault"),
            status: 200,
          };
        },
      },
    };
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    expect(requested).toEqual(
      Constructor === SefariaTextSegment
        ? [["french"], ["translation"]]
        : [
            ["primary", "french"],
            ["primary", "translation"],
          ],
    );
    expect(element.shadowRoot?.textContent).toMatch(/french is\s+unavailable/u);
    const supplied = new Constructor();
    supplied.translationLanguage = "french";
    supplied.data = captured("berakhotDefault");
    supplied.acquisition = { kind: "disabled" };
    document.body.append(supplied);
    await supplied.updateComplete;
    expect(getPreparedState(supplied)).toEqual(getPreparedState(element));
  });

  test(`${Constructor.name} does not fall back for an available empty edition`, async () => {
    const getText = vi.fn(async () => ({
      payload: payload(true, true),
      status: 200,
    }));
    const element = new Constructor();
    element.setAttribute("translation-language", "french");
    element.sref = "Micah 6:8";
    element.acquisition = { kind: "capability", capability: { getText } };
    document.body.append(element);
    await element.updateComplete;
    await vi.waitFor(() => expect(element.status).not.toBe("loading"));
    expect(getText.mock.calls).toHaveLength(1);
    expect(JSON.stringify(getPreparedState(element))).not.toContain(
      "He has shown you",
    );
    expect(JSON.stringify(getPreparedState(element))).toContain(
      "French fixture edition",
    );
    expect(getPreparedState(element)).toMatchObject(
      Constructor === SefariaTextSegment
        ? { state: "empty" }
        : Constructor === SefariaBilingualSegment
          ? { state: "partial", absent: { side: "translation" } }
          : {
              state: "data",
              items: [
                { pair: { state: "partial", absent: { side: "translation" } } },
              ],
            },
    );
  });

  test(`${Constructor.name} reconnects only the interrupted fallback request`, async () => {
    const requested: string[][] = [];
    let completeAborted:
      | ((value: { payload: CoreV3TextsResponse; status: number }) => void)
      | undefined;
    const element = new Constructor();
    element.translationLanguage = "french";
    element.sref = "Berakhot 2a:1";
    element.acquisition = {
      kind: "capability",
      capability: {
        getText: async (request) => {
          requested.push([...request.versions]);
          if (requested.length === 1)
            return { payload: missing(), status: 200 };
          if (requested.length === 2)
            return await new Promise((resolve) => {
              completeAborted = resolve;
            });
          return { payload: captured("berakhotDefault"), status: 200 };
        },
      },
    };
    document.body.append(element);
    await vi.waitFor(() => expect(requested).toHaveLength(2));
    element.remove();
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    expect(requested[2]).toEqual(requested[1]);
    expect(requested).toHaveLength(3);
    const committed = getPreparedState(element);
    completeAborted?.({ payload: payload(true), status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getPreparedState(element)).toEqual(committed);
  });

  test(`${Constructor.name} shows the actual language and can hide attribution without I/O`, async () => {
    const getText = vi.fn(async () => ({
      payload: captured("micahFrench"),
      status: 200,
    }));
    const element = new Constructor();
    element.translationLanguage = "french";
    element.sref = "Micah 6:8";
    element.acquisition = { kind: "capability", capability: { getText } };
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    const leaves =
      Constructor === SefariaTextSegment
        ? [element]
        : [...element.shadowRoot!.querySelectorAll("sefaria-text-segment")];
    expect(
      leaves.some((leaf) =>
        leaf.shadowRoot?.querySelector('article[lang="fr"]'),
      ),
    ).toBe(true);
    element.hideAttributions = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".attribution")).toBeNull();
    expect(getText).toHaveBeenCalledTimes(1);
  });
}

test.each([false, true])(
  "ten Source Card children use only outer requests (fallback=%s)",
  async (fallback) => {
    const value = fallback
      ? captured("berakhotDefault")
      : captured("micahFrench");
    for (const version of value.versions)
      version.text = Array.from({ length: 10 }, () => version.text);
    const getText = vi.fn(async () => ({
      payload: fallback && getText.mock.calls.length === 1 ? missing() : value,
      status: 200,
    }));
    const element = new SefariaSourceCard();
    element.sref = value.ref;
    element.translationLanguage = "french";
    element.acquisition = { kind: "capability", capability: { getText } };
    document.body.append(element);
    await vi.waitFor(() => expect(element.status).toBe("ready"));
    expect(element.shadowRoot?.querySelectorAll(".item")).toHaveLength(10);
    expect(
      element.shadowRoot?.querySelectorAll("sefaria-text-segment"),
    ).toHaveLength(20);
    expect(getText).toHaveBeenCalledTimes(fallback ? 2 : 1);
  },
);

test("no translation leaves Source Card primary content and an explicit absent side", async () => {
  const value = captured("noTranslation");
  const first = structuredClone(value);
  first.warnings = [
    { french: { warning_code: 102, message: "French unavailable." } },
  ];
  const getText = vi.fn(async () => ({
    payload: getText.mock.calls.length === 1 ? first : value,
    status: 200,
  }));
  const element = new SefariaSourceCard();
  element.sref = value.ref;
  element.translationLanguage = "french";
  element.acquisition = { kind: "capability", capability: { getText } };
  document.body.append(element);
  await vi.waitFor(() => expect(element.status).toBe("ready"));
  expect(getText).toHaveBeenCalledTimes(2);
  expect(element.shadowRoot?.textContent).toContain(
    "We do not have a translation",
  );
});
