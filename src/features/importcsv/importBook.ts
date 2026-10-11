// bisiyata dishmaya, leharbot ahava biyisral
import { bookRepository } from '@/storage/repositories';
import { systemClock } from '@/shared/clock';
import { buildBookFromCsv, parseBookCsv, validateParsedCsv } from './csvParser';
import type { CsvValidationResult } from './csvErrors';

export async function importBookFromCsv(file: File): Promise<CsvValidationResult | null> {
  const existingBooks = await bookRepository.listBookSummaries();
  if (existingBooks.length > 0) {
    window.location.hash = '#/';
    return null;
  }
  const parsed = parseBookCsv(await file.arrayBuffer());
  const validation = validateParsedCsv(parsed);
  if (!validation.valid) return validation;

  const book = buildBookFromCsv(parsed, systemClock.nowIso());
  await bookRepository.createBook(book);
  window.location.hash = `#/book/${encodeURIComponent(book.id)}/setup`;
  return null;
}
