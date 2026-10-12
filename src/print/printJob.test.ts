// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
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

  it('builds a single cover sheet larger than the bleed rectangle, with marks outside the bleed', () => {
    const book = createEmptyBook({ id: 'cover', nowIso: '2026-01-01T00:00:00.000Z' });
    const doc = buildPrintDocument(book, {
      bookId: book.id,
      output: 'cover',
      sheetMode: 'exact',
      coverEdition: 'colouring',
    });
    expect(doc.sheets).toHaveLength(1);
    const sheet = doc.sheets[0]!;
    expect(sheet.isCover).toBe(true);
    expect(sheet.pageRef).toBeNull();
    expect(sheet.edition).toBe('colouring');
    expect(sheet.bleedMm).toBe(15);
    // 436 x 297 cut + 2 x 15 bleed = 466 x 327, no marks (BOOK-BIND template)
    expect(sheet.sheetSizeMm).toEqual({ widthMm: 466, heightMm: 327 });
    expect(sheet.placementMm).toEqual({ leftMm: 0, topMm: 0, widthMm: 466, heightMm: 327 });
    expect(sheet.trimRect).toEqual({ x: 15, y: 15, width: 436, height: 297 });
  });

  it('prints the cover at exact size even in centredA4 mode', () => {
    const book = createEmptyBook({ id: 'cover3', nowIso: '2026-01-01T00:00:00.000Z' });
    const doc = buildPrintDocument(book, { bookId: book.id, output: 'cover', sheetMode: 'centredA4' });
    expect(doc.sheets[0]?.sheetSizeMm).toEqual({ widthMm: 466, heightMm: 327 });
  });

  it('defaults the cover to the colour edition', () => {
    const book = createEmptyBook({ id: 'cover2', nowIso: '2026-01-01T00:00:00.000Z' });
    const doc = buildPrintDocument(book, { bookId: book.id, output: 'cover', sheetMode: 'exact' });
    expect(doc.sheets[0]?.edition).toBe('colour');
  });

  it('gives interior sheets the interior bleed', () => {
    const book = createEmptyBook({ id: 'interior', nowIso: '2026-01-01T00:00:00.000Z' });
    book.storyPages = [createStoryPage(), createStoryPage()];
    const doc = buildPrintDocument(book, { bookId: book.id, output: 'book', sheetMode: 'exact' });
    expect(doc.sheets.every((sheet) => sheet.bleedMm === 3 && !sheet.isCover)).toBe(true);
  });
});
