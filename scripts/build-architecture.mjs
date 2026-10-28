/** Generate the offline diagram from the executable design model and source. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';
import { nodes, commands, views, metadata } from '../docs/architecture-model.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const contract = JSON.parse(readFileSync(resolve(root, 'contracts/pds-schema-v2.json'), 'utf8'));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const additions = ['docs/architecture-model.mjs', 'docs/architecture-diagram.html', 'docs/architecture-diagram.template.html', 'docs/architecture-hosting.json', 'scripts/build-architecture.mjs'];
const files = [...new Set([...tracked, ...additions])].sort();
const describe = (path) => {
  if (/^src\/features\//.test(path)) return '기능 화면';
  if (/^src\/server\//.test(path)) return '서버 저장소';
  if (/^src\/shared\//.test(path)) return '공유 도메인·통신';
  if (/^src\/components\//.test(path)) return '공통 UI';
  if (/^src\//.test(path)) return '클라이언트 조정·안내';
  if (/^app\/api\//.test(path)) return 'HTTP API';
  if (/^app\//.test(path)) return '페이지·스타일·starter 도우미';
  if (/^(db|drizzle|contracts)\//.test(path)) return '스키마·마이그레이션·계약';
  if (/^tests\//.test(path)) return '검증';
  if (/^docs\//.test(path)) return '설계·운영·제출·증거';
  if (/^(lib|worker|scripts)\//.test(path)) return '런타임·빌드·보조 코드';
  return '설정·루트 문서·정적 자원';
};
const manifest = files.map((path) => {
  const item = { path, role: describe(path), imports: [], dynamicImports: [], exports: [], tests: [] };
  if (!existsSync(resolve(root, path)) || !/\.(?:[cm]?[jt]sx?)$/.test(path)) return item;
  const text = readFileSync(resolve(root, path), 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) item.imports.push(statement.moduleSpecifier.text);
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) item.imports.push(statement.moduleSpecifier.text);
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) item.exports.push(...statement.exportClause.elements.map((element) => element.name.text));
    if (ts.isExportAssignment(statement)) item.exports.push('default');
    if (statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const prefix = statement.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default ' : '';
      if (statement.name) item.exports.push(prefix + statement.name.getText(source));
      else if (ts.isVariableStatement(statement)) item.exports.push(...statement.declarationList.declarations.map((d) => d.name.getText(source)));
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'test' && ts.isStringLiteral(node.arguments[0])) item.tests.push(node.arguments[0].text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) item.dynamicImports.push(node.arguments[0]?.getText(source) ?? '');
    ts.forEachChild(node, visit);
  }
  visit(source);
  return item;
});
const tableNodes = Object.entries(contract.tables).map(([name, table]) => ({
  id: `table-${name}`, label: name, sub: `${table.fields.length}개 필드 · ${table.foreign_keys.length}개 FK`,
  files: ['db/schema.ts', 'drizzle/0000_steep_paladin.sql', 'contracts/pds-schema-v2.json'],
  details: [
    ...table.fields.map((f) => `${f.name}: ${f.type}${f.required ? ' NOT NULL' : ' NULL'}${f.primary_key ? ' · PRIMARY KEY' : ''}${Object.hasOwn(f, 'default') ? ` · DEFAULT ${f.default}` : ''}`),
    ...table.foreign_keys.map((f) => `FK ${f.columnsFrom.join(',')} → ${f.tableTo}(${f.columnsTo.join(',')}); ON DELETE ${f.onDelete}; ON UPDATE ${f.onUpdate}`),
    ...table.indexes.map((i) => `${i.isUnique ? 'UNIQUE' : 'INDEX'} ${i.name}(${i.columns.join(',')})`),
    ...table.checks.map((c) => `CHECK ${c.name}: ${c.value}`),
    ...(name === 'commands' ? ['result_id는 동작에 따라 다른 자원을 가리키는 결과 식별자이며 DB 외래키가 아니다. commands는 내보내기에서 제외한다.'] : []),
    ...(name === 'reviews' ? ['next_plan_id는 nullable이며 DB UNIQUE 제약이 없다. 서버는 회고 한 건당 다음 계획을 한 번 연결한다.'] : []),
    ...(name === 'plan_revisions' ? ['GET/내보내기에서는 plan_id AS id를 추가해 Revision 타입에 맞춘다. revision_id가 실제 이력 PK다.'] : []),
    ...(name === 'tasks' ? ['DB tags는 JSON 문자열, API tags는 string[]이다. deleted_at=NULL일 때 활성 상태다.'] : []),
  ],
}));
const model = {
  metadata: { ...metadata, sourceRevision: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), generatedAt: new Date().toISOString() },
  nodes: [...nodes, ...tableNodes], commands, views, contract, manifest,
};
const ids = new Set(model.nodes.map((n) => n.id));
if (ids.size !== model.nodes.length) throw new Error('Duplicate node ID');
for (const node of model.nodes) for (const path of node.files) if (!existsSync(resolve(root, path))) throw new Error(`Missing source: ${path}`);
for (const view of views) {
  const members = view.groups.flatMap((g) => g.ids);
  if (members.length !== new Set(members).size) throw new Error(`Duplicate view member: ${view.id}`);
  for (const id of members) if (!ids.has(id)) throw new Error(`Unknown node: ${id}`);
  for (const edge of view.edges) if (!members.includes(edge.from) || !members.includes(edge.to)) throw new Error(`Invalid edge: ${view.id} ${edge.from} → ${edge.to}`);
}
const expectedActions = [...readFileSync(resolve(root, 'src/server/store.ts'), 'utf8').matchAll(/case "([a-z.]+)"/g)].map((m) => m[1]).sort();
if (JSON.stringify(commands.map((c) => c.action).sort()) !== JSON.stringify(expectedActions)) throw new Error('Command coverage mismatch');
const covered = new Set(views.flatMap((v) => v.groups.flatMap((g) => g.ids)));
for (const node of model.nodes) if (!covered.has(node.id)) throw new Error(`Node not in any view: ${node.id}`);
const data = JSON.stringify(model).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const template = readFileSync(resolve(root, 'docs/architecture-diagram.template.html'), 'utf8');
if (template.split('/*__ARCHITECTURE_MODEL__*/').length !== 2) throw new Error('Expected one model placeholder');
const fragment = template.replace('/*__ARCHITECTURE_MODEL__*/', data);
const shell = `<!doctype html>\n<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>틈 · 과제6 구현 설계도</title>\n<style>
:root {color-scheme:light dark;--background:light-dark(#ffffff,#17191c);--foreground:light-dark(#24282d,#edeef0);--card:light-dark(#f7f8fa,#23262b);--card-foreground:var(--foreground);--primary:light-dark(#303943,#dce2e8);--primary-foreground:light-dark(#ffffff,#1b2026);--accent:light-dark(#edf1f6,#30363f);--accent-foreground:var(--foreground);--muted:var(--card);--muted-foreground:light-dark(#535d69,#b0bac7);--border:light-dark(#d4dbe2,#454d58);--ring:light-dark(#3773bd,#8ebcfa);--viz-series-1:light-dark(#2865a8,#8cbafa);--font-size-base:14px}
*{box-sizing:border-box}body{margin:0;padding:24px;color:var(--foreground);background:var(--background);font:14px/1.65 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}main{max-width:1050px;margin:auto}h2{font-size:20px;font-weight:500}h3{font-size:16px;font-weight:500}button,input,select{font:inherit}button{cursor:pointer}.btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--background);color:var(--foreground);font-weight:500;min-height:38px;white-space:normal}.btn[aria-pressed=true],.is-selected{background:var(--primary);color:var(--primary-foreground)}.btn:hover{background:var(--accent);color:var(--accent-foreground)}.btn:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--ring);outline-offset:3px}.viz-tile{width:100%;height:100%;background:var(--card)}.text-small{font-size:12px}.text-muted{color:var(--muted-foreground)}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.table{width:100%;border-collapse:collapse}.table th,.table td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border);vertical-align:top;overflow-wrap:anywhere}.table th{font-weight:500}.table-responsive{overflow-x:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:var(--viz-series-1)}@media(max-width:500px){body{padding:14px}}@media(pointer:coarse){.btn{min-height:44px}}
</style></head><body><main>\n${fragment}\n</main></body></html>\n`;
writeFileSync(resolve(root, 'docs/architecture-diagram.html'), shell);
const siteArg = process.argv.indexOf('--site-dir');
if (siteArg !== -1) {
  if (!process.argv[siteArg + 1]) throw new Error('--site-dir requires a path');
  const target = resolve(process.argv[siteArg + 1]);
  const hosting = JSON.parse(readFileSync(resolve(root, 'docs/architecture-hosting.json'), 'utf8'));
  if (!hosting.project_id || hosting.static?.directory !== 'dist') throw new Error('Invalid architecture hosting configuration');
  const targetManifest = resolve(target, '.openai/hosting.json');
  if (existsSync(targetManifest) && JSON.parse(readFileSync(targetManifest, 'utf8')).project_id !== hosting.project_id) throw new Error('Refusing to overwrite a different Site');
  mkdirSync(resolve(target, '.openai'), { recursive: true });
  mkdirSync(resolve(target, 'dist'), { recursive: true });
  writeFileSync(targetManifest, JSON.stringify(hosting, null, 2) + '\n');
  writeFileSync(resolve(target, 'dist/index.html'), shell);
  console.log(`Static Site prepared: ${target}`);
}
const fragmentArg = process.argv.indexOf('--fragment');
if (fragmentArg !== -1) {
  if (!process.argv[fragmentArg + 1]) throw new Error('--fragment requires a path');
  const target = resolve(process.argv[fragmentArg + 1]);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, fragment);
  console.log(`Inline fragment: ${target}`);
}
console.log(`Generated ${relative(root, resolve(root, 'docs/architecture-diagram.html'))}: ${model.nodes.length} nodes, ${views.reduce((n, v) => n + v.edges.length, 0)} view edges, ${commands.length} commands, ${tableNodes.length} tables, ${files.length} source paths.`);
