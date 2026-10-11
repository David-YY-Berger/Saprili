// bisiyata dishmaya, leharbot ahava biyisral
// Starts a batch in the background job host, closes the tab, and checks that it still finishes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const workDir = await mkdtemp(join(tmpdir(), 'saprili-phase10-e2e-'));
const extensionPath = join(workDir, 'extension');
const userDataDir = join(workDir, 'profile');
const csv = [
  'Title,English,Hebrew',
  'intro,Meet our family,שלום',
  '---------, ,',
  'one,First story,א',
  'two,Second story,ב',
  'three,Third story,ג',
  'four,Fourth story,ד',
  '---------, ,',
].join('\n');

// A mock-provider build with simulated latency, kept out of dist/.
const build = spawnSync(
  process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', extensionPath],
  {
    cwd: root,
    env: { ...process.env, SAPRILI_PROVIDER: 'mock', SAPRILI_MOCK_DELAY_MS: '1500' },
    stdio: 'inherit',
  },
);
assert.equal(build.status, 0, 'mock build failed');

async function readState(page, bookId) {
  return page.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open('saprili');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['books', 'images', 'batches', 'jobs'], 'readonly');
      const book = transaction.objectStore('books').get(id);
      const images = transaction.objectStore('images').getAll();
      const batches = transaction.objectStore('batches').getAll();
      const jobs = transaction.objectStore('jobs').getAll();
      transaction.oncomplete = () => {
        db.close();
        resolve({
          illustratedPages: book.result.storyPages.filter((p) => p.illustration.currentImageId)
            .length,
          coverIllustrated: book.result.cover.illustration.currentImageId !== null,
          illustrationImages: images.result.filter(
            (image) => image.kind === 'illustration' || image.kind === 'coverIllustration',
          ).length,
          batchStates: batches.result.map((batch) => batch.state),
          jobStatuses: jobs.result.map((job) => job.status),
        });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, bookId);
}

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
    context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  const extensionId = new URL(worker.url()).host;
  const appUrl = `chrome-extension://${extensionId}/app.html`;

  const page = await context.newPage();
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Import book1 from CSV' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: 'Confirm book setup' }).click();
  await page.getByRole('heading', { name: 'book1' }).waitFor();
  const href = await page.locator('.story-row__link').first().getAttribute('href');
  assert.ok(href);
  const bookId = new URL(href, 'https://saprili.test').hash.split('/')[2];

  await page.goto(`${appUrl}#/settings`);
  await page.getByLabel('Gemini API key').fill('test-key');
  await page.locator('.saved-indicator--saved').waitFor();

  await page.goto(`${appUrl}#/book/${bookId}`);
  await page.getByRole('heading', { name: 'book1' }).waitFor();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByText('5 illustrations, 0 colouring pages, 5 AI calls').waitFor();
  await page.getByRole('button', { name: 'Start generating' }).click();
  await page.getByText(/Generating in the background/).waitFor();

  // The tab goes away while the batch is still running.
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(appUrl);
  let state = await readState(reopened, bookId);
  assert.ok(state.illustratedPages < 4 || !state.coverIllustrated, 'batch should still be running');

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    state = await readState(reopened, bookId);
    if (state.batchStates.length > 0 && state.batchStates.every((s) => s === 'completed')) break;
    await reopened.waitForTimeout(500);
  }
  assert.deepEqual(state.batchStates, ['completed'], 'batch did not finish with the tab closed');
  assert.equal(state.illustratedPages, 4);
  assert.equal(state.coverIllustrated, true);
  assert.equal(state.illustrationImages, 5, 'no job may run twice');
  assert.ok(state.jobStatuses.every((status) => status === 'succeeded'));
  console.log('Phase 10 e2e passed: batch finished with the tab closed.');
} finally {
  await context?.close();
  await rm(workDir, { recursive: true, force: true });
}
