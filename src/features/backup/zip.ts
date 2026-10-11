// bisiyata dishmaya, leharbot ahava biyisral
import { Zip, ZipPassThrough } from 'fflate';
import type { BackupFile } from './backupFormat';

export interface ZipProgress {
  completedFiles: number;
  totalFiles: number;
  completedBytes: number;
  totalBytes: number;
}

export interface ZipEntrySource {
  path: string;
  size: number;
  load: () => Promise<Uint8Array>;
}

export function zipEntryFromBlob(entry: BackupFile): ZipEntrySource {
  return {
    path: entry.path,
    size: entry.blob.size,
    async load() {
      const buffer = await entry.blob.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}

export async function createStreamingZip(
  entries: readonly ZipEntrySource[],
  onProgress?: (progress: ZipProgress) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const names = new Set<string>();
  let totalBytes = 0;
  for (const entry of entries) {
    if (!entry.path || entry.path.startsWith('/') || entry.path.includes('..')) {
      throw new Error(`Invalid archive path: ${entry.path}`);
    }
    if (names.has(entry.path)) throw new Error(`Duplicate archive path: ${entry.path}`);
    names.add(entry.path);
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
      throw new Error(`Invalid size for archive path: ${entry.path}`);
    }
    totalBytes += entry.size;
  }

  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;
  let finished = false;
  let resolveZip!: (blob: Blob) => void;
  let rejectZip!: (error: Error) => void;
  const result = new Promise<Blob>((resolve, reject) => {
    resolveZip = resolve;
    rejectZip = reject;
  });
  const zip = new Zip((error, data, final) => {
    if (error) zipError = error;
    if (data) chunks.push(data);
    if (!final) return;
    finished = true;
    if (zipError) {
      rejectZip(zipError);
      return;
    }
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const buffer = new ArrayBuffer(length);
    const output = new Uint8Array(buffer);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    resolveZip(new Blob([buffer], { type: 'application/zip' }));
  });

  let completedBytes = 0;
  try {
    for (let index = 0; index < entries.length; index += 1) {
      if (signal?.aborted) throw new DOMException('The operation was cancelled.', 'AbortError');
      const entry = entries[index]!;
      const file = new ZipPassThrough(entry.path);
      zip.add(file);
      const bytes = await entry.load();
      if (bytes.byteLength !== entry.size) {
        throw new Error(`File size changed while adding ${entry.path}`);
      }
      file.push(bytes, true);
      completedBytes += entry.size;
      onProgress?.({
        completedFiles: index + 1,
        totalFiles: entries.length,
        completedBytes,
        totalBytes,
      });
    }
    zip.end();
  } catch (error) {
    zip.terminate();
    throw error;
  }
  const blob = await result;
  if (!finished) throw new Error('ZIP stream ended without completing.');
  return blob;
}

export function createZip(
  entries: readonly BackupFile[],
  onProgress?: (progress: ZipProgress) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  return createStreamingZip(entries.map(zipEntryFromBlob), onProgress, signal);
}
