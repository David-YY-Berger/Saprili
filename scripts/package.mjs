// bisiyata dishmaya, leharbot ahava biyisral
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = resolve(root, 'dist');
const outputArg = process.argv.indexOf('--out');
const outputPath =
  outputArg >= 0 ? resolve(process.argv[outputArg + 1] ?? '') : resolve(root, 'saprili-0.1.0.zip');
const manifestPath = resolve(dist, 'manifest.json');
if (!statSync(dist, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error('The production build is missing. Run npm run build before packaging.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (typeof manifest.version !== 'string' || !manifest.version) {
  throw new Error('dist/manifest.json has no extension version.');
}
const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing to package symbolic link ${absolutePath}`);
    if (entry.isDirectory()) {
      collect(absolutePath);
      continue;
    }
    if (!entry.isFile() || absolutePath.endsWith('.map')) continue;
    files.push(absolutePath);
  }
}
collect(dist);

const archiveEntries = Object.fromEntries(
  files
    .sort()
    .map((absolutePath) => [
      relative(dist, absolutePath).split(sep).join('/'),
      new Uint8Array(readFileSync(absolutePath)),
    ]),
);
const output = outputArg >= 0 ? outputPath : resolve(root, `saprili-${manifest.version}.zip`);
if (basename(output).toLowerCase() !== `saprili-${manifest.version}.zip`) {
  throw new Error(`Package filename must be saprili-${manifest.version}.zip`);
}
writeFileSync(output, zipSync(archiveEntries, { level: 9 }));
console.log(`Packaged ${files.length} extension files: ${output}`);
