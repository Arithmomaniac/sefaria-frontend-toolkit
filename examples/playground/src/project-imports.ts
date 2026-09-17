import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

export function rewriteDeclaredAssets(
  source: string,
  declaredAssets: Readonly<Record<string, string>>,
): string {
  const state = EditorState.create({ doc: source, extensions: [javascript()] });
  const normalizedSource = state.doc.toString();
  const replacements: { start: number; end: number; value: string }[] = [];
  syntaxTree(state).iterate({
    enter(node) {
      const parentName = node.node.parent?.name;
      if (node.name === "DynamicImport" || parentName === "DynamicImport") {
        throw new Error(
          "Dynamic imports are not supported in editable projects.",
        );
      }
      if (
        node.name !== "String" ||
        (parentName !== "ImportDeclaration" &&
          parentName !== "ExportDeclaration")
      ) {
        return;
      }
      const quoted = normalizedSource.slice(node.from, node.to);
      const specifier = quoted.slice(1, -1);
      if (specifier.includes("\\")) {
        throw new Error(
          `Escaped import specifiers are not supported: ${quoted}.`,
        );
      }
      const declaredAsset = declaredAssets[specifier];
      if (
        Object.hasOwn(declaredAssets, specifier) &&
        declaredAsset !== undefined
      ) {
        replacements.push({
          start: node.from + 1,
          end: node.to - 1,
          value: declaredAsset,
        });
        return;
      }
      if (
        specifier.startsWith(".") ||
        specifier.startsWith("/") ||
        /^[a-z][a-z\d+.-]*:/iu.test(specifier)
      ) {
        throw new Error(`Unsupported project import ${specifier}.`);
      }
    },
  });
  let rewritten = normalizedSource;
  for (const replacement of replacements.sort(
    (left, right) => right.start - left.start,
  )) {
    rewritten = `${rewritten.slice(0, replacement.start)}${replacement.value}${rewritten.slice(replacement.end)}`;
  }
  return rewritten;
}
