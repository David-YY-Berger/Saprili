// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import {
  COVER_BLEED_MM,
  COVER_HEIGHT_MM,
  COVER_HINGE_WIDTH_MM,
  COVER_PANEL_WIDTH_MM,
  COVER_SAFE_INSET_MM,
  SPINE_WIDTH_TABLE,
} from '@/domain/constants';
import { getFontFamilyCss } from './fontRegistry';
import { insetRect, type Rect } from './geometry';
import { CONTENT_INSET_MM, TEXT_ZONE_PADDING_MM } from './specs';
import {
  PT_TO_MM,
  TEXT_LINE_HEIGHT,
  fitTextInZone,
  getDefaultMeasurer,
  type TextFitResult,
  type TextMeasurer,
} from './textFit';

export const COVER_TITLE_HEIGHT_MM = 38;
export const COVER_SUBTITLE_HEIGHT_MM = 16;
export const COVER_MULTILINE_SUBTITLE_HEIGHT_MM = 22;
export const COVER_TEXT_GAP_MM = 4;
export const COVER_PICTURE_GAP_MM = 6;
/** Always reserved at the bottom of the front, so the colouring marker never moves the picture. */
export const COVER_MARKER_BAND_MM = 10;
export const COVER_MARKER_MAX_WIDTH_MM = 80;
export const COVER_MARKER_PADDING_MM = 1;
export const COVER_SPINE_PADDING_MM = 1;

export const COVER_TITLE_STEPS_PT = [40, 34, 30, 26, 22] as const;
export const COVER_TITLE_MIN_PT = 18;
export const COVER_SUBTITLE_STEPS_PT = [24, 20, 18, 16] as const;
export const COVER_SUBTITLE_MIN_PT = 14;
export const COVER_MARKER_STEPS_PT = [14, 12, 10] as const;
export const COVER_MARKER_MIN_PT = 9;
export const SPINE_TEXT_MAX_PT = 14;
export const SPINE_TEXT_MIN_PT = 6;

/**
 * Placeholder until a printed mock-up is checked (P8.7): counter-clockwise, so Hebrew
 * starts at the top of the spine and reads downwards.
 */
export const SPINE_TEXT_ROTATION_DEG = -90;

export interface CoverGeometry {
  spineWidthMm: number;
  /** Which side of the flat cover the front panel is on. */
  frontSide: 'left' | 'right';
  /** All rectangles: millimetres, origin at the top-left corner of the cut rectangle. */
  cutRect: Rect;
  bleedRect: Rect;
  frontPanelRect: Rect;
  backPanelRect: Rect;
  spineRect: Rect;
  hingeRects: [Rect, Rect];
  safeRects: { front: Rect; back: Rect; spine: Rect };
  frontPictureRect: Rect;
  titleRect: Rect;
  subtitleRect: Rect;
  spineTextRect: Rect;
  colouringMarkerRect: Rect;
}

/** First table row that holds the page count; past the last row the last width is kept. */
export function getSpineWidthMm(pageCount: number): number {
  const row = SPINE_WIDTH_TABLE.find((r) => pageCount <= r.pages) ?? SPINE_WIDTH_TABLE.at(-1);
  return row?.spineMm ?? 0;
}

export function getInteriorPageCount(book: Book): number {
  return book.storyPages.length + 2;
}

export function computeCoverGeometry(
  book: Book,
  pageCount: number = getInteriorPageCount(book),
): CoverGeometry {
  const panel = COVER_PANEL_WIDTH_MM;
  const hinge = COVER_HINGE_WIDTH_MM;
  const height = COVER_HEIGHT_MM;
  const spineWidthMm = getSpineWidthMm(pageCount);
  const cutWidth = panel * 2 + hinge * 2 + spineWidthMm;
  const cutRect: Rect = { x: 0, y: 0, width: cutWidth, height };
  const leftPanel: Rect = { x: 0, y: 0, width: panel, height };
  const rightPanel: Rect = { x: cutWidth - panel, y: 0, width: panel, height };
  const frontSide = book.bindingSide === 'right' ? 'left' : 'right';
  const frontPanelRect = frontSide === 'left' ? leftPanel : rightPanel;
  const backPanelRect = frontSide === 'left' ? rightPanel : leftPanel;
  const spineRect: Rect = { x: panel + hinge, y: 0, width: spineWidthMm, height };
  const hingeRects: [Rect, Rect] = [
    { x: panel, y: 0, width: hinge, height },
    { x: panel + hinge + spineWidthMm, y: 0, width: hinge, height },
  ];

  const safeFront = insetRect(frontPanelRect, COVER_SAFE_INSET_MM);
  const safeBack = insetRect(backPanelRect, COVER_SAFE_INSET_MM);
  const safeSpine = insetRect(spineRect, { top: COVER_SAFE_INSET_MM, bottom: COVER_SAFE_INSET_MM });
  const content = insetRect(safeFront, CONTENT_INSET_MM);

  const titleRect: Rect = { ...content, height: COVER_TITLE_HEIGHT_MM };
  const subtitleRect: Rect = {
    ...content,
    y: titleRect.y + titleRect.height + COVER_TEXT_GAP_MM,
    height: book.cover.subtitleHe.includes('\n')
      ? COVER_MULTILINE_SUBTITLE_HEIGHT_MM
      : COVER_SUBTITLE_HEIGHT_MM,
  };
  const pictureTop = subtitleRect.y + subtitleRect.height + COVER_PICTURE_GAP_MM;
  const markerBandTop = content.y + content.height - COVER_MARKER_BAND_MM;
  const frontPictureRect: Rect = {
    x: content.x,
    y: pictureTop,
    width: content.width,
    height: Math.max(0, markerBandTop - COVER_TEXT_GAP_MM - pictureTop),
  };
  const markerWidth = Math.min(COVER_MARKER_MAX_WIDTH_MM, content.width);
  const colouringMarkerRect: Rect = {
    x: content.x + (content.width - markerWidth) / 2,
    y: markerBandTop,
    width: markerWidth,
    height: COVER_MARKER_BAND_MM,
  };

  return {
    spineWidthMm,
    frontSide,
    cutRect,
    bleedRect: insetRect(cutRect, -COVER_BLEED_MM),
    frontPanelRect,
    backPanelRect,
    spineRect,
    hingeRects,
    safeRects: { front: safeFront, back: safeBack, spine: safeSpine },
    frontPictureRect,
    titleRect,
    subtitleRect,
    spineTextRect: insetRect(safeSpine, {
      left: COVER_SPINE_PADDING_MM,
      right: COVER_SPINE_PADDING_MM,
    }),
    colouringMarkerRect,
  };
}

