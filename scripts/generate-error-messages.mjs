// bisiyata dishmaya, leharbot ahava biyisral
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = `${root}/src/i18n/en.ts`;
const outputPath = `${root}/docs/error-messages.md`;
const source = readFileSync(sourcePath, 'utf8');
const parsed = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let catalogue;

function findCatalogue(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'en') {
    catalogue = node.initializer;
  }
  ts.forEachChild(node, findCatalogue);
}

findCatalogue(parsed);
while (catalogue && (ts.isAsExpression(catalogue) || ts.isSatisfiesExpression(catalogue))) {
  catalogue = catalogue.expression;
}
if (!catalogue || !ts.isObjectLiteralExpression(catalogue)) {
  throw new Error('Could not find the en catalogue object in src/i18n/en.ts');
}

const entries = new Map();
for (const property of catalogue.properties) {
  if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)) continue;
  const key = property.name.text;
  const match = /^errors\.([A-Z_]+)\.(message|next)$/.exec(key);
  if (!match) continue;
  const value = property.initializer;
  if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) {
    throw new Error(`${key} must be a plain string for the error review`);
  }
  const [, code, field] = match;
  const row = entries.get(code) ?? {};
  row[field] = value.text;
  entries.set(code, row);
}

const escapeCell = (value) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  '# User-facing error messages',
  '',
  'Generated from [`src/i18n/en.ts`](../src/i18n/en.ts) by `node scripts/generate-error-messages.mjs`. Review that each message is plain-language and each next step is useful.',
  '',
  '| Code | Message | Next step |',
  '|---|---|---|',
];
for (const [code, row] of entries) {
  if (!row.message || !row.next) throw new Error(`${code} is missing a message or next step`);
  lines.push(`| \`${code}\` | ${escapeCell(row.message)} | ${escapeCell(row.next)} |`);
}
if (entries.size === 0) throw new Error('No error messages found in the English catalogue');
writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${entries.size} reviewed error-message entries to docs/error-messages.md`);
