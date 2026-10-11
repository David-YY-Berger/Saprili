// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createIntroPage, createStoryPage } from '@/domain/factories';
import { buildSpreads } from '@/domain/spreads';
import {
  clampLayoutSettings,
  computePageGeometry,
  computePictureRect,
  insetRect,
  unionRects,
  type PageSide,
  type Rect,
} from './geometry';
import { getPrintSpec } from './specs';

const NOW = '2026-01-01T00:00:00.000Z';

function makeBook(storyCount = 2) {
  const book = createEmptyBook({ nowIso: NOW });
  book.intro = createIntroPage({ id: 'intro' });
  book.storyPages = Array.from({ length: storyCount }, (_, i) => createStoryPage({ id: `s${i}` }));
  return book;
}

const story = { kind: 'story', id: 's0' } as const;
const right = (r: Rect) => r.x + r.width;

describe('getPrintSpec', () => {
  it('merges constants and book settings', () => {
    const book = makeBook();
    book.print.sheetMode = 'centredA4';
    expect(getPrintSpec(book)).toEqual({
      trim: { widthMm: 206, heightMm: 291 },
      bleedMm: 3,
      safeFloorMm: 10,
      sheetMode: 'centredA4',
      cropMark: { lengthMm: 5, offsetMm: 3, strokeMm: 0.25 },
    });
  });
});

