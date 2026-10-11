// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { ImageRecord, ThumbPayload, ThumbRecord } from '@/domain/image';
import { listReferencedImageIds } from '@/domain/imageRefs';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import type { RepositoryDeps } from './deps';
import { migrateImageRecord } from './migrations';
import { deleteOp, putOp } from './StorageProvider';

export interface ImageRepository {
  /** Stores the image and its optional thumbnail in one transaction. */
  putImage(record: ImageRecord, thumb?: ThumbPayload): Promise<void>;
  /** Stores originals, AI copies, and original thumbnails atomically. */
  putPhotoBundles(
    bundles: readonly {
      original: ImageRecord;
      aiCopy: ImageRecord;
      thumbnail: ThumbPayload;
    }[],
  ): Promise<void>;
  getImage(id: string): Promise<ImageRecord | null>;
  getThumb(id: string): Promise<ThumbRecord | null>;
  deleteImage(id: string): Promise<void>;
  listImageIdsForBook(bookId: string): Promise<string[]>;
  deleteImagesForBook(bookId: string): Promise<void>;
  /** Deletes stored images the book no longer references; returns how many. */
  purgeOrphanImages(book: Book): Promise<number>;
}

export function createImageRepository({ storage }: RepositoryDeps): ImageRepository {
  return {
    async putImage(record, thumb) {
      await storage().apply([
        putOp('images', { ...record, schemaVersion: CURRENT_SCHEMA_VERSION }),
        ...(thumb
          ? [putOp('thumbs', { imageId: record.id, bookId: record.bookId, ...thumb })]
          : []),
      ]);
    },

    async putPhotoBundles(bundles) {
      const ops = bundles.flatMap(({ original, aiCopy, thumbnail }) => [
        putOp('images', { ...original, schemaVersion: CURRENT_SCHEMA_VERSION }),
        putOp('images', { ...aiCopy, schemaVersion: CURRENT_SCHEMA_VERSION }),
        putOp('thumbs', {
          imageId: original.id,
          bookId: original.bookId,
          ...thumbnail,
        }),
      ]);
      await storage().apply(ops);
    },

    async getImage(id) {
      const raw = await storage().get('images', id);
      return raw ? migrateImageRecord(raw) : null;
    },

    async getThumb(id) {
      return (await storage().get('thumbs', id)) ?? null;
    },

    async deleteImage(id) {
      await storage().apply([deleteOp('images', id), deleteOp('thumbs', id)]);
    },

    listImageIdsForBook(bookId) {
      return storage().getAllKeysByIndex('images', 'bookId', bookId);
    },

    async deleteImagesForBook(bookId) {
      const [imageIds, thumbIds] = await Promise.all([
        storage().getAllKeysByIndex('images', 'bookId', bookId),
        storage().getAllKeysByIndex('thumbs', 'bookId', bookId),
      ]);
      await storage().apply([
        ...imageIds.map((k) => deleteOp('images', k)),
        ...thumbIds.map((k) => deleteOp('thumbs', k)),
      ]);
    },

    async purgeOrphanImages(book) {
      const keep = listReferencedImageIds(book);
      const [imageIds, thumbIds] = await Promise.all([
        storage().getAllKeysByIndex('images', 'bookId', book.id),
        storage().getAllKeysByIndex('thumbs', 'bookId', book.id),
      ]);
      const orphanImages = imageIds.filter((id) => !keep.has(id));
      const orphanThumbs = thumbIds.filter((id) => !keep.has(id));
      await storage().apply([
        ...orphanImages.map((k) => deleteOp('images', k)),
        ...orphanThumbs.map((k) => deleteOp('thumbs', k)),
      ]);
      return orphanImages.length;
    },
  };
}
