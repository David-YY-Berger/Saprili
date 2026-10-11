// bisiyata dishmaya, leharbot ahava biyisral
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import type { Book } from '@/domain/book';
import { AppError } from '@/shared/errors';
import { systemClock } from '@/shared/clock';
import { bookRepository, imageRepository } from '@/storage/repositories';
import {
  BACKUP_FORMAT_VERSION,
  buildBackupFilePlan,
  type BackupImageSource,
  type BackupManifest,
} from './backupFormat';
import { createStreamingZip, type ZipEntrySource, type ZipProgress, zipEntryFromBlob } from './zip';

export type BackupProgress = ZipProgress;

function getAppVersion(): string {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.getManifest === 'function'
    ? chrome.runtime.getManifest().version
    : 'development';
}

export async function exportBookBackup(
  bookId: string,
  onProgress?: (progress: BackupProgress) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const book = await bookRepository.getBook(bookId);
  if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} does not exist` });

  const imageIds = await imageRepository.listImageIdsForBook(bookId);
  const imageRecords: BackupImageSource[] = [];
  for (const id of imageIds) {
    if (signal?.aborted) throw new DOMException('The operation was cancelled.', 'AbortError');
    const record = await imageRepository.getImage(id);
    if (!record) {
      throw new AppError('BACKUP_INVALID', {
        detail: `Image ${id} disappeared while exporting book ${bookId}`,
      });
    }
    const { id: imageId, kind, mime, widthPx, heightPx, byteSize, createdAt, meta } = record;
    imageRecords.push({ id: imageId, kind, mime, widthPx, heightPx, byteSize, createdAt, meta });
  }

  const backupAt = systemClock.nowIso();
  const backedUpBook: Book = { ...book, lastBackupAt: backupAt };
  const plan = buildBackupFilePlan(backedUpBook, imageRecords);
  const metadataFiles = [
    ...plan.files,
    { path: 'book.json', blob: new Blob([JSON.stringify(backedUpBook, null, 2)], { type: 'application/json' }) },
    { path: 'images.json', blob: new Blob([JSON.stringify(plan.images, null, 2)], { type: 'application/json' }) },
  ];
  const listedFiles = [
    ...metadataFiles.map(({ path, blob }) => ({ path, size: blob.size })),
    ...plan.images.map(({ path, byteSize }) => ({ path, size: byteSize })),
  ];
  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: getAppVersion(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: backupAt,
    bookId: book.id,
    files: listedFiles,
  };
  const entries: ZipEntrySource[] = [
    zipEntryFromBlob({
      path: 'manifest.json',
      blob: new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
    }),
    ...metadataFiles.map(zipEntryFromBlob),
    ...plan.images.map((metadata) => ({
      path: metadata.path,
      size: metadata.byteSize,
      async load() {
        const record = await imageRepository.getImage(metadata.id);
        if (!record || record.bookId !== bookId) {
          throw new AppError('BACKUP_INVALID', {
            detail: `Image ${metadata.id} disappeared while exporting book ${bookId}`,
          });
        }
        if (record.byteSize !== metadata.byteSize || record.blob.size !== metadata.byteSize) {
          throw new AppError('BACKUP_INVALID', {
            detail: `Image ${metadata.id} changed while the backup was being created`,
          });
        }
        return new Uint8Array(await record.blob.arrayBuffer());
      },
    })),
  ];

  const archive = await createStreamingZip(entries, onProgress, signal);
  const latestBook = await bookRepository.getBook(bookId);
  if (!latestBook) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} was deleted` });
  await bookRepository.save(
    { ...latestBook, lastBackupAt: backedUpBook.lastBackupAt },
    'system',
  );
  return archive;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
