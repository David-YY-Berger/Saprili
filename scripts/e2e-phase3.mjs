// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const extensionPath = resolve(root, 'dist');
const userDataDir = await mkdtemp(join(tmpdir(), 'saprili-phase3-e2e-'));
const csv = [
  'Title,English,Hebrew',
  'intro,Meet our family,שלום',
  '---------, ,',
  'one,First story,א',
  'two,Second story,ב',
  '---------, ,',
].join('\n');
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
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/app.html`);
  await page.getByRole('button', { name: 'Import book1 from CSV' }).waitFor();
  await page.getByRole('button', { name: 'Import book1 from CSV' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('heading', { name: 'Set up your book' }).waitFor();
  assert.ok(
    await page
      .getByText(
        "This can't be changed later, because your illustrations are drawn to fit this exact shape.",
      )
      .isVisible(),
  );
  await page.getByRole('button', { name: 'Confirm book setup' }).click();
  await page.getByRole('heading', { name: 'book1' }).waitFor();

  await page.getByRole('button', { name: 'Move one down' }).click();
  await page.locator('.story-row__link').nth(0).getByText('two').waitFor();
  await page.getByRole('button', { name: 'Add pages' }).click();
  await page.getByLabel('Where should they go?').selectOption('0');
  await page.getByRole('button', { name: 'Add pairs' }).click();
  await page.locator('.pair-group').nth(1).waitFor();

  await page.getByRole('button', { name: 'Delete pages' }).click();
  await page.getByLabel('Pair 2: two + one').check();
  await page.getByRole('button', { name: 'Delete selected pairs' }).click();
  await page.getByRole('button', { name: 'Undo' }).waitFor();
  assert.equal(await page.locator('.pair-group').count(), 1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.locator('.pair-group').nth(1).waitFor();
  assert.deepEqual(pageErrors, []);
  console.log('Phase 3 extension E2E passed.');
} finally {
  await context?.close();
  await rm(userDataDir, { recursive: true, force: true });
}
