// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, TypographySettings } from '@/domain/book';
import { pxToMm } from '@/shared/units';
import { ensureFontsLoaded, getFontFamilyCss } from './fontRegistry';
import { computeContentRect } from './geometry';
import {
  MAX_TEXT_ZONE_FRACTION,
  MIN_TEXT_ZONE_HEIGHT_MM,
  PAGE_NUMBER_BAND_MM,
  TEXT_ZONE_PADDING_MM,
  getDefaultLayoutSettings,
} from './specs';

export type TextDirection = 'ltr' | 'rtl';

export const PT_TO_MM = 25.4 / 72;
/** Hebrew needs more room for nikud. Shared by measuring and rendering so they agree. */
export const TEXT_LINE_HEIGHT: Record<TextDirection, number> = { ltr: 1.35, rtl: 1.5 };

export interface TextMeasurer {
  measureBlockHeightMm(
    text: string,
    fontFamily: string,
    sizePt: number,
    widthMm: number,
    direction: TextDirection,
  ): number;
}

/** Deterministic measurer for tests: fixed average glyph width, greedy line count. */
export class FakeTextMeasurer implements TextMeasurer {
  constructor(private readonly avgCharWidthEm = 0.5) {}

  measureBlockHeightMm(
    text: string,
    _fontFamily: string,
    sizePt: number,
    widthMm: number,
    direction: TextDirection,
  ): number {
    if (text.trim() === '') return 0;
    const charsPerLine = Math.max(
      1,
      Math.floor(widthMm / (sizePt * PT_TO_MM * this.avgCharWidthEm)),
    );
    const lines = text
      .trim()
      .split('\n')
      .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
    return lines * sizePt * PT_TO_MM * TEXT_LINE_HEIGHT[direction];
  }
}

/** Measures with a hidden element. Call `prepare` first so the real fonts are in use. */
export class DomTextMeasurer implements TextMeasurer {
  private element: HTMLDivElement | null = null;

  prepare(fontIds: readonly string[]): Promise<void> {
    return ensureFontsLoaded(fontIds);
  }

  measureBlockHeightMm(
    text: string,
    fontFamily: string,
    sizePt: number,
    widthMm: number,
    direction: TextDirection,
  ): number {
    if (text.trim() === '') return 0;
    const el = this.getElement();
    el.style.fontFamily = fontFamily;
    el.style.fontSize = `${sizePt}pt`;
    el.style.lineHeight = String(TEXT_LINE_HEIGHT[direction]);
    el.style.width = `${widthMm}mm`;
    el.style.direction = direction;
    el.textContent = text.trim();
    return pxToMm(el.getBoundingClientRect().height, 96);
  }

  private getElement(): HTMLDivElement {
    if (this.element?.isConnected) return this.element;
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;' +
      'white-space:pre-wrap;overflow-wrap:break-word;margin:0;padding:0;border:0;box-sizing:content-box;';
    document.body.appendChild(el);
    this.element = el;
    return el;
  }
}

let sharedDomMeasurer: DomTextMeasurer | null = null;

/** DOM measurer in a browser; a fake one when there is no document (server rendering, tests). */
export function getDefaultMeasurer(): TextMeasurer {
  if (typeof document === 'undefined') return new FakeTextMeasurer();
  sharedDomMeasurer ??= new DomTextMeasurer();
  return sharedDomMeasurer;
}

/** Waits for the book's fonts, then returns a DOM measurer ready for `ensureBookShape`. */
export async function createBookMeasurer(book: Book): Promise<TextMeasurer> {
  const measurer = getDefaultMeasurer();
  await ensureFontsLoaded([book.typography.hebrewFontId, book.typography.englishFontId]);
  return measurer;
}

export interface PageTexts {
  textHe: string;
  textEn: string;
}

export interface TextZone {
  /** Usable text width and height (padding already removed). */
  widthMm: number;
  heightMm: number;
  hebrewFontFamily: string;
  englishFontFamily: string;
  spacingMm: number;
  minFontSizePt: number;
}

export interface TextFitResult {
  /** Index into the size steps; the last step when the text had to shrink below the steps. */
  stepIndex: number;
  fontSizePt: number;
  overflow: boolean;
  usedHeightMm: number;
}

export type SizeSteps = readonly number[];

export function measureTextHeightMm(
  texts: PageTexts,
  zone: Pick<TextZone, 'widthMm' | 'hebrewFontFamily' | 'englishFontFamily' | 'spacingMm'>,
  sizePt: number,
  measurer: TextMeasurer,
): number {
  const he = measurer.measureBlockHeightMm(
    texts.textHe,
    zone.hebrewFontFamily,
    sizePt,
    zone.widthMm,
    'rtl',
  );
  const en = measurer.measureBlockHeightMm(
    texts.textEn,
    zone.englishFontFamily,
    sizePt,
    zone.widthMm,
    'ltr',
  );
  return he + en + (he > 0 && en > 0 ? zone.spacingMm : 0);
}

const SHRINK_STEP_PT = 0.5;

