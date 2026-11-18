// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { findMentionedCharacterIds } from '@/domain/characters';
import { AppError } from '@/shared/errors';
import { bookRepository } from '@/storage/repositories';
import { buildStoryPagesFromCsv, parseBookCsv, validateParsedCsv } from './csvParser';
import type { CsvValidationResult } from './csvErrors';

/** True while no story page has been written, photographed or illustrated. */
export function isStoryBodyUntouched(book: Book): boolean {
  return book.storyPages.every(
    (page) =>
      page.privateTitle.trim() === '' &&
      page.textEn.trim() === '' &&
      page.textHe.trim() === '' &&
      page.photos.length === 0 &&
      page.illustration.currentImageId === null &&
      page.illustration.history.length === 0 &&
      page.colouring.imageId === null,
  );
}

/** Replaces the (still empty) story pages with the CSV rows. Returns issues, or null once saved. */
export async function importStoryPagesFromCsv(
  bookId: string,
  file: File,
): Promise<CsvValidationResult | null> {
  const book = await bookRepository.getBook(bookId);
  if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} does not exist` });
  if (!isStoryBodyUntouched(book)) {
    throw new AppError('STORAGE_FAILED', {
      userMessage: 'This book already has story pages with content.',
      nextStep: 'CSV import is only available before you start the story pages.',
    });
  }
  const parsed = parseBookCsv(await file.arrayBuffer());
  const validation = validateParsedCsv(parsed);
  if (!validation.valid) return validation;

  const storyPages = buildStoryPagesFromCsv(parsed).map((page) => ({
    ...page,
    characterIds: findMentionedCharacterIds(book.characters, page.textEn),
  }));
  await bookRepository.save({ ...book, storyPages }, 'userEdit');
  window.location.hash = `#/book/${encodeURIComponent(bookId)}`;
  return null;
}
