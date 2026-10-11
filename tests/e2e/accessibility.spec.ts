// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { chromium, expect, test } from 'playwright/test';

const root = fileURLToPath(new URL('../..', import.meta.url));

interface FixtureBook {
  id: string;
  createdAt: string;
  schemaVersion: number;
  intro: { photos: { originalImageId: string; aiCopyImageId: string }[] };
  storyPages: { illustration: { currentImageId: string | null } }[];
}

test('runs axe on the app routes and print view and follows a page link by keyboard', async () => {
  test.setTimeout(180_000);
  const dist = resolve(root, 'dist');
  const server = createServer(async (request, response) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const path = resolve(dist, `.${pathname}`);
    const relativePath = relative(dist, path);
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..') {
      response.writeHead(403).end();
      return;
    }
    try {
      const content = await readFile(path);
      const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
      const contentType =
        extension === '.html'
          ? 'text/html'
          : extension === '.js'
            ? 'text/javascript'
            : extension === '.css'
              ? 'text/css'
              : extension === '.svg'
                ? 'image/svg+xml'
                : extension === '.png'
                  ? 'image/png'
                  : 'application/octet-stream';
      response.writeHead(200, { 'content-type': contentType }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind a port');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const assetDir = resolve(root, 'docs/store-assets');
  await mkdir(assetDir, { recursive: true });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>> | undefined;

  try {
    browser = await chromium.launch({
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
      headless: true,
    });
    context = await browser.newContext();
    await context.addInitScript((origin) => {
      const settings = new Map<string, unknown>();
      const listeners = new Set<(message: unknown) => void>();
      Object.defineProperty(globalThis, 'chrome', {
        value: {
          runtime: {
            id: 'saprili-accessibility-test',
            getManifest: () => ({ version: '0.1.0' }),
            getURL: (path: string) => `${origin}/${path}`,
            sendMessage: async (message: { type?: string }) =>
              message.type === 'jobs/getSnapshot'
                ? { ok: true, snapshot: { batches: [] } }
                : { ok: true, batchId: 'test-batch' },
            onMessage: {
              addListener: (listener: (message: unknown) => void) => listeners.add(listener),
              removeListener: (listener: (message: unknown) => void) => listeners.delete(listener),
            },
          },
          storage: {
            local: {
              get: async (key: string) => ({ [key]: settings.get(key) }),
              set: async (entries: Record<string, unknown>) => {
                for (const [key, value] of Object.entries(entries)) settings.set(key, value);
              },
            },
          },
        },
        configurable: true,
      });
    }, baseUrl);
    const app = await context.newPage();
    await app.setViewportSize({ width: 1280, height: 800 });
    await app.goto(`${baseUrl}/app.html#/`);
    await app.addScriptTag({ content: axe.source });

    const checkAxe = async (page: typeof app, route: string) => {
      const result = await page.evaluate(async () => {
        const axeRunner = (
          window as Window & {
            axe?: {
              run: (context: Element) => Promise<{
                violations: Array<{
                  id: string;
                  impact: string | null;
                  help: string;
                  nodes: Array<{ target: unknown[]; failureSummary: string }>;
                }>;
              }>;
            };
          }
        ).axe;
        if (!axeRunner) throw new Error('axe-core did not load in the page');
        const report = await axeRunner.run(document.body);
        return report.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        }));
      });
      assert.deepEqual(
        result,
        [],
        `axe violations on ${route}`,
      );
    };

    await app.getByRole('heading', { name: 'A little library, just for your family' }).waitFor();
    await checkAxe(app, 'Library');
    await app.goto(`${baseUrl}/app.html#/settings`);
    await app.getByRole('heading', { name: 'My settings' }).waitFor();
    await checkAxe(app, 'My settings');
    await app.goto(`${baseUrl}/app.html#/import`);
    await app.getByRole('heading', { name: 'Bring in your story' }).waitFor();
    await checkAxe(app, 'CSV import');
    await app.locator('input[type="file"]').setInputFiles({
      name: 'accessibility-sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        ['Title,English,Hebrew', 'intro,Meet our family,שלום', 'one,First story,א', 'two,Second story,ב'].join(
          '\n',
        ),
      ),
    });
    await app.getByRole('button', { name: 'Confirm book setup' }).waitFor();
    await checkAxe(app, 'Book setup');
    await app.getByRole('button', { name: 'Confirm book setup' }).click();
    await app.getByRole('heading', { name: 'book1' }).waitFor();
    const bookId = new URL(app.url()).hash.match(/^#\/book\/([^/]+)/)?.[1];
    expect(bookId).toBeTruthy();
    const fixtureSvg = await readFile(resolve(root, 'tests/fixtures/storybook-garden.svg'), 'utf8');
    await app.evaluate(
      async ({ id, svg }) => {
        const database = await new Promise<IDBDatabase>((resolveDb, rejectDb) => {
          const request = indexedDB.open('saprili');
          request.onsuccess = () => resolveDb(request.result);
          request.onerror = () => rejectDb(request.error);
        });
        try {
          const transaction = database.transaction(['books', 'images'], 'readwrite');
          const books = transaction.objectStore('books');
          const loadedBook = await new Promise<unknown>((resolveBook, rejectBook) => {
            const request = books.get(id);
            request.onsuccess = () => resolveBook(request.result as unknown);
            request.onerror = () => rejectBook(request.error);
          });
          if (typeof loadedBook !== 'object' || loadedBook === null) {
            throw new Error('Fixture book was not found.');
          }
          const book = loadedBook as FixtureBook;
          if (
            !Array.isArray(book.storyPages) ||
            !book.storyPages[0] ||
            !book.intro ||
            !Array.isArray(book.intro.photos)
          ) {
            throw new Error('Fixture book is missing its story pages.');
          }
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          const imageData = [
            { id: `fixture-original-${id}`, kind: 'original', source: 'uploaded' },
            { id: `fixture-ai-${id}`, kind: 'aiCopy', source: 'uploaded' },
            { id: `fixture-illustration-${id}`, kind: 'illustration', source: 'generated' },
          ] as const;
          book.intro.photos = [
            {
              originalImageId: imageData[0].id,
              aiCopyImageId: imageData[1].id,
            },
          ];
          book.storyPages[0].illustration.currentImageId = imageData[2].id;
          books.put(book);
          const images = transaction.objectStore('images');
          for (const image of imageData) {
            images.put({
              id: image.id,
              bookId: id,
              kind: image.kind,
              blob,
              mime: blob.type,
              widthPx: 600,
              heightPx: 400,
              byteSize: blob.size,
              createdAt: book.createdAt,
              meta: { source: image.source },
              schemaVersion: book.schemaVersion,
            });
          }
          await new Promise<void>((resolveTransaction, rejectTransaction) => {
            transaction.oncomplete = () => resolveTransaction();
            transaction.onerror = () => rejectTransaction(transaction.error);
            transaction.onabort = () => rejectTransaction(transaction.error);
          });
        } finally {
          database.close();
        }
      },
      { id: decodeURIComponent(bookId!), svg: fixtureSvg },
    );
    await app.goto(`${baseUrl}/app.html#/book/${bookId}/settings`);
    await app.getByRole('heading', { name: 'Book settings' }).waitFor();
    await app.goto(`${baseUrl}/app.html#/book/${bookId}`);
    await app.getByRole('heading', { name: 'book1' }).waitFor();
    await checkAxe(app, 'Book view');
    await app.mouse.move(0, 0);
    await app.screenshot({ path: resolve(assetDir, 'book-outline.png') });

    await app.goto(`${baseUrl}/app.html#/book/${bookId}/settings`);
    await app.getByRole('heading', { name: 'Book settings' }).waitFor();
    await checkAxe(app, 'Book settings');
    await app.goto(`${baseUrl}/app.html#/book/${bookId}/cover`);
    await app.getByRole('heading', { name: 'Cover', exact: true }).waitFor();
    await checkAxe(app, 'Cover editor');
    await app.goto(`${baseUrl}/app.html#/book/${bookId}/colophon`);
    await app.getByRole('heading', { name: 'Colophon' }).waitFor();
    await checkAxe(app, 'Colophon editor');
    await app.goto(`${baseUrl}/app.html#/book/${bookId}`);
    await app.getByRole('heading', { name: 'book1' }).waitFor();
    const storyLink = app.locator('.story-row__link').first();
    let storyLinkReached = false;
    for (let count = 0; count < 30 && !storyLinkReached; count += 1) {
      await app.keyboard.press('Tab');
      storyLinkReached = await storyLink.evaluate((element) => element === document.activeElement);
    }
    expect(storyLinkReached).toBe(true);
    await app.keyboard.press('Enter');
    await app.getByLabel('Page actions').waitFor();
    await checkAxe(app, 'Page editor (keyboard navigation)');
    await app.getByRole('textbox', { name: 'English text' }).scrollIntoViewIfNeeded();
    await app.evaluate(() => window.scrollBy(0, -85));
    await app.mouse.move(0, 0);
    await app.screenshot({ path: resolve(assetDir, 'page-editor.png') });
    const englishField = app.getByRole('textbox', { name: 'English text' });
    let englishFieldReached = false;
    for (let count = 0; count < 30 && !englishFieldReached; count += 1) {
      await app.keyboard.press('Tab');
      englishFieldReached = await englishField.evaluate(
        (element) => element === document.activeElement,
      );
    }
    expect(englishFieldReached).toBe(true);

    await app.goto(`${baseUrl}/app.html#/book/${bookId}`);
    await app.getByRole('button', { name: 'Print book' }).click();
    await checkAxe(app, 'Print pre-flight dialog');
    const printPagePromise = context.waitForEvent('page');
    await app.getByRole('button', { name: 'Continue to print' }).click();
    const printPage = await printPagePromise;
    await printPage.waitForURL(/print\.html\?job=/);
    await printPage.locator('.print-sheet').first().waitFor();
    await printPage.addScriptTag({ content: axe.source });
    await checkAxe(printPage, 'Print view');
    await printPage.screenshot({ path: resolve(assetDir, 'print-preview.png') });
    await printPage.close();

    const promo = await context.newPage();
    await promo.setViewportSize({ width: 440, height: 280 });
    const promoSvg = await readFile(resolve(assetDir, 'promo-tile.svg'), 'utf8');
    await promo.setContent(`<style>html,body{margin:0;width:440px;height:280px}</style>${promoSvg}`);
    await promo.screenshot({ path: resolve(assetDir, 'promo-tile.png') });
    await promo.close();
  } finally {
    await context?.close();
    await browser?.close();
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
  }
});
