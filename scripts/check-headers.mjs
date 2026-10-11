// bisiyata dishmaya, leharbot ahava biyisral
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const HEADER = 'bisiyata dishmaya, leharbot ahava biyisral';
const EXPECTED = {
  '.ts': `// ${HEADER}`,
  '.tsx': `// ${HEADER}`,
  '.mjs': `// ${HEADER}`,
  '.css': `/* ${HEADER} */`,
  '.html': `<!-- ${HEADER} -->`,
};
const SCAN_DIRS = ['src', 'scripts', 'tests'];
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.git']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

function* candidates() {
  for (const name of readdirSync('.')) {
    if (statSync(name).isFile()) yield name; // root configs and html
  }
  for (const dir of SCAN_DIRS) {
    try {
      yield* walk(dir);
    } catch {
      // folder does not exist yet
    }
  }
}

const failures = [];
for (const file of candidates()) {
  const expected = EXPECTED[extname(file)];
  if (!expected) continue;
  const firstLine = readFileSync(file, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/, 1)[0];
  if (firstLine !== expected) failures.push(file);
}

if (failures.length) {
  console.error(`Missing or wrong header comment on line 1:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('All source files have the header comment.');