/**
 * Starts at `startIndex`, moves down the size steps, then shrinks in small
 * decrements to the minimum size. Past that it flags overflow; text is never cut.
 */
export function fitTextInZone(
  texts: PageTexts,
  zone: TextZone,
  steps: SizeSteps,
  measurer: TextMeasurer,
  startIndex = 0,
): TextFitResult {
  const measure = (sizePt: number) => measureTextHeightMm(texts, zone, sizePt, measurer);
  const min = zone.minFontSizePt;
  const lastIndex = Math.max(0, steps.length - 1);

  for (let i = Math.max(0, startIndex); i < steps.length; i++) {
    const size = steps[i]!;
    if (size < min) break;
    const used = measure(size);
    if (used <= zone.heightMm)
      return { stepIndex: i, fontSizePt: size, overflow: false, usedHeightMm: used };
  }

  const smallest = steps.filter((s) => s >= min).at(-1) ?? min + SHRINK_STEP_PT;
  for (let size = smallest - SHRINK_STEP_PT; size > min; size -= SHRINK_STEP_PT) {
    const used = measure(size);
    if (used <= zone.heightMm)
      return { stepIndex: lastIndex, fontSizePt: size, overflow: false, usedHeightMm: used };
  }

  const used = measure(min);
  return {
    stepIndex: lastIndex,
    fontSizePt: min,
    overflow: used > zone.heightMm,
    usedHeightMm: used,
  };
}

export interface SizeStepThresholds {
  /** Texts up to this length use the large step. */
  largeMaxLength: number;
  /** Texts up to this length use the medium step; longer ones use the small step. */
  mediumMaxLength: number;
}

const DEFAULT_THRESHOLDS: SizeStepThresholds = { largeMaxLength: 120, mediumMaxLength: 240 };

/** Visible text length: nikud and other combining marks do not count. */
export function getTextLength(texts: PageTexts): number {
  const visible = (s: string) => s.trim().replace(/[\u0591-\u05C7]/g, '').length;
  return visible(texts.textHe) + visible(texts.textEn);
}

/** Splits the story pages' text lengths into thirds. */
export function computeSizeStepThresholds(book: Book): SizeStepThresholds {
  const lengths = book.storyPages
    .map(getTextLength)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (lengths.length < 3) return DEFAULT_THRESHOLDS;
  const at = (q: number) => lengths[Math.max(0, Math.ceil(lengths.length * q) - 1)]!;
  const largeMaxLength = at(1 / 3);
  return { largeMaxLength, mediumMaxLength: Math.max(largeMaxLength, at(2 / 3)) };
}

/** 0 = large, 1 = medium, 2 = small. */
export function chooseFontStep(textLength: number, thresholds: SizeStepThresholds): 0 | 1 | 2 {
  if (textLength <= thresholds.largeMaxLength) return 0;
  if (textLength <= thresholds.mediumMaxLength) return 1;
  return 2;
}

/** Text zone built from a text rectangle's size and the book's typography. */
export function buildTextZone(
  typography: TypographySettings,
  textRectSize: { width: number; height: number },
): TextZone {
  return {
    widthMm: Math.max(0, textRectSize.width - 2 * TEXT_ZONE_PADDING_MM),
    heightMm: Math.max(0, textRectSize.height - 2 * TEXT_ZONE_PADDING_MM),
    hebrewFontFamily: getFontFamilyCss(typography.hebrewFontId),
    englishFontFamily: getFontFamilyCss(typography.englishFontId),
    spacingMm: typography.hebrewEnglishSpacingMm,
    minFontSizePt: typography.minFontSizePt,
  };
}

export interface TextZoneHeightResult {
  heightMm: number;
  /** Height the longest page needs at the minimum size, before capping. */
  requiredHeightMm: number;
  /** True when the longest page does not fit even at the maximum zone height. */
  capped: boolean;
}

/**
 * Measures every page's real text at the minimum size and takes the tallest.
 * Measured at default margins, so the zone is the same however margins change later.
 */
export function computeTextZoneHeightMm(book: Book, measurer: TextMeasurer): TextZoneHeightResult {
  const defaults = getDefaultLayoutSettings();
  const content = computeContentRect(book, 'right', defaults);
  const zone = buildTextZone(book.typography, { width: content.width, height: 0 });
  const pages: PageTexts[] = [book.intro, ...book.storyPages];

  const tallest = pages.reduce(
    (max, page) =>
      Math.max(max, measureTextHeightMm(page, zone, book.typography.minFontSizePt, measurer)),
    0,
  );
  const required = Math.max(MIN_TEXT_ZONE_HEIGHT_MM, tallest + 2 * TEXT_ZONE_PADDING_MM);

  const body = content.height - PAGE_NUMBER_BAND_MM;
  const cap = Math.max(MIN_TEXT_ZONE_HEIGHT_MM, body * MAX_TEXT_ZONE_FRACTION);
  const capped = required > cap;
  return { heightMm: Math.min(required, cap), requiredHeightMm: required, capped };
}
