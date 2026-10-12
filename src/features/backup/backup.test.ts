// bisiyata dishmaya, leharbot ahava biyisral
import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import type { Book } from '@/domain/book';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import type { ImageRecord } from '@/domain/image';
import { bookRepository, imageRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { putOp } from '@/storage/StorageProvider';
import { buildPageFilePlan, type BackupManifest } from './backupFormat';
import { formatDaysAgo } from './LastBackupBadge';
import { exportBookBackup } from './backupExport';
import { restoreBookBackup, validateBackup } from './backupRestore';
import { createZip } from './zip';

const NOW = '2026-10-11T10:00:00.000Z';
let activeStorage = createTestStorage();

function image(id: string, bookId: string, kind: ImageRecord['kind'], text: string): ImageRecord {
  const blob = new Blob([text], { type: 'image/png' });
  return {
    id,
    bookId,
    kind,
    blob,
    mime: 'image/png',
    widthPx: 20,
    heightPx: 30,
    byteSize: blob.size,
    createdAt: NOW,
    meta: { source: kind === 'original' ? 'uploaded' : 'generated' },
  };
}

async function createFixture() {
  const book = createEmptyBook({ id: 'backup-book', nowIso: NOW, title: 'Family story' });
  book.intro.textEn = 'Meet the family.';
  book.intro.textHe = 'שלום משפחה';
  book.intro.photos = [{ originalImageId: 'original', aiCopyImageId: 'ai-copy' }];
  const first = createStoryPage({ id: 'story-1', textEn: 'A day out', textHe: 'יום בחוץ' });
  first.illustration.currentImageId = 'illustration';
  first.illustration.history = [{ imageId: 'old-illustration', replacedAt: NOW }];
  first.colouring.imageId = 'colouring';
  first.colouring.sourceIllustrationImageId = 'illustration';
  first.photos = [{ originalImageId: 'story-original', aiCopyImageId: 'story-ai' }];
  const second = createStoryPage({ id: 'story-2' });
  book.storyPages = [first, second];
  book.cover.ownImageId = 'cover-own';
  book.cover.back.referenceImageId = 'cover-back-reference';
  book.cover.back.generatedImageId = 'cover-back-generated';
  book.cover.back.ownImageId = 'cover-back-own';
  book.cover.characterPortraits = [{ characterId: 'miriam', imageId: 'cover-character' }];
  book.colophon.qrImageId = 'qr';
  await bookRepository.createBook(book);
  const images = [
    image('original', book.id, 'original', 'photo bytes'),
    image('ai-copy', book.id, 'aiCopy', 'reduced photo bytes'),
    image('story-original', book.id, 'original', 'story photo'),
    image('story-ai', book.id, 'aiCopy', 'reduced story photo'),
    image('illustration', book.id, 'illustration', 'current art'),
    image('old-illustration', book.id, 'illustration', 'older art'),
    image('colouring', book.id, 'colouring', 'line art'),
    image('cover-own', book.id, 'coverUserImage', 'cover photo'),
    image('cover-back-reference', book.id, 'coverUserImage', 'back reference photo'),
    image('cover-back-generated', book.id, 'coverIllustration', 'back generated art'),
    image('cover-back-own', book.id, 'coverUserImage', 'back uploaded art'),
    image('cover-character', book.id, 'coverIllustration', 'AI character portrait'),
    image('qr', book.id, 'qr', 'qr data'),
  ];
  for (const record of images) await imageRepository.putImage(record);
  return { book, images };
}

async function asFile(blob: Blob): Promise<File> {
  return new File([await blob.arrayBuffer()], 'family.saprili.zip', { type: 'application/zip' });
}

beforeEach(() => {
  activeStorage = createTestStorage();
  setStorageForTests(activeStorage);
});
afterEach(() => setStorageForTests(null));

describe('book backup and restore', () => {
  it('round-trips a book and all image bytes through the ZIP archive', async () => {
    const { book, images } = await createFixture();
    const backup = await exportBookBackup(book.id);
    const expectedBook = await bookRepository.getBook(book.id);
    const archive = unzipSync(new Uint8Array(await backup.arrayBuffer()));
    expect(Object.keys(archive)).toContain('pages/00-intro/text-he.txt');
    expect(Object.keys(archive)).toContain('pages/01-story/illustration-history-1.png');
    expect(Object.keys(archive)).toContain('cover/character-1.png');
    expect(Object.keys(archive)).toContain('cover/back-reference.png');
    expect(Object.keys(archive)).toContain('cover/back-illustration.png');
    expect(Object.keys(archive)).toContain('cover/back-own-image.png');

    await bookRepository.deleteBook(book.id);
    const result = await restoreBookBackup(await asFile(backup));
    expect(result.status).toBe('restored');
    expect(await bookRepository.getBook(book.id)).toEqual(expectedBook);
    for (const original of images) {
      const restored = await imageRepository.getImage(original.id);
      expect(restored?.blob).toBeTruthy();
      expect(
        createHash('sha256').update(new Uint8Array(await restored!.blob.arrayBuffer())).digest('hex'),
      ).toBe(
        createHash('sha256').update(new Uint8Array(await original.blob.arrayBuffer())).digest('hex'),
      );
      expect(restored?.meta).toEqual(original.meta);
    }
  });

  it('reports a book-id conflict and restores as a separate copy when requested', async () => {
    const { book } = await createFixture();
    const backup = await exportBookBackup(book.id);
    const expectedBook = await bookRepository.getBook(book.id);
    const editedBook = { ...book, title: 'Edited title' };
    await bookRepository.save(editedBook, 'userEdit');
    const file = await asFile(backup);
    expect(await restoreBookBackup(file)).toEqual({
      status: 'conflict',
      bookId: book.id,
      title: editedBook.title,
    });

    const result = await restoreBookBackup(file, undefined, { resolution: 'copy' });
    expect(result.status).toBe('restored');
    if (result.status !== 'restored') return;
    expect(result.book.id).not.toBe(book.id);
    expect(result.book.title).toBe('Family story (restored copy)');
    expect(await bookRepository.getBook(book.id)).toMatchObject({ title: 'Edited title' });

    const replaced = await restoreBookBackup(file, undefined, { resolution: 'replace' });
    expect(replaced.status).toBe('restored');
    expect(await bookRepository.getBook(book.id)).toEqual(expectedBook);
    expect(await imageRepository.getImage('original')).toMatchObject({ bookId: book.id });
  });

  it('rejects corrupt archives and future schemas explicitly', async () => {
    await expect(restoreBookBackup(new File(['not a zip'], 'broken.zip'))).rejects.toMatchObject({
      code: 'BACKUP_INVALID',
    });

    expect(() =>
      validateBackup(
        {
          formatVersion: 1,
          appVersion: '9.0.0',
          schemaVersion: 999,
          createdAt: NOW,
          bookId: 'future-book',
          files: [],
        },
        { id: 'future-book', schemaVersion: 999 },
      ),
    ).toThrowError(expect.objectContaining({ code: 'BACKUP_TOO_NEW' }));
  });

  it('migrates an older supported book and image schema during restore', async () => {
    const { book } = await createFixture();
    const current = await exportBookBackup(book.id);
    const extracted = unzipSync(new Uint8Array(await current.arrayBuffer()));
    const archivedBook = JSON.parse(new TextDecoder().decode(extracted['book.json']!)) as Book;
    archivedBook.schemaVersion = 1;
    const manifest = JSON.parse(
      new TextDecoder().decode(extracted['manifest.json']!),
    ) as BackupManifest;
    manifest.schemaVersion = 1;
    const archivedBookBytes = new TextEncoder().encode(JSON.stringify(archivedBook));
    manifest.files.find((file) => file.path === 'book.json')!.size = archivedBookBytes.byteLength;
    const entries = Object.entries(extracted).map(([path, source]) => {
      let bytes = source;
      if (path === 'book.json') bytes = archivedBookBytes;
      if (path === 'manifest.json') bytes = new TextEncoder().encode(JSON.stringify(manifest));
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return { path, blob: new Blob([buffer]) };
    });
    const oldBackup = await createZip(entries);
    await bookRepository.deleteBook(book.id);

    const result = await restoreBookBackup(await asFile(oldBackup));
    expect(result.status).toBe('restored');
    expect((await bookRepository.getBook(book.id))?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('leaves the existing book and images intact when the atomic commit fails', async () => {
    const { book, images } = await createFixture();
    const backup = await exportBookBackup(book.id);
    const storage = activeStorage;
    const originalBook = await bookRepository.getBook(book.id);
    const originalApply = storage.apply.bind(storage);
    storage.apply = async (ops) => {
      if (ops.some((op) => op.type === 'put' && op.store === 'books')) {
        throw new Error('simulated commit failure');
      }
      await originalApply(ops);
    };

    await expect(
      restoreBookBackup(await asFile(backup), undefined, { resolution: 'replace' }),
    ).rejects.toThrow('simulated commit failure');
    expect(await bookRepository.getBook(book.id)).toEqual(originalBook);
    expect(await imageRepository.listImageIdsForBook(book.id)).toHaveLength(images.length);
    expect(await storage.getAll('images')).toHaveLength(images.length);
  });

  it('creates ZIP entries sequentially and reports completed file progress', async () => {
    const progress: number[] = [];
    const archive = await createZip(
      [
        { path: 'one.txt', blob: new Blob(['one']) },
        { path: 'two.txt', blob: new Blob(['two']) },
      ],
      (next) => progress.push(next.completedFiles),
    );
    expect(unzipSync(new Uint8Array(await archive.arrayBuffer()))['two.txt']).toBeTruthy();
    expect(progress).toEqual([1, 2]);
  });

  it('formats backup age and marks age in whole calendar-day durations', () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    expect(formatDaysAgo('2026-10-10T12:00:00.000Z', now)).toBe('Last backed up 1 day ago');
    expect(formatDaysAgo('2026-09-27T12:00:00.000Z', now)).toBe('Last backed up 14 days ago');
    expect(formatDaysAgo('invalid', now)).toBe('Backup date unavailable');
  });

  it('plans a page-only archive with its text, photos, art, and colouring page', async () => {
    const { book, images } = await createFixture();
    const files = buildPageFilePlan(book, 'story-1', images);
    expect(files.map((entry) => entry.path).sort()).toEqual([
      'page-01-story/colouring.png',
      'page-01-story/illustration-history-1.png',
      'page-01-story/illustration.png',
      'page-01-story/photo-1-ai-copy.png',
      'page-01-story/photo-1-original.png',
      'page-01-story/text-en.txt',
      'page-01-story/text-he.txt',
    ]);
    expect(await files.find((entry) => entry.path.endsWith('text-en.txt'))!.blob.text()).toBe(
      'A day out',
    );
  });

  it('exports a large 40-page book with three photos per page', async () => {
    const book = createEmptyBook({ id: 'large-book', nowIso: NOW, title: 'Large book' });
    const records: ImageRecord[] = [];
    book.storyPages = Array.from({ length: 40 }, (_, pageIndex) => {
      const page = createStoryPage({ id: `page-${pageIndex + 1}` });
      page.photos = Array.from({ length: 3 }, (_, photoIndex) => {
        const originalId = `original-${pageIndex + 1}-${photoIndex + 1}`;
        const aiCopyId = `ai-${pageIndex + 1}-${photoIndex + 1}`;
        records.push(image(originalId, book.id, 'original', 'x'.repeat(1024)));
        records.push(image(aiCopyId, book.id, 'aiCopy', 'y'.repeat(1024)));
        return { originalImageId: originalId, aiCopyImageId: aiCopyId };
      });
      return page;
    });
    await bookRepository.createBook(book);
    await activeStorage.apply(records.map((record) => putOp('images', record)));

    const backup = await exportBookBackup(book.id);
    const archive = unzipSync(new Uint8Array(await backup.arrayBuffer()));
    const imageEntries = JSON.parse(new TextDecoder().decode(archive['images.json']!)) as unknown[];
    expect(imageEntries).toHaveLength(240);
    expect(backup.size).toBeGreaterThan(240 * 1024);
    expect(backup.size).toBeLessThan(2 * 1024 * 1024);
  });
});
