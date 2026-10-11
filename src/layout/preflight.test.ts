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

  it('warns when more than three percent of a generated image edge was cropped', () => {
    const book = makeBook();
    const page = book.storyPages[0]!;
    page.illustration.currentImageId = 'illustration';
    const illustration = image('illustration', 1800);
    illustration.meta.croppedEdgePercent = 3.1;
    const report = runPreflight(book, 'colour', new Map([['illustration', illustration]]));
    expect(report.issues.find((issue) => issue.code === 'AI_ASPECT_CROP')).toMatchObject({
      severity: 'warning',
      pageRef: { kind: 'story', id: page.id },
    });
  });

  it('flags an odd story-page count', () => {
    const book = makeBook();
    book.storyPages.pop();
    expect(runPreflight(book, 'colour').issues.map((issue) => issue.code)).toContain('PAGE_COUNT');
  });

  describe('cover scope', () => {
    const codes = (book: ReturnType<typeof makeBook>, images = new Map<string, ImageRecord>()) =>
      runPreflight(book, 'colour', images, 'cover').issues.map((issue) => issue.code);

    it('only flags the missing cover illustration for the default cover', () => {
      expect(codes(makeBook())).toEqual(['MISSING_COVER_ILLUSTRATION']);
    });

    it('is clean once the cover has an image and does not mention interior issues', () => {
      const book = makeBook();
      book.cover.ownImageId = 'own';
      expect(codes(book, new Map([['own', image('own', 3000)]]))).toEqual([]);
    });

    it('flags a spine text that is too wide and a title outside the safe area', () => {
      const book = makeBook();
      book.cover.ownImageId = 'own';
      book.cover.spineTextHe = 'א'.repeat(900);
      book.cover.titleHe = 'א'.repeat(900);
      const result = codes(book);
      expect(result).toContain('COVER_SPINE_TEXT_TOO_WIDE');
      expect(result).toContain('COVER_TEXT_IN_UNSAFE_AREA');
      expect(result).not.toContain('MISSING_COVER_ILLUSTRATION');
    });

    it('gives a gentle low-resolution notice for the cover picture', () => {
      const book = makeBook();
      book.cover.ownImageId = 'own';
      const report = runPreflight(book, 'colour', new Map([['own', image('own', 300)]]), 'cover');
      const notice = report.issues.find((issue) => issue.code === 'LOW_RESOLUTION');
      expect(notice?.severity).toBe('info');
      expect(notice?.pageRef.kind).toBe('cover');
    });

    it('warns about a cover illustration cropped beyond the threshold', () => {
      const book = makeBook();
      book.cover.illustration.currentImageId = 'cover';
      const cover = image('cover', 3000);
      cover.kind = 'coverIllustration';
      cover.meta.croppedEdgePercent = 4.25;
      expect(
        runPreflight(book, 'colour', new Map([['cover', cover]]), 'cover').issues.map(
          (issue) => issue.code,
        ),
      ).toContain('AI_ASPECT_CROP');
    });

    it('does not add cover issues to the interior report', () => {
      expect(runPreflight(makeBook(), 'colour').issues.map((issue) => issue.code)).not.toContain(
        'MISSING_COVER_ILLUSTRATION',
      );
    });
  });
});
