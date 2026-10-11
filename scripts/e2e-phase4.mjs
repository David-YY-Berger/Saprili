// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const extensionPath = resolve(root, 'dist');
const userDataDir = await mkdtemp(join(tmpdir(), 'saprili-phase4-e2e-'));
const csv = [
  'Title,English,Hebrew',
  'intro,Meet our family,שלום',
  '---------, ,',
  'one,First story,א',
  'two,Second story,ב',
  '---------, ,',
].join('\n');
let context;

async function canvasImage(page, width, height, type) {
  return page.evaluate(
    ({ width, height, type }) => {
      const canvas = globalThis.document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.fillStyle = '#e85d3f';
      context.fillRect(0, 0, width, height);
      return canvas.toDataURL(type).split(',')[1];
    },
    { width, height, type },
  );
}

function withExifOrientation(jpeg, orientation) {
  const exif = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
    orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const app1 = Buffer.alloc(4);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), app1, exif, jpeg.subarray(2)]);
}

async function readBookAndImages(page, bookId) {
  return page.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open('saprili');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['books', 'images'], 'readonly');
      const bookRequest = transaction.objectStore('books').get(id);
      const imageRequest = transaction.objectStore('images').getAll();
      transaction.oncomplete = () => {
        const book = bookRequest.result;
        resolve({
          photos: book.storyPages[0].photos,
          textEn: book.storyPages[0].textEn,
          textHe: book.storyPages[0].textHe,
          images: imageRequest.result.map(({ kind, widthPx, heightPx }) => ({
            kind,
            widthPx,
            heightPx,
          })),
        });
        db.close();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, bookId);
}

async function waitForBookText(page, bookId, textEn, textHe) {
  await page.waitForFunction(
    async ({ id, english, hebrew }) => {
      const db = await new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open('saprili');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('books', 'readonly');
        const request = transaction.objectStore('books').get(id);
        request.onsuccess = () => {
          const book = request.result;
          const page = book?.storyPages[0];
          resolve(page?.textEn === english && page?.textHe === hebrew);
          db.close();
        };
        request.onerror = () => reject(request.error);
      });
    },
    { id: bookId, english: textEn, hebrew: textHe },
  );
}

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
  await page.getByRole('button', { name: 'Import book1 from CSV' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: 'Confirm book setup' }).waitFor();
  await page.getByRole('button', { name: 'Confirm book setup' }).click();
  await page.getByRole('heading', { name: 'book1' }).waitFor();

  const storyLink = page.locator('.story-row__link').first();
  const storyHref = await storyLink.getAttribute('href');
  assert.ok(storyHref);
  const bookId = new URL(storyHref, 'https://saprili.test').hash.split('/')[2];
  await storyLink.click();
  await page.getByLabel('English text').waitFor();

  const jpegBase64 = await canvasImage(page, 40, 20, 'image/jpeg');
  const jpeg = withExifOrientation(Buffer.from(jpegBase64, 'base64'), 6);
  await page.locator('.photo-drop-zone input[type="file"]').setInputFiles({
    name: 'rotated-phone.jpg',
    mimeType: 'image/jpeg',
    buffer: jpeg,
  });
  await page.getByRole('button', { name: 'Open picture 1' }).waitFor();
  const stored = await readBookAndImages(page, bookId);
  assert.equal(stored.photos.length, 1);
  assert.ok(
    stored.images.some(
      (image) => image.kind === 'original' && image.widthPx === 20 && image.heightPx === 40,
    ),
    'EXIF orientation should be applied before the original dimensions are stored',
  );

  const pngBase64 = await canvasImage(page, 32, 32, 'image/png');
  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const data = new globalThis.DataTransfer();
    data.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }));
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    globalThis.window.dispatchEvent(event);
  }, pngBase64);
  await page.getByRole('button', { name: 'Open picture 2' }).waitFor();
  const dropBase64 = await canvasImage(page, 48, 24, 'image/png');
  await page.evaluate((base64) => {
    const bytes = globalThis.Uint8Array.from(globalThis.atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const data = new globalThis.DataTransfer();
    data.items.add(new globalThis.File([bytes], 'dropped.png', { type: 'image/png' }));
    const target = globalThis.document.querySelector('.photo-drop-zone');
    if (!target) throw new Error('Photo drop zone is missing');
    target.dispatchEvent(
      new globalThis.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }),
    );
  }, dropBase64);
  await page.getByRole('button', { name: 'Open picture 3' }).waitFor();
  await page.getByRole('button', { name: 'Remove picture 2' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Open picture 3' }).waitFor();

  const trigger = page.getByRole('button', { name: 'Open picture 1' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Picture 1' });
  await dialog.waitFor();
  const naturalSize = await dialog.locator('img').evaluate((image) => [
    image.naturalWidth,
    image.naturalHeight,
  ]);
  assert.deepEqual(naturalSize, [20, 40]);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(
    await page.evaluate(() => globalThis.document.activeElement?.getAttribute('aria-label')),
    'Open picture 1',
  );

  await page.getByLabel('English text').fill('A saved English paragraph.');
  await page.getByLabel('Hebrew text').fill('פסקה בעברית.');
  await page.locator('.saved-indicator:not(.saved-indicator--saved)').waitFor();
  await page.locator('.saved-indicator--saved').waitFor();
  await waitForBookText(page, bookId, 'A saved English paragraph.', 'פסקה בעברית.');
  await page.reload();
  await page.getByLabel('English text').waitFor();
  const reloaded = await readBookAndImages(page, bookId);
  assert.equal(reloaded.textEn, 'A saved English paragraph.');
  assert.equal(reloaded.textHe, 'פסקה בעברית.');
  assert.equal(reloaded.photos.length, 3);
  assert.deepEqual(pageErrors, []);
  console.log('Phase 4 extension E2E passed.');
} finally {
  await context?.close();
  await rm(userDataDir, { recursive: true, force: true });
}
