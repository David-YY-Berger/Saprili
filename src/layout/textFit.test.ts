// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import {
  FakeTextMeasurer,
  buildTextZone,
  chooseFontStep,
  computeSizeStepThresholds,
  computeTextZoneHeightMm,
  fitTextInZone,
  getTextLength,
  type TextZone,
} from './textFit';

const NOW = '2026-01-01T00:00:00.000Z';
const measurer = new FakeTextMeasurer();

function bookWithTexts(pages: { en?: string; he?: string }[]) {
  const book = createEmptyBook({ nowIso: NOW });
  book.storyPages = pages.map((p, i) =>
    createStoryPage({ id: `s${i}`, textEn: p.en ?? '', textHe: p.he ?? '' }),
  );
  return book;
}

// Default text width: 163 content - 6 padding = 157 mm. At 14 pt that is 63 characters per line.
describe('computeTextZoneHeightMm', () => {
  it('takes the tallest page at the minimum size, plus padding', () => {
    const book = bookWithTexts([{ en: 'short' }, { en: 'x'.repeat(630), he: 'א'.repeat(63) }]);
    const result = computeTextZoneHeightMm(book, measurer);
    // English: 10 lines x 6.6679 mm; Hebrew: 1 line x 7.4084 mm; spacing 3 mm; padding 2 x 3 mm.
    const expected = 10 * 14 * (25.4 / 72) * 1.35 + 14 * (25.4 / 72) * 1.5 + 3 + 6;
    expect(result.heightMm).toBeCloseTo(expected, 3);
    expect(result.capped).toBe(false);
  });

  it('measures the intro as well', () => {
    const book = bookWithTexts([{ en: 'short' }]);
    book.intro.textEn = 'y'.repeat(630);
    expect(computeTextZoneHeightMm(book, measurer).heightMm).toBeGreaterThan(70);
  });

  it('never goes below the minimum zone height', () => {
    expect(computeTextZoneHeightMm(bookWithTexts([{ en: 'hi' }]), measurer).heightMm).toBe(25);
  });

  it('caps at 40% of the body and reports it', () => {
    const result = computeTextZoneHeightMm(bookWithTexts([{ en: 'x'.repeat(3000) }]), measurer);
    expect(result.capped).toBe(true);
    expect(result.heightMm).toBeCloseTo(247 * 0.4, 6);
    expect(result.requiredHeightMm).toBeGreaterThan(result.heightMm);
  });
});

describe('size steps', () => {
  const lengths = [10, 20, 30, 40, 50, 60];
  const book = bookWithTexts(lengths.map((n) => ({ en: 'x'.repeat(n) })));

  it('splits the story lengths into thirds', () => {
    expect(computeSizeStepThresholds(book)).toEqual({ largeMaxLength: 20, mediumMaxLength: 40 });
  });

  it('chooses large, medium or small by length', () => {
    const t = computeSizeStepThresholds(book);
    expect([10, 20, 21, 40, 41, 200].map((n) => chooseFontStep(n, t))).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('falls back to defaults with fewer than three texts', () => {
    expect(computeSizeStepThresholds(bookWithTexts([{ en: 'a' }]))).toEqual({
      largeMaxLength: 120,
      mediumMaxLength: 240,
    });
  });

  it('ignores nikud when counting text', () => {
    expect(getTextLength({ textHe: 'שָׁלוֹם', textEn: 'ab' })).toBe(6);
  });
});

describe('fitTextInZone', () => {
  const steps = [22, 18, 14];
  const zone = (heightMm: number, minFontSizePt = 14): TextZone => ({
    widthMm: 157,
    heightMm,
    hebrewFontFamily: 'x',
    englishFontFamily: 'y',
    spacingMm: 3,
    minFontSizePt,
  });
  const texts = { textHe: '', textEn: 'x'.repeat(100) };

  it('keeps the start step when it fits', () => {
    const r = fitTextInZone(texts, zone(100), steps, measurer);
    expect(r).toMatchObject({ stepIndex: 0, fontSizePt: 22, overflow: false });
  });

  it('honours the start index', () => {
    expect(fitTextInZone(texts, zone(100), steps, measurer, 1)).toMatchObject({
      stepIndex: 1,
      fontSizePt: 18,
    });
  });

  it('moves to smaller steps when the text does not fit', () => {
    const r = fitTextInZone(texts, zone(14), steps, measurer);
    expect(r).toMatchObject({ stepIndex: 2, fontSizePt: 14, overflow: false });
  });

  it('shrinks below the steps down to the minimum before giving up', () => {
    const r = fitTextInZone(texts, zone(11.5, 8), steps, measurer);
    expect(r.fontSizePt).toBe(12);
    expect(r.overflow).toBe(false);
  });

  it('flags overflow at the minimum size and never drops below it', () => {
    const r = fitTextInZone(texts, zone(5), steps, measurer);
    expect(r).toMatchObject({ stepIndex: 2, fontSizePt: 14, overflow: true });
    expect(r.usedHeightMm).toBeGreaterThan(5);
  });

  it('treats empty text as fitting', () => {
    expect(fitTextInZone({ textHe: '', textEn: '' }, zone(1), steps, measurer)).toMatchObject({
      overflow: false,
      usedHeightMm: 0,
    });
  });

  it('adds spacing only when both languages are present', () => {
    const both = fitTextInZone({ textHe: 'א', textEn: 'a' }, zone(100), steps, measurer);
    const he = fitTextInZone({ textHe: 'א', textEn: '' }, zone(100), steps, measurer);
    const en = fitTextInZone({ textHe: '', textEn: 'a' }, zone(100), steps, measurer);
    expect(both.usedHeightMm).toBeCloseTo(he.usedHeightMm + en.usedHeightMm + 3, 6);
  });
});

describe('buildTextZone', () => {
  it('removes padding from the text rectangle', () => {
    const book = bookWithTexts([]);
    const z = buildTextZone(book.typography, { width: 163, height: 60 });
    expect(z.widthMm).toBe(157);
    expect(z.heightMm).toBe(54);
    expect(z.hebrewFontFamily).toContain('Noto Sans Hebrew');
    expect(z.englishFontFamily).toContain('Nunito');
  });
});
