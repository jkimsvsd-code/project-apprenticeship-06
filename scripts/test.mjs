import ts from "typescript";
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
const out = ".sites-runtime/tests";
const files = [
  "src/server/store.ts",
  "src/shared/domain.ts",
  ...["tests/unit", "tests/integration"].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".test.ts"))
      .map((f) => join(dir, f)),
  ),
];
for (const file of files) {
  const target = join(out, file.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(target), { recursive: true });
  let source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  source = source.replace(
    /(from\s+["'])(\.[^"']+)(["'])/g,
    (_, a, b, c) => `${a}${/\.[cm]?js$/.test(b) ? b : b + ".js"}${c}`,
  );
  writeFileSync(target, source);
}
writeFileSync(join(out, "package.json"), '{"type":"module"}');
const tests = files
  .filter((f) => f.includes(".test."))
  .map((f) => join(out, f.replace(/\.ts$/, ".js")));
const result = spawnSync(process.execPath, ["--test", ...tests], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
