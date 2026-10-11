// bisiyata dishmaya, leharbot ahava biyisral
import { readFileSync } from 'node:fs';

// Updated by P9 when AI host permissions are added.
const ALLOWED_PERMISSIONS = ['storage', 'unlimitedStorage'];
const ALLOWED_HOST_PERMISSIONS = [];
const ALLOWED_OPTIONAL_HOST_PERMISSIONS = ['https://generativelanguage.googleapis.com/*'];

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
const sorted = (list = []) => [...list].sort().join(', ');

const problems = [];
if (sorted(manifest.permissions) !== sorted(ALLOWED_PERMISSIONS)) {
  problems.push(
    `permissions are [${sorted(manifest.permissions)}], allowed [${sorted(ALLOWED_PERMISSIONS)}]`,
  );
}
if (sorted(manifest.host_permissions) !== sorted(ALLOWED_HOST_PERMISSIONS)) {
  problems.push(`host_permissions are [${sorted(manifest.host_permissions)}], allowed none`);
}
if (manifest.optional_permissions?.length) {
  problems.push('optional permissions are not allowed');
}
if (sorted(manifest.optional_host_permissions) !== sorted(ALLOWED_OPTIONAL_HOST_PERMISSIONS)) {
  problems.push(
    `optional_host_permissions are [${sorted(manifest.optional_host_permissions)}], allowed [${sorted(ALLOWED_OPTIONAL_HOST_PERMISSIONS)}]`,
  );
}

if (problems.length) {
  console.error(`Manifest permission check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('Manifest permissions match the allowed list.');