export interface CoverTextFits {
  title: TextFitResult;
  subtitle: TextFitResult;
  marker: TextFitResult;
}

function fitHebrewBlock(
  book: Book,
  text: string,
  rect: Rect,
  steps: readonly number[],
  minFontSizePt: number,
  measurer: TextMeasurer,
  paddingMm: number = TEXT_ZONE_PADDING_MM,
): TextFitResult {
  const family = getFontFamilyCss(book.typography.hebrewFontId);
  return fitTextInZone(
    { textHe: text, textEn: '' },
    {
      widthMm: Math.max(0, rect.width - 2 * paddingMm),
      heightMm: Math.max(0, rect.height - 2 * paddingMm),
      hebrewFontFamily: family,
      englishFontFamily: family,
      spacingMm: 0,
      minFontSizePt,
    },
    steps,
    measurer,
  );
}

/** Shared by the renderer and pre-flight so both agree on the sizes. */
export function computeCoverTextFits(
  book: Book,
  geometry: CoverGeometry,
  measurer: TextMeasurer = getDefaultMeasurer(),
): CoverTextFits {
  const { cover } = book;
  return {
    title: fitHebrewBlock(
      book,
      cover.titleHe,
      geometry.titleRect,
      COVER_TITLE_STEPS_PT,
      COVER_TITLE_MIN_PT,
      measurer,
    ),
    subtitle: fitHebrewBlock(
      book,
      cover.subtitleHe,
      geometry.subtitleRect,
      COVER_SUBTITLE_STEPS_PT,
      COVER_SUBTITLE_MIN_PT,
      measurer,
    ),
    marker: fitHebrewBlock(
      book,
      cover.colouringMarkerText,
      geometry.colouringMarkerRect,
      COVER_MARKER_STEPS_PT,
      COVER_MARKER_MIN_PT,
      measurer,
      COVER_MARKER_PADDING_MM,
    ),
  };
}

export interface SpineTextFit {
  fontSizePt: number;
  /** False when even the smallest size does not fit on one line across the spine. */
  fits: boolean;
}

export interface SpineTextOptions {
  /** Length of the spine text area; defaults to the cover height minus the safe inset at both ends. */
  lengthMm?: number;
  measurer?: TextMeasurer;
}

/** Shrinks the single-line spine text until it fits the spine width and length; warns if it cannot. */
export function fitSpineText(
  text: string,
  spineWidthMm: number,
  fontId: string,
  options: SpineTextOptions = {},
): SpineTextFit {
  const lengthMm = options.lengthMm ?? COVER_HEIGHT_MM - 2 * COVER_SAFE_INSET_MM;
  const measurer = options.measurer ?? getDefaultMeasurer();
  const thicknessMm = spineWidthMm - 2 * COVER_SPINE_PADDING_MM;
  if (text.trim() === '') return { fontSizePt: SPINE_TEXT_MAX_PT, fits: true };
  if (thicknessMm <= 0) return { fontSizePt: SPINE_TEXT_MIN_PT, fits: false };

  const family = getFontFamilyCss(fontId);
  for (let size = SPINE_TEXT_MAX_PT; size >= SPINE_TEXT_MIN_PT; size -= 0.5) {
    const lineMm = size * PT_TO_MM * TEXT_LINE_HEIGHT.rtl;
    if (lineMm > thicknessMm) continue;
    const used = measurer.measureBlockHeightMm(text, family, size, lengthMm, 'rtl');
    if (used < lineMm * 1.5) return { fontSizePt: size, fits: true };
  }
  return { fontSizePt: SPINE_TEXT_MIN_PT, fits: false };
}
