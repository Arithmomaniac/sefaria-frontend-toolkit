import { ts } from "@custom-elements-manifest/analyzer";

const expressionMarker = "\u0000EXPRESSION\u0000";

export function verifyElementTemplateContract({
  declaration,
  sourcePath,
  source,
}) {
  const evidence = collectTemplateEvidence(sourcePath, source);
  const declaredSlots = collectDeclaredNames(
    sourcePath,
    "slots",
    declaration.slots ?? [],
  );
  const declaredCssParts = collectDeclaredNames(
    sourcePath,
    "CSS parts",
    declaration.cssParts ?? [],
  );

  assertSameSet(
    sourcePath,
    "template slots",
    evidence.slots,
    "declared slots",
    declaredSlots,
  );
  const undeclaredExportedParts = [...evidence.exportedCssParts]
    .filter((name) => !declaredCssParts.has(name))
    .sort();
  if (undeclaredExportedParts.length > 0) {
    throw new Error(
      `${sourcePath} exportparts aliases are not declared CSS parts: ${undeclaredExportedParts.join(", ")}`,
    );
  }
  assertSameSet(
    sourcePath,
    "template CSS parts",
    new Set([...evidence.cssParts, ...evidence.exportedCssParts]),
    "declared CSS parts",
    declaredCssParts,
  );
}

function collectTemplateEvidence(sourcePath, source) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const slots = new Set();
  const cssParts = new Set();
  const exportedCssParts = new Set();
  const litTemplateTags = collectLitTemplateTags(sourceFile);

  const visit = (node) => {
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = unwrapTemplateTag(node.tag);
      const supported = isLitTemplateTag(tag, litTemplateTags);
      if (!supported && isUnresolvedMarkupTemplateTag(tag, litTemplateTags)) {
        throw new Error(
          `${sourcePath} uses an unresolved markup template tag: ${node.tag.getText(sourceFile)}`,
        );
      }
      if (!supported) {
        ts.forEachChild(node, visit);
        return;
      }
      const template = renderTemplate(node.template);
      collectFromTemplate(
        sourcePath,
        template,
        slots,
        cssParts,
        exportedCssParts,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { slots, cssParts, exportedCssParts };
}

function collectLitTemplateTags(sourceFile) {
  const identifiers = new Set();
  const namespaces = new Set();
  const unresolvedIdentifiers = new Set();
  const unresolvedNamespaces = new Set();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const moduleName = statement.moduleSpecifier.text;
    const isLitModule =
      moduleName === "lit" ||
      moduleName.startsWith("lit/") ||
      moduleName === "lit-html" ||
      moduleName.startsWith("lit-html/");
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      (isLitModule ? namespaces : unresolvedNamespaces).add(bindings.name.text);
      continue;
    }
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "html" || importedName === "svg") {
        (isLitModule ? identifiers : unresolvedIdentifiers).add(
          element.name.text,
        );
      }
    }
  }
  return {
    identifiers,
    namespaces,
    unresolvedIdentifiers,
    unresolvedNamespaces,
  };
}

function isLitTemplateTag(tag, litTemplateTags) {
  if (ts.isIdentifier(tag)) {
    return litTemplateTags.identifiers.has(tag.text);
  }
  if (
    ts.isPropertyAccessExpression(tag) &&
    ts.isIdentifier(tag.expression) &&
    litTemplateTags.namespaces.has(tag.expression.text)
  ) {
    return tag.name.text === "html" || tag.name.text === "svg";
  }
  return false;
}

