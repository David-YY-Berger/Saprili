// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook } from '@/domain/factories';
import {
  COVER_BLEED_MM,
  COVER_HEIGHT_MM,
  COVER_HINGE_WIDTH_MM,
  COVER_PANEL_WIDTH_MM,
  COVER_SAFE_INSET_MM,
} from '@/domain/constants';
import {
  computeCoverGeometry,
  computeCoverTextFits,
  fitSpineText,
  getSpineWidthMm,
} from './coverGeometry';
import { FakeTextMeasurer } from './textFit';

const measurer = new FakeTextMeasurer();

function makeBook(bindingSide: 'right' | 'left' = 'right') {
  const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
  book.bindingSide = bindingSide;
  return book;
}

describe('cover geometry', () => {
  it('matches the brief for a 40-page book: 436 x 297 cut, 466 x 327 with bleed', () => {
    const g = computeCoverGeometry(makeBook(), 40);
    expect(g.spineWidthMm).toBe(8);
    expect(g.cutRect).toEqual({ x: 0, y: 0, width: 436, height: 297 });
    expect(g.bleedRect).toEqual({ x: -15, y: -15, width: 466, height: 327 });
    expect(g.hingeRects).toEqual([
      { x: 206, y: 0, width: 8, height: 297 },
      { x: 222, y: 0, width: 8, height: 297 },
    ]);
    expect(g.spineRect).toEqual({ x: 214, y: 0, width: 8, height: 297 });
    expect(COVER_BLEED_MM).toBe(15);
    expect(COVER_PANEL_WIDTH_MM * 2 + COVER_HINGE_WIDTH_MM * 2 + g.spineWidthMm).toBe(436);
    expect(COVER_HEIGHT_MM).toBe(297);
  });

  it('puts the front on the left for right binding and mirrors it for left binding', () => {
    const right = computeCoverGeometry(makeBook('right'), 40);
    const left = computeCoverGeometry(makeBook('left'), 40);
    expect(right.frontSide).toBe('left');
    expect(right.frontPanelRect).toEqual({ x: 0, y: 0, width: 206, height: 297 });
    expect(right.backPanelRect.x).toBe(230);
    expect(left.frontSide).toBe('right');
    expect(left.frontPanelRect.x).toBe(230);
    expect(left.backPanelRect.x).toBe(0);
    // The picture mirrors around the spine's centre line (x = 218).
    const mirrored = 436 - (right.frontPictureRect.x + right.frontPictureRect.width);
    expect(left.frontPictureRect.x).toBeCloseTo(mirrored, 9);
    expect(left.frontPictureRect.width).toBe(right.frontPictureRect.width);
    expect(left.frontPictureRect.height).toBe(right.frontPictureRect.height);
  });

  it('keeps every front item inside the safe inset, away from edges and hinges', () => {
    for (const side of ['right', 'left'] as const) {
      const g = computeCoverGeometry(makeBook(side), 40);
      const safe = g.safeRects.front;
      expect(safe.width).toBe(206 - 2 * COVER_SAFE_INSET_MM);
      for (const rect of [g.titleRect, g.subtitleRect, g.frontPictureRect, g.colouringMarkerRect]) {
        expect(rect.x).toBeGreaterThanOrEqual(safe.x);
        expect(rect.y).toBeGreaterThanOrEqual(safe.y);
        expect(rect.x + rect.width).toBeLessThanOrEqual(safe.x + safe.width + 1e-9);
        expect(rect.y + rect.height).toBeLessThanOrEqual(safe.y + safe.height + 1e-9);
      }
      for (const hinge of g.hingeRects) {
        expect(
          g.frontPictureRect.x + g.frontPictureRect.width <= hinge.x ||
            g.frontPictureRect.x >= hinge.x + hinge.width,
        ).toBe(true);
      }
    }
  });

  it('stacks title, subtitle, picture and marker without overlap', () => {
    const g = computeCoverGeometry(makeBook(), 40);
    expect(g.titleRect.y + g.titleRect.height).toBeLessThanOrEqual(g.subtitleRect.y);
    expect(g.subtitleRect.y + g.subtitleRect.height).toBeLessThanOrEqual(g.frontPictureRect.y);
    expect(g.frontPictureRect.y + g.frontPictureRect.height).toBeLessThanOrEqual(
      g.colouringMarkerRect.y,
    );
    expect(g.frontPictureRect.width).toBe(168);
    expect(g.frontPictureRect.height).toBe(181);
  });

  it('keeps spine text inside the spine, clear of the hinges and the safe inset', () => {
    const g = computeCoverGeometry(makeBook(), 40);
    expect(g.spineTextRect.x).toBeGreaterThanOrEqual(g.spineRect.x);
    expect(g.spineTextRect.x + g.spineTextRect.width).toBeLessThanOrEqual(
      g.spineRect.x + g.spineRect.width,
    );
    expect(g.spineTextRect.y).toBe(COVER_SAFE_INSET_MM);
    expect(g.spineTextRect.height).toBe(297 - 2 * COVER_SAFE_INSET_MM);
  });

  it('reads the spine width from the table and derives the page count from the book', () => {
    expect(getSpineWidthMm(2)).toBe(8);
    expect(getSpineWidthMm(40)).toBe(8);
    expect(getSpineWidthMm(60)).toBe(8);
    expect(computeCoverGeometry(makeBook()).spineWidthMm).toBe(8);
  });
});

describe('cover text fitting', () => {
  it('fits the default title, subtitle and marker without overflow', () => {
    const book = makeBook();
    const fits = computeCoverTextFits(book, computeCoverGeometry(book), measurer);
    expect(fits.title.overflow).toBe(false);
    expect(fits.subtitle.overflow).toBe(false);
    expect(fits.marker.overflow).toBe(false);
  });

  it('flags a title that cannot fit instead of cutting it', () => {
    const book = makeBook();
    book.cover.titleHe = 'א'.repeat(900);
    expect(computeCoverTextFits(book, computeCoverGeometry(book), measurer).title.overflow).toBe(
      true,
    );
  });

  it('fits the default spine text and shrinks, then warns, for long text', () => {
    const fits = fitSpineText('משפחת ברגר 5787', 8, 'hebrew-default', { measurer });
    expect(fits.fits).toBe(true);
    expect(fits.fontSizePt).toBeLessThanOrEqual(14);
    const long = fitSpineText('א'.repeat(900), 8, 'hebrew-default', { measurer });
    expect(long.fits).toBe(false);
    expect(long.fontSizePt).toBe(6);
  });

  it('warns when the spine is too thin for any text size', () => {
    expect(fitSpineText('שלום', 2, 'hebrew-default', { measurer }).fits).toBe(false);
    expect(fitSpineText('', 2, 'hebrew-default', { measurer }).fits).toBe(true);
  });
});
