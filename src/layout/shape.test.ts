// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { fixedClock } from '@/shared/clock';
import { computePageGeometry } from './geometry';
import {
  ensureBookShape,
  getCoverPictureZoneSpec,
  getPictureZoneSpec,
  recomputeBookShape,
} from './shape';
import { FakeTextMeasurer } from './textFit';

const NOW = '2026-01-01T00:00:00.000Z';
const measurer = new FakeTextMeasurer();
const clock = fixedClock('2026-02-02T00:00:00.000Z');

function makeBook() {
  const book = createEmptyBook({ nowIso: NOW });
  book.storyPages = [
    createStoryPage({ id: 'a', textEn: 'x'.repeat(630), textHe: 'א'.repeat(63) }),
    createStoryPage({ id: 'b', textEn: 'short' }),
  ];
  return book;
}

describe('ensureBookShape', () => {
  it('computes the shape once from the real texts', () => {
    const book = makeBook();
    const shaped = ensureBookShape(book, measurer, clock);
    expect(book.shape).toBeNull();
    expect(shaped.shape).not.toBeNull();
    const zone = shaped.shape!.textZoneHeightMm;
    expect(zone).toBeCloseTo(10 * 14 * (25.4 / 72) * 1.35 + 14 * (25.4 / 72) * 1.5 + 3 + 6, 3);
    // Picture area at default margins: 163 wide, 247 - zone - 5 (gap) tall.
    expect(shaped.shape!.pictureAspect).toBeCloseTo(163 / (247 - zone - 5), 6);
    expect(shaped.shape!.computedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('never changes an existing shape, even when texts change', () => {
    const shaped = ensureBookShape(makeBook(), measurer, clock);
    shaped.storyPages[0]!.textEn = 'x'.repeat(2000);
    clock.set('2027-01-01T00:00:00.000Z');
    expect(ensureBookShape(shaped, measurer, clock)).toBe(shaped);
    expect(shaped.shape!.computedAt).toBe('2026-02-02T00:00:00.000Z');
  });
});

describe('recomputeBookShape', () => {
  it('replaces the shape on explicit request', () => {
    const shaped = ensureBookShape(makeBook(), measurer, clock);
    shaped.storyPages[0]!.textEn = 'x'.repeat(2000);
    const next = recomputeBookShape(shaped, measurer, fixedClock('2028-01-01T00:00:00.000Z'));
    expect(next.shape!.textZoneHeightMm).toBeGreaterThan(shaped.shape!.textZoneHeightMm);
    expect(next.shape!.computedAt).toBe('2028-01-01T00:00:00.000Z');
  });
});

describe('picture zone', () => {
  it('keeps the aspect when margins change, and shrinks the zone evenly', () => {
    const book = ensureBookShape(makeBook(), measurer, clock);
    const before = getPictureZoneSpec(book);
    const wider = { ...book, layout: { ...book.layout, marginOuterMm: 25, marginTopMm: 20 } };
    const after = getPictureZoneSpec(wider);
    expect(before.aspect).toBe(book.shape!.pictureAspect);
    expect(after.aspect).toBe(before.aspect);
    expect(after.widthMm / after.heightMm).toBeCloseTo(before.aspect, 6);
    expect(after.widthMm).toBeLessThan(before.widthMm);
  });

  it('matches the rectangle the renderer uses', () => {
    const book = ensureBookShape(makeBook(), measurer, clock);
    const spec = getPictureZoneSpec(book);
    const g = computePageGeometry(book, { kind: 'story', id: 'a' }, 'left');
    expect(g.pictureRect.width).toBeCloseTo(spec.widthMm, 6);
    expect(g.pictureRect.height).toBeCloseTo(spec.heightMm, 6);
  });

  it('gives a provisional answer before the shape exists, and a cover stub', () => {
    const book = makeBook();
    expect(getPictureZoneSpec(book).aspect).toBeGreaterThan(0);
    const cover = getCoverPictureZoneSpec(book);
    expect(cover.aspect).toBeCloseTo(cover.widthMm / cover.heightMm, 9);
  });
});