function unwrapTemplateTag(tag) {
  let current = tag;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isUnresolvedMarkupTemplateTag(tag, litTemplateTags) {
  if (ts.isIdentifier(tag)) {
    return (
      tag.text === "html" ||
      tag.text === "svg" ||
      litTemplateTags.unresolvedIdentifiers.has(tag.text)
    );
  }
  if (ts.isPropertyAccessExpression(tag)) {
    return (
      (tag.name.text === "html" || tag.name.text === "svg") &&
      (!ts.isIdentifier(tag.expression) ||
        litTemplateTags.unresolvedNamespaces.has(tag.expression.text) ||
        !litTemplateTags.namespaces.has(tag.expression.text))
    );
  }
  if (ts.isElementAccessExpression(tag)) {
    if (
      ts.isIdentifier(tag.expression) &&
      litTemplateTags.namespaces.has(tag.expression.text)
    ) {
      return true;
    }
    return (
      ts.isStringLiteral(tag.argumentExpression) &&
      (tag.argumentExpression.text === "html" ||
        tag.argumentExpression.text === "svg")
    );
  }
  return false;
}

function renderTemplate(template) {
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    return template.text;
  }
  return [
    template.head.text,
    ...template.templateSpans.flatMap((span) => [
      expressionMarker,
      span.literal.text,
    ]),
  ].join("");
}

function collectFromTemplate(
  sourcePath,
  template,
  slots,
  cssParts,
  exportedCssParts,
) {
  for (const tag of scanTags(template)) {
    const tagName = /^<([A-Za-z][^\s/>]*)/u.exec(tag)?.[1];
    if (tagName === "slot") {
      const name = readAttribute(sourcePath, tag, "name", true, "slot name");
      slots.add(name ?? "");
    }

    const part = readAttribute(sourcePath, tag, "part", false);
    if (part !== undefined) {
      for (const name of part.split(/\s+/u).filter(Boolean)) {
        cssParts.add(name);
      }
    }

    const exportparts = readAttribute(sourcePath, tag, "exportparts", false);
    if (exportparts !== undefined) {
      for (const mapping of exportparts.split(",")) {
        const [inner, outer] = mapping.split(":").map((name) => name?.trim());
        const publicName = outer || inner;
        if (publicName) exportedCssParts.add(publicName);
      }
    }
  }
}

function* scanTags(template) {
  for (let index = 0; index < template.length; index += 1) {
    if (
      template[index] !== "<" ||
      !/[A-Za-z]/u.test(template[index + 1] ?? "")
    ) {
      continue;
    }
    let quote;
    let end = index + 1;
    for (; end < template.length; end += 1) {
      const character = template[end];
      if (quote !== undefined) {
        if (character === quote) quote = undefined;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === ">") {
        yield template.slice(index, end + 1);
        index = end;
        break;
      }
    }
  }
}

function readAttribute(sourcePath, tag, name, optional, label = name) {
  const dynamic = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*${expressionMarker}`,
    "u",
  );
  if (dynamic.test(tag)) {
    throw new Error(`${sourcePath} uses a dynamic ${label} binding.`);
  }

  const literal = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "u",
  ).exec(tag);
  if (literal) return literal[1] ?? literal[2] ?? "";

  const unquoted = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*([^\\s"'=<>]+)`,
    "u",
  ).exec(tag);
  if (unquoted) return unquoted[1] ?? "";

  if (!optional && new RegExp(`(?:^|\\s)${name}(?:\\s|/?>)`, "u").test(tag)) {
    throw new Error(`${sourcePath} uses ${label} without a literal value.`);
  }
  return undefined;
}

function collectDeclaredNames(sourcePath, label, entries) {
  const names = new Set();
  for (const entry of entries) {
    if (names.has(entry.name)) {
      throw new Error(
        `${sourcePath} declares duplicate ${label}: ${entry.name}`,
      );
    }
    names.add(entry.name);
  }
  return names;
}

function assertSameSet(
  sourcePath,
  actualLabel,
  actual,
  expectedLabel,
  expected,
) {
  const unexpected = [...actual].filter((name) => !expected.has(name)).sort();
  if (unexpected.length > 0) {
    throw new Error(
      `${sourcePath} ${actualLabel} are not ${expectedLabel}: ${unexpected.join(", ")}`,
    );
  }
  const missing = [...expected].filter((name) => !actual.has(name)).sort();
  if (missing.length > 0) {
    throw new Error(
      `${sourcePath} ${expectedLabel} are absent from ${actualLabel}: ${missing.join(", ")}`,
    );
  }
}
