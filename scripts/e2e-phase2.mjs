// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const extensionPath = resolve(root, 'dist');

const userDataDir = await mkdtemp(join(tmpdir(), 'saprili-phase2-e2e-'));
let context;
try {
  context = await chromium.launchPersistentContext(userDataDir, {
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
    ],
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
  });

  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/app.html`);
  await page.getByRole('heading', { name: 'Your library' }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Import book1 from CSV' }).isVisible());

  await page.getByRole('button', { name: 'My settings' }).click();
  const keyField = page.locator('#api-key');
  await keyField.waitFor();
  assert.equal(await keyField.getAttribute('type'), 'password');

  const testKey = 'phase-two-persistence-test-key';
  await keyField.fill(testKey);
  await page.waitForFunction(
    () =>
      globalThis.document
        .querySelector('.saved-indicator')
        ?.textContent?.replace('✓', '')
        .trim() === 'Saved',
    undefined,
    { timeout: 10000 },
  );
  assert.equal(new URL(page.url()).search, '');

  await page.reload();
  await page.locator('#api-key').waitFor();
  assert.equal(await page.locator('#api-key').getAttribute('type'), 'password');
  assert.ok(
    (await page.locator('#api-key').inputValue()) === testKey,
    'Settings did not persist after reload',
  );
  console.log('Phase 2 extension E2E passed.');
} finally {
  await context?.close();
  await rm(userDataDir, { recursive: true, force: true });
}
