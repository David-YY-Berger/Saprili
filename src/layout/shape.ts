// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, BookShape } from '@/domain/book';
import { COVER_PANEL_WIDTH_MM, COVER_HEIGHT_MM, COVER_SAFE_INSET_MM } from '@/domain/constants';
import { systemClock, type Clock } from '@/shared/clock';
import {
  computeDefaultPictureAspect,
  computePageGeometry,
  getEffectivePictureAspect,
} from './geometry';
import { computeTextZoneHeightMm, getDefaultMeasurer, type TextMeasurer } from './textFit';
import { BORDER_BAND_MM } from './specs';

export { computePictureRect } from './geometry';

export interface PictureZoneSpec {
  widthMm: number;
  heightMm: number;
  /** Width divided by height. */
  aspect: number;
}

export interface ShapeComputation {
  shape: BookShape;
  /** True when the longest text did not fit the maximum text zone. */
  textZoneCapped: boolean;
}

export function computeBookShape(
  book: Book,
  measurer: TextMeasurer = getDefaultMeasurer(),
  clock: Clock = systemClock,
): ShapeComputation {
  const zone = computeTextZoneHeightMm(book, measurer);
  return {
    shape: {
      textZoneHeightMm: zone.heightMm,
      pictureAspect: computeDefaultPictureAspect(book, zone.heightMm),
      computedAt: clock.nowIso(),
    },
    textZoneCapped: zone.capped,
  };
}

/**
 * Sets the book's shape once. A book that already has a shape is returned as is
 * (same object), so the shape never changes silently. Await `createBookMeasurer`
 * first so text is measured with the real fonts.
 */
export function ensureBookShape(book: Book, measurer?: TextMeasurer, clock?: Clock): Book {
  if (book.shape) return book;
  return { ...book, shape: computeBookShape(book, measurer, clock).shape };
}

/**
 * Explicit user action only. A new shape means existing illustrations no longer
 * match the picture zone, so callers must warn first and treat illustrations as outdated.
 */
export function recomputeBookShape(book: Book, measurer?: TextMeasurer, clock?: Clock): Book {
  return { ...book, shape: computeBookShape(book, measurer, clock).shape };
}

/**
 * The picture the AI must draw. The aspect is fixed per book; the size follows
 * the current margins. Uses a provisional shape until the book has one.
 */
export function getPictureZoneSpec(book: Book): PictureZoneSpec {
  const { pictureRect } = computePageGeometry(book, { kind: 'story', id: '' }, 'right');
  const aspect = getEffectivePictureAspect(book);
  return { widthMm: pictureRect.width, heightMm: pictureRect.height, aspect };
}

/** Provisional until P8: the front panel inside the safe inset and border band. */
export function getCoverPictureZoneSpec(_book: Book): PictureZoneSpec {
  const inset = COVER_SAFE_INSET_MM + BORDER_BAND_MM;
  const widthMm = COVER_PANEL_WIDTH_MM - 2 * inset;
  const heightMm = (COVER_HEIGHT_MM - 2 * inset) * 0.6;
  return { widthMm, heightMm, aspect: widthMm / heightMm };
}
