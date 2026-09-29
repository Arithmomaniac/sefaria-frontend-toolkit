import prettier from "prettier";
import tsBlankSpace from "ts-blank-space";

// ts-blank-space keeps line positions, so a line that becomes blank held only types.
export async function toJavaScript(typescript) {
  const originalLines = typescript.split(/\r?\n/);
  const strippedLines = tsBlankSpace(typescript).split(/\r?\n/);
  const kept = strippedLines.filter(
    (line, index) => line.trim() !== "" || originalLines[index].trim() === "",
  );
  return prettier.format(kept.join("\n"), { parser: "babel" });
}
