// bisiyata dishmaya, leharbot ahava biyisral
import { unzipSync } from 'fflate';
import type { Book } from '@/domain/book';
import type { ImageRecord } from '@/domain/image';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import { listReferencedImageIds, remapImageIds } from '@/domain/imageRefs';
import { validateBook } from '@/domain/validators';
import { AppError } from '@/shared/errors';
import { systemClock } from '@/shared/clock';
import { newId } from '@/shared/ids';
import { bookRepository, getStorage, imageRepository } from '@/storage/repositories';
import { migrateBookRecord, migrateImageRecord } from '@/storage/migrations';
import { deleteOp, putOp, type StoreOp } from '@/storage/StorageProvider';
import {
  BACKUP_FORMAT_VERSION,
  type BackupImageEntry,
  type BackupManifest,
} from './backupFormat';

export interface RestoreProgress {
  completedFiles: number;
  totalFiles: number;
}

export type RestoreResolution = 'copy' | 'replace';

export type RestoreResult =
  | { status: 'conflict'; bookId: string; title: string }
  | { status: 'restored'; book: Book; resolution: RestoreResolution };

interface ParsedBackup {
  manifest: BackupManifest;
  book: Book;
  images: { metadata: BackupImageEntry; bytes: Uint8Array }[];
}

function invalid(detail: string, cause?: unknown): AppError {
  return new AppError('BACKUP_INVALID', { detail, cause });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(bytes: Uint8Array, path: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch (error) {
    throw invalid(`${path} is not valid JSON`, error);
  }
}

export function validateBackup(manifestValue: unknown, bookValue: unknown): asserts manifestValue is BackupManifest {
  if (!isRecord(manifestValue) || !isRecord(bookValue)) {
    throw invalid('manifest.json or book.json is not an object');
  }
  const manifest = manifestValue;
  const book = bookValue;
  if (
    !Number.isInteger(manifest.formatVersion) ||
    typeof manifest.appVersion !== 'string' ||
    typeof manifest.createdAt !== 'string' ||
    typeof manifest.bookId !== 'string' ||
    !Number.isInteger(manifest.schemaVersion) ||
    !Array.isArray(manifest.files)
  ) {
    throw invalid('manifest.json is missing required fields');
  }
  if ((manifest.formatVersion as number) > BACKUP_FORMAT_VERSION) {
    throw new AppError('BACKUP_TOO_NEW', { detail: 'backup format is newer than this app' });
  }
  if ((manifest.formatVersion as number) !== BACKUP_FORMAT_VERSION) {
    throw invalid(`Unsupported backup format ${String(manifest.formatVersion)}`);
  }
  if ((manifest.schemaVersion as number) > CURRENT_SCHEMA_VERSION) {
    throw new AppError('BACKUP_TOO_NEW', {
      detail: `backup schema ${String(manifest.schemaVersion)} is newer than ${CURRENT_SCHEMA_VERSION}`,
    });
  }
  if (
    typeof book.id !== 'string' ||
    book.id !== manifest.bookId ||
    !Number.isInteger(book.schemaVersion) ||
    (book.schemaVersion as number) > CURRENT_SCHEMA_VERSION
  ) {
    if (Number.isInteger(book.schemaVersion) && (book.schemaVersion as number) > CURRENT_SCHEMA_VERSION) {
      throw new AppError('BACKUP_TOO_NEW', { detail: 'book schema is newer than this app' });
    }
    throw invalid('book.json does not match the backup manifest');
  }
  for (const file of manifest.files) {
    if (
      !isRecord(file) ||
      typeof file.path !== 'string' ||
      file.path.length === 0 ||
      file.path.startsWith('/') ||
      file.path.includes('..') ||
      !Number.isSafeInteger(file.size) ||
      (file.size as number) < 0
    ) {
      throw invalid('manifest.json contains an invalid file entry');
    }
  }
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('The operation was cancelled.', 'AbortError');
}

function validateImageEntry(value: unknown): value is BackupImageEntry {
  if (!isRecord(value) || !isRecord(value.meta)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.path === 'string' &&
    !value.path.startsWith('/') &&
    !value.path.includes('..') &&
    ['original', 'aiCopy', 'illustration', 'colouring', 'coverIllustration', 'coverUserImage', 'qr'].includes(
      String(value.kind),
    ) &&
    typeof value.mime === 'string' &&
    Number.isSafeInteger(value.widthPx) &&
    (value.widthPx as number) > 0 &&
    Number.isSafeInteger(value.heightPx) &&
    (value.heightPx as number) > 0 &&
    Number.isSafeInteger(value.byteSize) &&
    (value.byteSize as number) >= 0 &&
    typeof value.createdAt === 'string' &&
    (value.meta.source === 'uploaded' || value.meta.source === 'generated')
  );
}

async function parseBackup(file: File, signal?: AbortSignal): Promise<ParsedBackup> {
  checkAbort(signal);
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    throw invalid('The selected file could not be read as a ZIP archive', error);
  }
  checkAbort(signal);

  const manifestBytes = archive['manifest.json'];
  const bookBytes = archive['book.json'];
  const imageMapBytes = archive['images.json'];
  if (!manifestBytes || !bookBytes || !imageMapBytes) {
    throw invalid('The archive is missing manifest.json, book.json, or images.json');
  }
  const manifestValue = parseJson(manifestBytes, 'manifest.json');
  const rawBook = parseJson(bookBytes, 'book.json');
  validateBackup(manifestValue, rawBook);
  const manifest = manifestValue;
  const files = new Map<string, number>();
  for (const entry of manifest.files) {
    if (files.has(entry.path) || entry.path === 'manifest.json') {
      throw invalid(`Duplicate or reserved file path: ${entry.path}`);
    }
    files.set(entry.path, entry.size);
  }
  if (files.size !== Object.keys(archive).length - 1) {
    throw invalid('The archive contains files not listed in manifest.json');
  }
  for (const [path, size] of files) {
    const bytes = archive[path];
    if (!bytes || bytes.byteLength !== size) throw invalid(`File size does not match for ${path}`);
  }
  for (const path of Object.keys(archive)) {
    if (path !== 'manifest.json' && !files.has(path)) {
      throw invalid(`The archive contains an unlisted file: ${path}`);
    }
  }

  if (
    !isRecord(rawBook) ||
    !Array.isArray(rawBook.storyPages) ||
    !isRecord(rawBook.intro) ||
    !isRecord(rawBook.cover)
  ) {
    throw invalid('book.json is missing required book sections');
  }
  let book: Book;
  try {
    book = migrateBookRecord(rawBook);
    const problems = validateBook(book);
    if (problems.length) throw invalid(`book.json failed validation: ${problems[0]!.message}`);
  } catch (error) {
    if (error instanceof AppError && error.code === 'BACKUP_TOO_NEW') throw error;
    if (error instanceof AppError && error.code === 'BACKUP_INVALID') throw error;
    throw invalid('book.json could not be migrated or validated', error);
  }

  const rawImages = parseJson(imageMapBytes, 'images.json');
  if (!Array.isArray(rawImages)) throw invalid('images.json must be a list');
  const imageEntries: BackupImageEntry[] = [];
  const imageIds = new Set<string>();
  const imagePaths = new Set<string>();
  for (const value of rawImages) {
    if (!validateImageEntry(value)) throw invalid('images.json contains an invalid image record');
    if (imageIds.has(value.id) || imagePaths.has(value.path)) {
      throw invalid('images.json contains duplicate image ids or paths');
    }
    if (!files.has(value.path)) throw invalid(`Image file is missing from the manifest: ${value.path}`);
    imageIds.add(value.id);
    imagePaths.add(value.path);
    imageEntries.push(value);
  }
  for (const id of listReferencedImageIds(book)) {
    if (!imageIds.has(id)) throw invalid(`Book refers to missing image ${id}`);
  }

  const images = imageEntries.map((metadata) => {
    const bytes = archive[metadata.path]!;
    if (bytes.byteLength !== metadata.byteSize) {
      throw invalid(`Image size does not match for ${metadata.path}`);
    }
    return { metadata, bytes };
  });
  return { manifest, book, images };
}

