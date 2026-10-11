// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPagePair } from '@/domain/factories';
import type { ImageRecord } from '@/domain/image';
import { computeEffectiveDpi, runPreflight } from './preflight';

function makeBook() {
  const book = createEmptyBook({ id: 'preflight-book', nowIso: '2026-01-01T00:00:00.000Z' });
  book.storyPages = createStoryPagePair();
  return book;
}

function image(id: string, widthPx: number): ImageRecord {
  const blob = new Blob(['image'], { type: 'image/png' });
  return {
    id,
    bookId: 'preflight-book',
    kind: 'illustration',
    blob,
    mime: blob.type,
    widthPx,
    heightPx: widthPx,
    byteSize: blob.size,
    createdAt: '2026-01-01T00:00:00.000Z',
    meta: { source: 'uploaded' },
  };
}

describe('preflight', () => {
  it('calculates effective DPI from physical display width', () => {
    expect(computeEffectiveDpi(300, 25.4)).toBeCloseTo(300);
    expect(() => computeEffectiveDpi(0, 25.4)).toThrow(RangeError);
  });

  it('reports missing art and QR without blocking export', () => {
    const report = runPreflight(makeBook(), 'colour');
    expect(report.exportAllowed).toBe(true);
    expect(report.issues.map((issue) => issue.code)).toEqual([
      'MISSING_ILLUSTRATION',
      'MISSING_ILLUSTRATION',
      'MISSING_QR',
    ]);
  });

  it('warns about stale colouring and gives a gentle low-resolution notice', () => {
    const book = makeBook();
    const page = book.storyPages[0]!;
    page.illustration.currentImageId = 'illustration';
    page.colouring.imageId = 'colouring';
    page.colouring.sourceIllustrationImageId = 'old-illustration';
    page.colouring.outdated = true;
    const images = new Map([
      ['colouring', image('colouring', 120)],
      ['illustration', image('illustration', 120)],
      ['qr', image('qr', 300)],
    ]);
    book.colophon.qrImageId = 'qr';
    const report = runPreflight(book, 'colouring', images);
    expect(report.issues.map((issue) => issue.code)).toContain('OUTDATED_COLOURING');
    expect(report.issues.map((issue) => issue.code)).toContain('LOW_RESOLUTION');
    expect(report.issues.find((issue) => issue.code === 'LOW_RESOLUTION')?.severity).toBe('info');
  });

  it('flags an odd story-page count', () => {
    const book = makeBook();
    book.storyPages.pop();
    expect(runPreflight(book, 'colour').issues.map((issue) => issue.code)).toContain('PAGE_COUNT');
  });
});
