// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, BookSummary } from '@/domain/book';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import { listReferencedImageIds, remapImageIds } from '@/domain/imageRefs';
import { getInteriorPageCount } from '@/domain/ordering';
import { AppError } from '@/shared/errors';
import { newId } from '@/shared/ids';
import type { RepositoryDeps } from './deps';
import { migrateBookRecord, migrateImageRecord } from './migrations';
import { deleteOp, putOp, type StoreOp } from './StorageProvider';

/** Only `userEdit` and `generation` change the modification date. */
export type SaveReason = 'userEdit' | 'generation' | 'system';

export interface BookRepository {
  listBookSummaries(): Promise<BookSummary[]>;
  getBook(id: string): Promise<Book | null>;
  createBook(book: Book): Promise<void>;
  save(book: Book, reason: SaveReason): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  duplicateBook(id: string): Promise<Book>;
}

export function summarizeBook(book: Book): BookSummary {
  const coverThumbId =
    book.cover.ownImageId ??
    (book.cover.artworkMode === 'characterPortraits'
      ? book.cover.characterPortraits[0]?.imageId
      : book.cover.artworkMode === 'introCollage'
        ? book.intro.photos[0]?.originalImageId
        : book.cover.illustration.currentImageId);
  return {
    id: book.id,
    title: book.title,
    pageCount: getInteriorPageCount(book),
    modifiedAt: book.modifiedAt,
    thumbImageId: coverThumbId ?? book.intro.photos[0]?.originalImageId ?? null,
  };
}

export function createBookRepository({ storage, clock }: RepositoryDeps): BookRepository {
  const read = async (id: string): Promise<Book | null> => {
    const raw = await storage().get('books', id);
    return raw ? migrateBookRecord(raw) : null;
  };

  return {
    async listBookSummaries() {
      const raws = await storage().getAll('books');
      return raws.map((raw) => summarizeBook(migrateBookRecord(raw)));
    },

    getBook: read,

    async createBook(book) {
      if (await storage().get('books', book.id)) {
        throw new AppError('STORAGE_FAILED', { detail: `Book ${book.id} already exists` });
      }
      await storage().apply([putOp('books', { ...book, schemaVersion: CURRENT_SCHEMA_VERSION })]);
    },

    async save(book, reason) {
      if (!(await storage().get('books', book.id))) {
        throw new AppError('STORAGE_FAILED', { detail: `Book ${book.id} does not exist` });
      }
      const touchesDate = reason === 'userEdit' || reason === 'generation';
      const saved: Book = {
        ...book,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        modifiedAt: touchesDate ? clock.nowIso() : book.modifiedAt,
      };
      await storage().apply([putOp('books', saved)]);
      return saved;
    },

    async deleteBook(id) {
      const s = storage();
      const [imageIds, thumbIds, jobIds, batchIds] = await Promise.all([
        s.getAllKeysByIndex('images', 'bookId', id),
        s.getAllKeysByIndex('thumbs', 'bookId', id),
        s.getAllKeysByIndex('jobs', 'bookId', id),
        s.getAllKeysByIndex('batches', 'bookId', id),
      ]);
      await s.apply([
        deleteOp('books', id),
        ...imageIds.map((k) => deleteOp('images', k)),
        ...thumbIds.map((k) => deleteOp('thumbs', k)),
        ...jobIds.map((k) => deleteOp('jobs', k)),
        ...batchIds.map((k) => deleteOp('batches', k)),
      ]);
    },

    async duplicateBook(id) {
      const s = storage();
      const source = await read(id);
      if (!source) throw new AppError('STORAGE_FAILED', { detail: `Book ${id} does not exist` });

      const referenced = listReferencedImageIds(source);
      const [rawImages, thumbs] = await Promise.all([
        s.getAllByIndex('images', 'bookId', id),
        s.getAllByIndex('thumbs', 'bookId', id),
      ]);

      const newBookId = newId();
      const idMap = new Map<string, string>();
      const ops: StoreOp[] = [];
      for (const raw of rawImages) {
        const image = migrateImageRecord(raw);
        if (!referenced.has(image.id)) continue;
        idMap.set(image.id, newId());
        ops.push(putOp('images', { ...image, id: idMap.get(image.id)!, bookId: newBookId }));
      }
      for (const thumb of thumbs) {
        const mapped = idMap.get(thumb.imageId);
        if (mapped) ops.push(putOp('thumbs', { ...thumb, imageId: mapped, bookId: newBookId }));
      }

      const now = clock.nowIso();
      const copy: Book = {
        ...remapImageIds(source, idMap),
        id: newBookId,
        title: `${source.title} (copy)`,
        createdAt: now,
        modifiedAt: now,
        lastBackupAt: null,
      };
      await s.apply([putOp('books', copy), ...ops]);
      return copy;
    },
  };
}
