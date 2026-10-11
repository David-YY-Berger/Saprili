// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { findPage, getPageRefsInReadingOrder } from '@/domain/ordering';
import type { PageRef } from '@/domain/page';
import type { PageGeometry } from './geometry';
import {
  buildTextZone,
  chooseFontStep,
  computeSizeStepThresholds,
  fitTextInZone,
  getTextLength,
  type PageTexts,
  type TextFitResult,
  type TextMeasurer,
} from './textFit';

export interface PageTextLayout {
  texts: PageTexts;
  fit: TextFitResult;
}

/** Text and its fitted size for an intro or story page; null for the colophon or unknown pages. */
export function computePageTextLayout(
  book: Book,
  pageRef: PageRef,
  geometry: PageGeometry,
  measurer: TextMeasurer,
): PageTextLayout | null {
  const page = findPage(book, pageRef);
  if (!page || !('textEn' in page)) return null;
  const texts: PageTexts = { textHe: page.textHe, textEn: page.textEn };
  const zone = buildTextZone(book.typography, geometry.textRect);
  const start = chooseFontStep(getTextLength(texts), computeSizeStepThresholds(book));
  const fit = fitTextInZone(texts, zone, book.typography.sizeStepsPt, measurer, start);
  return { texts, fit };
}

/** Position in the printed interior, starting at 1 for the intro. */
export function getPageNumber(book: Book, pageRef: PageRef): number {
  const index = getPageRefsInReadingOrder(book).findIndex(
    (ref) => ref.kind === pageRef.kind && ref.id === pageRef.id,
  );
  return index + 1;
}
