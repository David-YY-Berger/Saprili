// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { AppError } from '@/shared/errors';
import { buildPrintDocument, computeSheetLayout } from './printJob';

const shop = {
  trim: { widthMm: 206, heightMm: 291 },
  bleedMm: 3,
  cropMark: { lengthMm: 5, offsetMm: 3 },
};

describe('print job layout', () => {
  it('leaves the full bleed and crop-mark zone around an exact-size sheet', () => {
    const layout = computeSheetLayout(shop, 'exact');
    expect(layout.sheetSizeMm).toEqual({ widthMm: 228, heightMm: 313 });
    expect(layout.placementMm).toEqual({ leftMm: 8, topMm: 8, widthMm: 212, heightMm: 297 });
    expect(layout.trimRect).toEqual({ x: 11, y: 11, width: 206, height: 291 });
  });

  it('uses A4 as a minimum and expands it when the bleed and crop marks need room', () => {
    const layout = computeSheetLayout(shop, 'centredA4');
    expect(layout.sheetSizeMm).toEqual({ widthMm: 228, heightMm: 313 });
    expect(layout.trimRect).toEqual({ x: 11, y: 11, width: 206, height: 291 });
    const small = computeSheetLayout(
      { ...shop, trim: { widthMm: 100, heightMm: 150 } },
      'centredA4',
    );
    expect(small.sheetSizeMm).toEqual({ widthMm: 210, heightMm: 297 });
    expect(small.sheetSizeMm.widthMm).toBeGreaterThanOrEqual(210);
    expect(small.sheetSizeMm.heightMm).toBeGreaterThanOrEqual(297);
  });

  it('builds reading-order sheets and selects a single requested page', () => {
    const book = createEmptyBook({ id: 'print', nowIso: '2026-01-01T00:00:00.000Z' });
    book.storyPages = [createStoryPage(), createStoryPage()];
    const full = buildPrintDocument(book, {
      bookId: book.id,
      output: 'book',
      sheetMode: 'exact',
    });
    expect(full.sheets.map((sheet) => sheet.pageRef?.kind)).toEqual([
      'intro',
      'story',
      'story',
      'colophon',
    ]);
    const page = buildPrintDocument(book, {
      bookId: book.id,
      output: 'page',
      pageId: book.storyPages[1]!.id,
      sheetMode: 'exact',
    });
    expect(page.sheets).toHaveLength(1);
    expect(page.sheets[0]?.pageRef?.id).toBe(book.storyPages[1]!.id);
  });

  it('keeps the odd-page fallback on full exports and uses colouring assets when requested', () => {
    const book = createEmptyBook({ id: 'odd', nowIso: '2026-01-01T00:00:00.000Z' });
    book.storyPages = [createStoryPage()];
    const full = buildPrintDocument(book, {
      bookId: book.id,
      output: 'book',
      sheetMode: 'exact',
    });
    expect(full.sheets).toHaveLength(4);
    expect(full.sheets.at(-1)?.pageRef).toBeNull();
    const colouring = buildPrintDocument(book, {
      bookId: book.id,
      output: 'colouring',
      sheetMode: 'exact',
    });
    expect(colouring.sheets.every((sheet) => sheet.edition === 'colouring')).toBe(true);
  });

  it('rejects cover jobs until the cover renderer is implemented', () => {
    const book = createEmptyBook({ id: 'cover', nowIso: '2026-01-01T00:00:00.000Z' });
    expect(() =>
      buildPrintDocument(book, { bookId: book.id, output: 'cover', sheetMode: 'exact' }),
    ).toThrow(AppError);
  });
});
