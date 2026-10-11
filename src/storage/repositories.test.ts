// bisiyata dishmaya, leharbot ahava biyisral
import { beforeEach, describe, expect, it } from 'vitest';
import type { ImageRecord } from '@/domain/image';
import { createEmptyBook } from '@/domain/factories';
import { fixedClock } from '@/shared/clock';
import { createBookRepository, type BookRepository } from './bookRepository';
import { createImageRepository, type ImageRepository } from './imageRepository';
import { createJobRepository } from './jobRepository';
import { createMetaRepository } from './metaRepository';
import { InMemorySettingsRepository } from './settingsStore';
import { createTestStorage } from './testing';
import { fitLongEdge } from './thumbnails';
import { putOp } from './StorageProvider';
import { AppError } from '@/shared/errors';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';

function image(id: string, bookId: string): ImageRecord {
  return {
    id,
    bookId,
    kind: 'original',
    blob: new Blob([id]),
    mime: 'image/png',
    widthPx: 10,
    heightPx: 10,
    byteSize: id.length,
    createdAt: T0,
    meta: { source: 'uploaded' },
  };
}

const thumb = (id: string) => ({ blob: new Blob([`t${id}`]), widthPx: 2, heightPx: 2 });

describe('repositories', () => {
  let storage: ReturnType<typeof createTestStorage>;
  let clock: ReturnType<typeof fixedClock>;
  let books: BookRepository;
  let images: ImageRepository;

  beforeEach(() => {
    storage = createTestStorage();
    clock = fixedClock(T1);
    const deps = { storage: () => storage, clock };
    books = createBookRepository(deps);
    images = createImageRepository(deps);
  });

  it('create, get, list', async () => {
    const book = createEmptyBook({ id: 'b1', nowIso: T0 });
    await books.createBook(book);
    expect(await books.getBook('b1')).toEqual(book);
    expect(await books.getBook('nope')).toBeNull();
    expect(await books.listBookSummaries()).toEqual([
      { id: 'b1', title: 'book1', pageCount: 2, modifiedAt: T0, thumbImageId: null },
    ]);
    await expect(books.createBook(book)).rejects.toBeInstanceOf(AppError);
  });

  it('save bumps modifiedAt only for userEdit and generation', async () => {
    await books.createBook(createEmptyBook({ id: 'b1', nowIso: T0 }));
    const book = (await books.getBook('b1'))!;

    expect((await books.save(book, 'system')).modifiedAt).toBe(T0);
    expect((await books.getBook('b1'))!.modifiedAt).toBe(T0);
    expect((await books.save(book, 'userEdit')).modifiedAt).toBe(T1);
    clock.set('2026-03-01T00:00:00.000Z');
    expect((await books.save(book, 'generation')).modifiedAt).toBe('2026-03-01T00:00:00.000Z');
    await expect(
      books.save(createEmptyBook({ id: 'ghost', nowIso: T0 }), 'userEdit'),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('stores and reads images with thumbnails; purges orphans', async () => {
    const book = createEmptyBook({ id: 'b1', nowIso: T0 });
    book.intro.photos = [{ originalImageId: 'keep', aiCopyImageId: 'keepAi' }];
    await books.createBook(book);
    await images.putImage(image('keep', 'b1'), thumb('keep'));
    await images.putImage(image('keepAi', 'b1'));
    await images.putImage(image('orphan', 'b1'), thumb('orphan'));

    expect((await images.getImage('keep'))!.byteSize).toBe(4);
    expect((await images.getThumb('keep'))!.widthPx).toBe(2);
    expect(await images.getImage('missing')).toBeNull();
    expect((await images.listImageIdsForBook('b1')).sort()).toEqual(['keep', 'keepAi', 'orphan']);

    expect(await images.purgeOrphanImages(book)).toBe(1);
    expect(await images.getImage('orphan')).toBeNull();
    expect(await images.getThumb('orphan')).toBeNull();
    expect(await images.getImage('keep')).not.toBeNull();

    await images.deleteImage('keep');
    expect(await images.getThumb('keep')).toBeNull();
    await images.deleteImagesForBook('b1');
    expect(await images.listImageIdsForBook('b1')).toEqual([]);
  });

  it('deleteBook removes images, thumbs, jobs and batches', async () => {
    const jobs = createJobRepository({ storage: () => storage, clock });
    await books.createBook(createEmptyBook({ id: 'b1', nowIso: T0 }));
    await books.createBook(createEmptyBook({ id: 'b2', nowIso: T0 }));
    await images.putImage(image('i1', 'b1'), thumb('i1'));
    await images.putImage(image('i2', 'b2'), thumb('i2'));
    await jobs.putBatch({
      id: 'batch',
      bookId: 'b1',
      jobIds: ['j'],
      createdAt: T0,
      state: 'running',
    });
    await jobs.putJob({
      id: 'j',
      batchId: 'batch',
      bookId: 'b1',
      kind: 'illustration',
      target: { kind: 'cover' },
      overwrite: false,
      dependsOnJobId: null,
      status: 'queued',
      step: 'pending',
      attempts: 0,
      createdAt: T0,
      updatedAt: T0,
    });

    await books.deleteBook('b1');
    expect(await books.getBook('b1')).toBeNull();
    expect(await images.getImage('i1')).toBeNull();
    expect(await images.getThumb('i1')).toBeNull();
    expect(await jobs.getJob('j')).toBeNull();
    expect(await jobs.getBatch('batch')).toBeNull();
    expect(await images.getImage('i2')).not.toBeNull();
    expect(await books.getBook('b2')).not.toBeNull();
  });

  it('duplicateBook copies the book with fresh image ids', async () => {
    const book = createEmptyBook({ id: 'b1', nowIso: T0 });
    book.intro.photos = [{ originalImageId: 'o', aiCopyImageId: 'a' }];
    await books.createBook(book);
    await images.putImage(image('o', 'b1'), thumb('o'));
    await images.putImage(image('a', 'b1'));
    await images.putImage(image('stray', 'b1'));

    const copy = await books.duplicateBook('b1');
    expect(copy.id).not.toBe('b1');
    expect(copy.title).toBe('book1 (copy)');
    expect(copy.modifiedAt).toBe(T1);
    const photo = copy.intro.photos[0]!;
    expect(photo.originalImageId).not.toBe('o');
    expect((await images.getImage(photo.originalImageId))!.bookId).toBe(copy.id);
    expect(await images.getThumb(photo.originalImageId)).not.toBeNull();
    expect(await images.listImageIdsForBook(copy.id)).toHaveLength(2);
    expect(await images.listImageIdsForBook('b1')).toHaveLength(3);
  });

  it('apply is atomic', async () => {
    const bad = { id: undefined } as never; // missing key path makes the put throw
    await expect(
      storage.apply([putOp('books', { id: 'ok' }), putOp('books', bad)]),
    ).rejects.toBeInstanceOf(AppError);
    expect(await storage.get('books', 'ok')).toBeUndefined();
  });

  it('meta store', async () => {
    const meta = createMetaRepository({ storage: () => storage, clock });
    await meta.set('printJob:1', { a: 1 });
    expect(await meta.get('printJob:1')).toEqual({ a: 1 });
    await meta.delete('printJob:1');
    expect(await meta.get('printJob:1')).toBeUndefined();
  });

  it('lists only open batches', async () => {
    const jobs = createJobRepository({ storage: () => storage, clock });
    const base = { bookId: 'b', jobIds: [], createdAt: T0 };
    await jobs.putBatch({ ...base, id: 'r', state: 'running' });
    await jobs.putBatch({ ...base, id: 'p', state: 'paused' });
    await jobs.putBatch({ ...base, id: 'c', state: 'completed' });
    expect((await jobs.listOpenBatches()).map((b) => b.id).sort()).toEqual(['p', 'r']);
  });
});

describe('settings store double', () => {
  it('returns defaults, then what was saved', async () => {
    const repo = new InMemorySettingsRepository();
    expect((await repo.getUserSettings()).apiKey).toBeNull();
    await repo.saveUserSettings({
      schemaVersion: 2,
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
      apiKey: 'k',
    });
    expect(await repo.getUserSettings()).toMatchObject({
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
      apiKey: 'k',
    });
  });
});

describe('fitLongEdge', () => {
  it('scales down by long edge and never upscales', () => {
    expect(fitLongEdge(2000, 1000, 256)).toEqual({ widthPx: 256, heightPx: 128 });
    expect(fitLongEdge(1000, 2000, 256)).toEqual({ widthPx: 128, heightPx: 256 });
    expect(fitLongEdge(100, 50, 256)).toEqual({ widthPx: 100, heightPx: 50 });
  });
});
