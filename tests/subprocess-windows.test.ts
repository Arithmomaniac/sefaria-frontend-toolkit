import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parseSync, Visitor } from "oxc-parser";
import { expect, it } from "vitest";

it("hides validation subprocess consoles", () => {
  const directory = path.resolve("scripts");
  let checked = 0;
  for (const file of readdirSync(directory).filter((name) =>
    name.endsWith(".mjs"),
  )) {
    const { program } = parseSync(
      file,
      readFileSync(path.join(directory, file), "utf8"),
    );
    new Visitor({
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          ["spawn", "spawnSync", "execFile", "execFileSync"].includes(
            node.callee.name,
          )
        ) {
          const options = node.arguments[2];
          const context = `${file}: ${node.callee.name}`;
          expect(options?.type, context).toBe("ObjectExpression");
          if (options?.type === "ObjectExpression") {
            expect(
              options.properties.some(
                (property) =>
                  property.type === "Property" &&
                  property.key.type === "Identifier" &&
                  property.key.name === "windowsHide" &&
                  property.value.type === "Literal" &&
                  property.value.value === true,
              ),
              context,
            ).toBe(true);
          }
          checked++;
        }
      },
    }).visit(program);
  }
  expect(checked).toBeGreaterThan(0);
});

it("hides Windows PowerShell child probes in example scripts and tests", async () => {
  const files = [
    path.resolve("examples", "mcp-app", "scripts", "vscode-process.test.ts"),
  ];
  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    const visiblePowerShellLaunch =
      /Start-Process(?![^\r\n]*-WindowStyle\s+Hidden)[^\r\n]*powershell\.exe/iu;
    expect(contents, file).not.toMatch(visiblePowerShellLaunch);
  }
});