export interface RestoreOptions {
  resolution?: RestoreResolution;
  signal?: AbortSignal;
}

async function removeStagedImages(bookId: string): Promise<void> {
  await imageRepository.deleteImagesForBook(bookId);
}

export async function restoreBookBackup(
  file: File,
  onProgress?: (progress: RestoreProgress) => void,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const parsed = await parseBackup(file, options.signal);
  const existing = await bookRepository.getBook(parsed.book.id);
  if (existing && !options.resolution) {
    return { status: 'conflict', bookId: existing.id, title: existing.title };
  }
  const resolution = options.resolution ?? 'replace';
  const now = systemClock.nowIso();
  const targetBookId = existing && resolution === 'copy' ? newId() : parsed.book.id;
  if (targetBookId !== parsed.book.id && (await bookRepository.getBook(targetBookId))) {
    throw new AppError('STORAGE_FAILED', { detail: `Generated book id ${targetBookId} already exists` });
  }
  const stageBookId = newId();
  const imageIdMap = new Map<string, string>();
  const stagedImages: { originalId: string; record: ImageRecord }[] = [];
  const stagedIds: string[] = [];
  const storage = getStorage();
  try {
    for (let index = 0; index < parsed.images.length; index += 1) {
      checkAbort(options.signal);
      const { metadata, bytes } = parsed.images[index]!;
      const existingImage = await storage.get('images', metadata.id);
      const finalId =
        (existing && resolution === 'copy') ||
        (existingImage && isRecord(existingImage) && existingImage.bookId !== targetBookId)
          ? newId()
          : metadata.id;
      imageIdMap.set(metadata.id, finalId);
      const stageId = newId();
      const imageBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(imageBuffer).set(bytes);
      const raw: unknown = {
        ...metadata,
        id: stageId,
        bookId: stageBookId,
        blob: new Blob([imageBuffer], { type: metadata.mime }),
        byteSize: bytes.byteLength,
        schemaVersion: parsed.manifest.schemaVersion,
      };
      const image = migrateImageRecord(raw);
      stagedImages.push({ originalId: metadata.id, record: image });
      await storage.apply([putOp('images', image)]);
      stagedIds.push(stageId);
      onProgress?.({ completedFiles: index + 1, totalFiles: parsed.images.length });
    }
    const remapped = remapImageIds(parsed.book, imageIdMap);
    const restoredBook: Book = {
      ...remapped,
      id: targetBookId,
      title:
        existing && resolution === 'copy' ? `${parsed.book.title} (restored copy)` : parsed.book.title,
      ...(existing && resolution === 'copy'
        ? { createdAt: now, modifiedAt: now, lastBackupAt: null }
        : {}),
    };
    const ops: StoreOp[] = [];
    if (existing && resolution === 'replace') {
      const [oldImageIds, oldThumbIds, oldJobIds, oldBatchIds] = await Promise.all([
        storage.getAllKeysByIndex('images', 'bookId', targetBookId),
        storage.getAllKeysByIndex('thumbs', 'bookId', targetBookId),
        storage.getAllKeysByIndex('jobs', 'bookId', targetBookId),
        storage.getAllKeysByIndex('batches', 'bookId', targetBookId),
      ]);
      ops.push(
        ...oldImageIds.map((id) => deleteOp('images', id)),
        ...oldThumbIds.map((id) => deleteOp('thumbs', id)),
        ...oldJobIds.map((id) => deleteOp('jobs', id)),
        ...oldBatchIds.map((id) => deleteOp('batches', id)),
      );
    }
    const finalImages = stagedImages.map(({ originalId, record }) => ({
      ...record,
      id: imageIdMap.get(originalId)!,
      bookId: targetBookId,
    }));
    ops.push(
      putOp('books', restoredBook),
      ...finalImages.map((image) => putOp('images', image)),
      ...stagedIds.map((id) => deleteOp('images', id)),
    );
    checkAbort(options.signal);
    await storage.apply(ops);
    onProgress?.({ completedFiles: parsed.images.length, totalFiles: parsed.images.length });
    return { status: 'restored', book: restoredBook, resolution };
  } catch (error) {
    try {
      await removeStagedImages(stageBookId);
    } catch (cleanupError) {
      throw new AppError('STORAGE_FAILED', {
        detail: `Restore failed and temporary image data for ${stageBookId} could not be removed`,
        cause: cleanupError,
      });
    }
    throw error;
  }
}
