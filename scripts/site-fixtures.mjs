import { URL } from "node:url";

export function createFixtureResponse(
  requestUrl,
  policy,
  textFixture,
  linksFixture,
) {
  const url = new URL(requestUrl);
  const reference = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  if (policy === "text-fixture") {
    if (reference === "Micah 6:8" || reference === "micah 6:8") {
      return textFixture;
    }
    const target = globalThis.structuredClone(textFixture);
    const rashi = reference.startsWith("Rashi");
    const section =
      reference === "Micah 6" || reference === "Rashi on Micah 6:8";
    const sections = rashi
      ? section
        ? ["6", "8"]
        : ["6", "8", "1"]
      : section
        ? ["6"]
        : ["6", "8"];
    Object.assign(target, {
      ref: reference,
      heRef: reference,
      sectionRef: reference,
      heSectionRef: reference,
      book: rashi ? "Rashi on Micah" : "Micah",
      indexTitle: rashi ? "Rashi on Micah" : "Micah",
      heIndexTitle: rashi ? "Rashi on Micah" : "Micah",
      title: reference,
      sections,
      toSections: sections,
      sectionNames: rashi
        ? ["Chapter", "Verse", "Comment"]
        : ["Chapter", "Verse"],
      addressTypes: rashi
        ? ["Integer", "Integer", "Integer"]
        : ["Integer", "Integer"],
      textDepth: rashi ? 3 : 2,
      versions: target.versions.map((version) => ({
        ...version,
        text: section
          ? Array.from({ length: rashi ? 1 : 16 }, (_, index) =>
              rashi
                ? `Fixture text for Rashi on Micah 6:8:${index + 1}`
                : `Fixture text for Micah 6:${index + 1}`,
            )
          : `Fixture text for ${reference}`,
      })),
    });
    return target;
  }
  if (reference !== "Micah 6:8") return [];
  const base = globalThis.structuredClone(
    linksFixture.find((entry) => entry && !("isSheet" in entry)),
  );
  if (!base) throw new Error("Connections fixture has no text entry.");
  Object.assign(base, {
    _id: "site-reader-rashi",
    anchorRef: reference,
    anchorRefExpanded: [reference],
    sourceRef: "Rashi on Micah 6:8:1",
    ref: "Rashi on Micah 6:8:1",
    sourceHeRef: "Rashi on Micah 6:8:1",
    category: "Commentary",
    index_title: "Rashi on Micah",
  });
  return [base];
}