describe('rect helpers', () => {
  it('insets by one number or per edge, and never goes negative', () => {
    expect(insetRect({ x: 0, y: 0, width: 10, height: 20 }, 2)).toEqual({
      x: 2,
      y: 2,
      width: 6,
      height: 16,
    });
    expect(insetRect({ x: 0, y: 0, width: 10, height: 20 }, { left: 3 })).toEqual({
      x: 3,
      y: 0,
      width: 7,
      height: 20,
    });
    expect(insetRect({ x: 0, y: 0, width: 4, height: 4 }, 5).width).toBe(0);
    expect(insetRect({ x: 0, y: 0, width: 10, height: 10 }, -3)).toEqual({
      x: -3,
      y: -3,
      width: 16,
      height: 16,
    });
  });

  it('unions rectangles', () => {
    expect(
      unionRects([
        { x: 0, y: 0, width: 5, height: 5 },
        { x: 10, y: 2, width: 5, height: 20 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 15, height: 22 });
    expect(unionRects([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('clampLayoutSettings', () => {
  it('raises values below the floor and reports them', () => {
    const book = makeBook();
    const input = { ...book.layout, marginTopMm: 4, gutterMm: 9, pictureTextGapMm: -1 };
    const { settings, clamped } = clampLayoutSettings(input);
    expect(settings).toMatchObject({
      marginTopMm: 10,
      gutterMm: 10,
      marginOuterMm: 10,
      pictureTextGapMm: 0,
    });
    expect(clamped).toEqual(['marginTopMm', 'gutterMm', 'pictureTextGapMm']);
    expect(input.marginTopMm).toBe(4);
  });

  it('leaves valid settings alone and handles NaN', () => {
    const book = makeBook();
    expect(clampLayoutSettings(book.layout).clamped).toEqual([]);
    expect(clampLayoutSettings({ ...book.layout, marginOuterMm: NaN }).settings.marginOuterMm).toBe(
      10,
    );
  });
});

describe('computePageGeometry (hand-calculated, 206 x 291, defaults)', () => {
  it('right-hand page: gutter on the left edge', () => {
    const g = computePageGeometry(makeBook(), story, 'right');
    expect(g.trimRect).toEqual({ x: 0, y: 0, width: 206, height: 291 });
    expect(g.bleedRect).toEqual({ x: -3, y: -3, width: 212, height: 297 });
    expect(g.safeRect).toEqual({ x: 15, y: 10, width: 181, height: 271 });
    expect(g.borderRect).toEqual(g.safeRect);
    expect(g.contentRect).toEqual({ x: 24, y: 19, width: 163, height: 253 });
  });

  it('left-hand page: gutter on the right edge', () => {
    const g = computePageGeometry(makeBook(), story, 'left');
    expect(g.safeRect).toEqual({ x: 10, y: 10, width: 181, height: 271 });
    expect(g.contentRect).toEqual({ x: 19, y: 19, width: 163, height: 253 });
  });

  it('splits content into picture, text and page number with the provisional text zone', () => {
    const g = computePageGeometry(makeBook(), story, 'right');
    expect(g.pageNumberRect).toEqual({ x: 24, y: 266, width: 163, height: 6 });
    expect(g.textRect).toEqual({ x: 24, y: 206, width: 163, height: 60 });
    // Picture area is 163 x 182 and the default aspect is exactly that.
    expect(g.pictureRect.x).toBeCloseTo(24);
    expect(g.pictureRect.y).toBeCloseTo(19);
    expect(g.pictureRect.width).toBeCloseTo(163);
    expect(g.pictureRect.height).toBeCloseTo(182);
  });

  it.each(['right', 'left'] as const)(
    'keeps the spine-side margin on the inner edge (%s binding)',
    (binding) => {
      const book = makeBook(6);
      book.bindingSide = binding;
      for (const spread of buildSpreads(book)) {
        for (const side of ['left', 'right'] as PageSide[]) {
          const ref = spread[side];
          if (!ref) continue;
          const g = computePageGeometry(book, ref, side);
          if (side === 'left') expect(206 - right(g.safeRect)).toBe(book.layout.gutterMm);
          else expect(g.safeRect.x).toBe(book.layout.gutterMm);
        }
      }
    },
  );

  it('puts the intro on the left and the colophon on the right for a right-opening book', () => {
    const book = makeBook(2);
    const spreads = buildSpreads(book);
    const introSpread = spreads[0]!;
    const colophonSpread = spreads.at(-1)!;
    expect(introSpread.left?.kind).toBe('intro');
    expect(computePageGeometry(book, introSpread.left!, 'left').safeRect.x).toBe(10);
    expect(colophonSpread.right?.kind).toBe('colophon');
    expect(computePageGeometry(book, colophonSpread.right!, 'right').safeRect.x).toBe(15);
  });

  it('never goes inside the safe floor on any edge', () => {
    const book = makeBook();
    for (const side of ['left', 'right'] as const) {
      const g = computePageGeometry(book, story, side);
      expect(g.safeRect.x).toBeGreaterThanOrEqual(10);
      expect(g.safeRect.y).toBeGreaterThanOrEqual(10);
      expect(206 - right(g.safeRect)).toBeGreaterThanOrEqual(10);
      expect(291 - (g.safeRect.y + g.safeRect.height)).toBeGreaterThanOrEqual(10);
      for (const r of [g.pictureRect, g.textRect, g.pageNumberRect]) {
        expect(r.x).toBeGreaterThanOrEqual(g.safeRect.x);
        expect(right(r)).toBeLessThanOrEqual(right(g.safeRect) + 1e-9);
      }
    }
  });
});

describe('computePictureRect', () => {
  it('scales uniformly and keeps the aspect', () => {
    const aspect = 0.9;
    const big = computePictureRect({ x: 0, y: 0, width: 163, height: 182 }, aspect);
    const small = computePictureRect({ x: 0, y: 0, width: 143, height: 162 }, aspect);
    expect(big.width / big.height).toBeCloseTo(aspect);
    expect(small.width / small.height).toBeCloseTo(aspect);
    expect(small.width).toBeLessThan(big.width);
    expect(small.height).toBeLessThan(big.height);
  });

  it('centres inside the area and fits whichever side is tighter', () => {
    const r = computePictureRect({ x: 10, y: 10, width: 100, height: 40 }, 1);
    expect(r).toEqual({ x: 40, y: 10, width: 40, height: 40 });
  });

  it('returns an empty rectangle for a degenerate area or aspect', () => {
    expect(computePictureRect({ x: 0, y: 0, width: 0, height: 10 }, 1).width).toBe(0);
    expect(computePictureRect({ x: 0, y: 0, width: 10, height: 10 }, 0).height).toBe(0);
  });
});
