// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, LayoutSettings } from '@/domain/book';
import { SAFE_MARGIN_FLOOR_MM } from '@/domain/constants';
import type { PageKind, PageRef } from '@/domain/page';
import {
  CONTENT_INSET_MM,
  DEFAULT_TEXT_ZONE_HEIGHT_MM,
  MIN_TEXT_ZONE_HEIGHT_MM,
  PAGE_NUMBER_BAND_MM,
  getDefaultLayoutSettings,
  getPrintSpec,
} from './specs';

/** Millimetres, origin top-left, y grows downwards. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Which half of a spread a page sits on. */
export type PageSide = 'left' | 'right';

export function insetRect(rect: Rect, insets: number | Partial<Insets>): Rect {
  const i =
    typeof insets === 'number'
      ? { top: insets, right: insets, bottom: insets, left: insets }
      : { top: 0, right: 0, bottom: 0, left: 0, ...insets };
  return {
    x: rect.x + i.left,
    y: rect.y + i.top,
    width: Math.max(0, rect.width - i.left - i.right),
    height: Math.max(0, rect.height - i.top - i.bottom),
  };
}

export function unionRects(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export interface ClampResult {
  settings: LayoutSettings;
  /** Fields that were raised to the safe floor (or to zero for the picture gap). */
  clamped: (keyof LayoutSettings)[];
}

const FLOORED_FIELDS = ['marginTopMm', 'marginBottomMm', 'marginOuterMm', 'gutterMm'] as const;

/** Enforces the 10 mm safe-margin floor; never mutates the input. */
export function clampLayoutSettings(settings: LayoutSettings): ClampResult {
  const next = { ...settings };
  const clamped: (keyof LayoutSettings)[] = [];
  for (const field of FLOORED_FIELDS) {
    const value = next[field];
    if (!Number.isFinite(value) || value < SAFE_MARGIN_FLOOR_MM) {
      next[field] = SAFE_MARGIN_FLOOR_MM;
      clamped.push(field);
    }
  }
  if (!Number.isFinite(next.pictureTextGapMm) || next.pictureTextGapMm < 0) {
    next.pictureTextGapMm = 0;
    clamped.push('pictureTextGapMm');
  }
  return { settings: next, clamped };
}

/**
 * Largest rectangle with the given aspect (width / height) that fits in `area`,
 * centred. Scaling is uniform, so the aspect never changes.
 */
export function computePictureRect(area: Rect, aspect: number): Rect {
  if (!(aspect > 0) || area.width <= 0 || area.height <= 0) {
    return { x: area.x + area.width / 2, y: area.y + area.height / 2, width: 0, height: 0 };
  }
  const width = Math.min(area.width, area.height * aspect);
  const height = width / aspect;
  return {
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - height) / 2,
    width,
    height,
  };
}

function sideMargins(layout: LayoutSettings, side: PageSide): Insets {
  // The gutter always sits on the inner edge (toward the centre fold).
  return {
    top: layout.marginTopMm,
    bottom: layout.marginBottomMm,
    left: side === 'left' ? layout.marginOuterMm : layout.gutterMm,
    right: side === 'left' ? layout.gutterMm : layout.marginOuterMm,
  };
}

export function computeTrimRect(book: Book): Rect {
  return { x: 0, y: 0, width: book.format.trimWidthMm, height: book.format.trimHeightMm };
}

/** Safe rectangle: trim minus margins. The decorative border lives inside it. */
export function computeSafeRect(book: Book, side: PageSide, layout = book.layout): Rect {
  return insetRect(computeTrimRect(book), sideMargins(layout, side));
}

/** Area inside the border that holds the picture, text and page number. */
export function computeContentRect(book: Book, side: PageSide, layout = book.layout): Rect {
  return insetRect(computeSafeRect(book, side, layout), CONTENT_INSET_MM);
}

export interface ContentZones {
  /** Space available to the fixed-shape picture before it is fitted. */
  pictureArea: Rect;
  textRect: Rect;
  pageNumberRect: Rect;
}

/** Splits a content rectangle into picture area, text zone and page number band. */
export function splitContentRect(
  content: Rect,
  textZoneHeightMm: number,
  gapMm: number,
): ContentZones {
  const pageNumberHeight = Math.min(PAGE_NUMBER_BAND_MM, content.height);
  const pageNumberRect: Rect = {
    x: content.x,
    y: content.y + content.height - pageNumberHeight,
    width: content.width,
    height: pageNumberHeight,
  };
  const body: Rect = { ...content, height: content.height - pageNumberHeight };
  const textHeight = Math.min(Math.max(0, textZoneHeightMm), Math.max(0, body.height - gapMm));
  const textRect: Rect = {
    x: body.x,
    y: body.y + body.height - textHeight,
    width: body.width,
    height: textHeight,
  };
  const pictureArea: Rect = {
    x: body.x,
    y: body.y,
    width: body.width,
    height: Math.max(0, body.height - textHeight - gapMm),
  };
  return { pictureArea, textRect, pageNumberRect };
}

/** Picture aspect when margins are at their defaults and the text zone has the given height. */
export function computeDefaultPictureAspect(book: Book, textZoneHeightMm: number): number {
  const defaults = getDefaultLayoutSettings();
  const content = computeContentRect(book, 'right', defaults);
  const { pictureArea } = splitContentRect(content, textZoneHeightMm, defaults.pictureTextGapMm);
  return pictureArea.height > 0 ? pictureArea.width / pictureArea.height : 1;
}

export interface PageGeometry {
  kind: PageKind;
  side: PageSide;
  trimRect: Rect;
  bleedRect: Rect;
  safeRect: Rect;
  borderRect: Rect;
  contentRect: Rect;
  pictureRect: Rect;
  textRect: Rect;
  pageNumberRect: Rect;
}

export function getEffectiveTextZoneHeightMm(book: Book): number {
  return Math.max(
    MIN_TEXT_ZONE_HEIGHT_MM,
    book.shape?.textZoneHeightMm ?? DEFAULT_TEXT_ZONE_HEIGHT_MM,
  );
}

export function getEffectivePictureAspect(book: Book): number {
  return (
    book.shape?.pictureAspect ??
    computeDefaultPictureAspect(book, getEffectiveTextZoneHeightMm(book))
  );
}

/** All rectangles are page-local mm with the origin at the trim's top-left corner. */
export function computePageGeometry(book: Book, pageRef: PageRef, side: PageSide): PageGeometry {
  const { bleedMm } = getPrintSpec(book);
  const trimRect = computeTrimRect(book);
  const safeRect = computeSafeRect(book, side);
  const contentRect = computeContentRect(book, side);
  const { pictureArea, textRect, pageNumberRect } = splitContentRect(
    contentRect,
    getEffectiveTextZoneHeightMm(book),
    book.layout.pictureTextGapMm,
  );
  return {
    kind: pageRef.kind,
    side,
    trimRect,
    bleedRect: insetRect(trimRect, -bleedMm),
    safeRect,
    borderRect: safeRect,
    contentRect,
    pictureRect: computePictureRect(pictureArea, getEffectivePictureAspect(book)),
    textRect,
    pageNumberRect,
  };
}
