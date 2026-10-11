// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';
import { bookRepository, imageRepository } from '@/storage/repositories';
import { formatHebrewDate } from '@/shared/hebrewDate';
import { downloadBlob } from './backupExport';
import { buildPageFilePlan, imageIdsForPage } from './backupFormat';
import { createZip, type ZipProgress } from './zip';

function safeFilePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'book';
}

export async function downloadPageFiles(
  bookId: string,
  pageId: string,
  onProgress?: (progress: ZipProgress) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const book = await bookRepository.getBook(bookId);
  if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} does not exist` });
  const ids = imageIdsForPage(book, pageId);
  const images = [];
  for (const id of ids) {
    if (signal?.aborted) throw new DOMException('The operation was cancelled.', 'AbortError');
    const image = await imageRepository.getImage(id);
    if (!image) throw new AppError('STORAGE_FAILED', { detail: `Image ${id} is missing` });
    images.push(image);
  }
  const files = buildPageFilePlan(book, pageId, images);
  if (pageId === 'colophon') {
    files.push({
      path: 'page-colophon/text-he.txt',
      blob: new Blob(
        [
          `${book.colophon.createdByTextHe}\n${book.colophon.place}\n${formatHebrewDate(
            new Date(book.colophon.dateIso),
          )}`,
        ],
        { type: 'text/plain' },
      ),
    });
  }
  const pageIndex = book.storyPages.findIndex((page) => page.id === pageId);
  const pageLabel =
    pageId === book.intro.id ? 'intro' : pageId === 'colophon' ? 'colophon' : `page-${pageIndex + 1}`;
  const blob = await createZip(files, onProgress, signal);
  downloadBlob(blob, `saprili-${safeFilePart(book.title)}-${pageLabel}.zip`);
  return blob;
}
