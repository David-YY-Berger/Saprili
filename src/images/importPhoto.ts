// bisiyata dishmaya, leharbot ahava biyisral
import {
  AI_COPY_LONG_EDGE_PX,
  ORIGINAL_LONG_EDGE_PX,
} from '@/domain/constants';
import type { ImageRecord } from '@/domain/image';
import type { PhotoRef } from '@/domain/page';
import { newId } from '@/shared/ids';
import { createThumbnail } from '@/storage/thumbnails';
import { imageRepository } from '@/storage/repositories';
import { decodeImageFile, makeAiCopy, makeOriginal } from './imageOps';

export class PhotoImportService {
  async importFiles(bookId: string, files: readonly File[]): Promise<PhotoRef[]> {
    const bundles: {
      original: ImageRecord;
      aiCopy: ImageRecord;
      thumbnail: Awaited<ReturnType<typeof createThumbnail>>;
    }[] = [];
    const refs: PhotoRef[] = [];

    for (const file of files) {
      const bitmap = await decodeImageFile(file);
      try {
        const [original, aiCopy] = await Promise.all([
          makeOriginal(bitmap, file.type, ORIGINAL_LONG_EDGE_PX),
          makeAiCopy(bitmap, AI_COPY_LONG_EDGE_PX),
        ]);
        const originalId = newId();
        const aiCopyId = newId();
        const createdAt = new Date().toISOString();
        const originalRecord: ImageRecord = {
          id: originalId,
          bookId,
          kind: 'original',
          blob: original.blob,
          mime: original.mime,
          widthPx: original.widthPx,
          heightPx: original.heightPx,
          byteSize: original.blob.size,
          createdAt,
          meta: { source: 'uploaded' },
        };
        const aiCopyRecord: ImageRecord = {
          id: aiCopyId,
          bookId,
          kind: 'aiCopy',
          blob: aiCopy.blob,
          mime: aiCopy.mime,
          widthPx: aiCopy.widthPx,
          heightPx: aiCopy.heightPx,
          byteSize: aiCopy.blob.size,
          createdAt,
          meta: { source: 'uploaded' },
        };
        bundles.push({
          original: originalRecord,
          aiCopy: aiCopyRecord,
          thumbnail: await createThumbnail(original.blob),
        });
        refs.push({ originalImageId: originalId, aiCopyImageId: aiCopyId });
      } finally {
        bitmap.close();
      }
    }

    if (bundles.length > 0) await imageRepository.putPhotoBundles(bundles);
    return refs;
  }
}

export const photoImportService = new PhotoImportService();
