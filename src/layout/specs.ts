// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, LayoutSettings, PrintSettings } from '@/domain/book';
import {
  CROP_MARK_LENGTH_MM,
  CROP_MARK_OFFSET_MM,
  CROP_MARK_STROKE_MM,
  DEFAULT_GUTTER_MM,
  INTERIOR_BLEED_MM,
  SAFE_MARGIN_FLOOR_MM,
} from '@/domain/constants';

/** Depth of the decorative border band, measured inward from the safe rectangle. */
export const BORDER_BAND_MM = 7;
/** Clear space between the border band and the page content. */
export const BORDER_CONTENT_PADDING_MM = 2;
/** Distance from the safe rectangle to the content rectangle. */
export const CONTENT_INSET_MM = BORDER_BAND_MM + BORDER_CONTENT_PADDING_MM;
/** Always reserved at the bottom of the content, so toggling page numbers never moves anything. */
export const PAGE_NUMBER_BAND_MM = 6;
/** Padding inside the text zone (and inside the optional text panel). */
export const TEXT_ZONE_PADDING_MM = 3;
export const MIN_TEXT_ZONE_HEIGHT_MM = 25;
/** Largest share of the body (content minus page number band) the text zone may take. */
export const MAX_TEXT_ZONE_FRACTION = 0.4;
/** Used until a book has a computed shape. */
export const DEFAULT_TEXT_ZONE_HEIGHT_MM = 60;
export const DEFAULT_PICTURE_TEXT_GAP_MM = 5;
export const PICTURE_CORNER_RADIUS_MM = 4;
export const PICTURE_FRAME_STROKE_MM = 0.6;

export function getDefaultLayoutSettings(): LayoutSettings {
  return {
    marginTopMm: SAFE_MARGIN_FLOOR_MM,
    marginBottomMm: SAFE_MARGIN_FLOOR_MM,
    marginOuterMm: SAFE_MARGIN_FLOOR_MM,
    gutterMm: DEFAULT_GUTTER_MM,
    pictureTextGapMm: DEFAULT_PICTURE_TEXT_GAP_MM,
  };
}

export interface CropMarkSpec {
  lengthMm: number;
  offsetMm: number;
  strokeMm: number;
}

export interface PrintSpec {
  trim: { widthMm: number; heightMm: number };
  bleedMm: number;
  safeFloorMm: number;
  sheetMode: PrintSettings['sheetMode'];
  cropMark: CropMarkSpec;
}

/** Print constants merged with the book's own settings. */
export function getPrintSpec(book: Book): PrintSpec {
  return {
    trim: { widthMm: book.format.trimWidthMm, heightMm: book.format.trimHeightMm },
    bleedMm: INTERIOR_BLEED_MM,
    safeFloorMm: SAFE_MARGIN_FLOOR_MM,
    sheetMode: book.print.sheetMode,
    cropMark: {
      lengthMm: CROP_MARK_LENGTH_MM,
      offsetMm: CROP_MARK_OFFSET_MM,
      strokeMm: CROP_MARK_STROKE_MM,
    },
  };
}
