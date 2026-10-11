// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, test } from 'playwright/test';
import { inspectPdf } from '../../scripts/pdf-inspect.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('prints an exact-size, multi-page interior PDF', async () => {
  const extensionPath = resolve(root, 'dist');
  const userDataDir = await mkdtemp(join(tmpdir(), 'saprili-print-e2e-'));
  const csv = [
    'Title,English,Hebrew',
    'intro,Meet our family,שלום',
    '---------, ,',
    'one,First story,א',
    'two,Second story,ב',
  ].join('\n');
  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;

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
    const app = await context.newPage();
    const pageErrors: string[] = [];
    app.on('pageerror', (error) => pageErrors.push(error.message));
    await app.goto(`chrome-extension://${extensionId}/app.html`);
    await app.getByRole('button', { name: 'Import book1 from CSV' }).click();
    await app.locator('input[type="file"]').setInputFiles({
      name: 'print-sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await app.getByRole('button', { name: 'Confirm book setup' }).waitFor();
    await app.getByRole('button', { name: 'Confirm book setup' }).click();
    await app.getByRole('heading', { name: 'book1' }).waitFor();

    await app.getByRole('button', { name: 'Print book' }).click();
    await app.getByRole('button', { name: 'Continue to print' }).waitFor();
    const printPagePromise = context.waitForEvent('page');
    await app.getByRole('button', { name: 'Continue to print' }).click();
    const printPage = await printPagePromise;
    await printPage.waitForURL(/print\.html\?job=/);
    await printPage.locator('.print-sheet').nth(3).waitFor();
    await printPage.evaluate(() => document.fonts.ready);
    assert.equal(await printPage.locator('.print-sheet').count(), 4);

    const client = await context.newCDPSession(printPage);
    const { data } = await client.send('Page.printToPDF', {
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      printBackground: true,
    });
    const result = await inspectPdf(Buffer.from(data, 'base64'), {
      pageCount: 4,
      widthMm: 228,
      heightMm: 313,
      toleranceMm: 0.1,
    });
    assert.equal(result.hasEmbeddedFont, true);
    await client.detach();
    await printPage.close();

    await app.getByRole('button', { name: 'Print colouring book' }).click();
    await app.getByRole('button', { name: 'Continue to print' }).waitFor();
    const colouringPagePromise = context.waitForEvent('page');
    await app.getByRole('button', { name: 'Continue to print' }).click();
    const colouringPage = await colouringPagePromise;
    colouringPage.on('pageerror', (error) => pageErrors.push(error.message));
    await colouringPage.waitForURL(/print\.html\?job=/);
    await colouringPage.locator('.print-sheet').nth(3).waitFor();
    assert.equal(await colouringPage.locator('.print-sheet').count(), 4);
    assert.equal(await colouringPage.locator('.print-sheet [data-edition="colouring"]').count(), 4);
    await colouringPage.close();

    await app.locator('.story-row__link').first().click();
    await app.getByRole('button', { name: 'Print page' }).click();
    await app.getByRole('button', { name: 'Continue to print' }).waitFor();
    const pagePrintPromise = context.waitForEvent('page');
    await app.getByRole('button', { name: 'Continue to print' }).click();
    const pagePrint = await pagePrintPromise;
    pagePrint.on('pageerror', (error) => pageErrors.push(error.message));
    await pagePrint.waitForURL(/print\.html\?job=/);
    await pagePrint.locator('.print-sheet').waitFor();
    assert.equal(await pagePrint.locator('.print-sheet').count(), 1);
    assert.equal(await pagePrint.locator('.print-sheet[data-page-kind="story"]').count(), 1);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context?.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
