// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook } from '@/domain/factories';
import type { BorderStyle } from '@/domain/book';
import { buildBorderShapes, perimeterPoints } from './borders';
import { THEME_PRESETS, resolveTheme } from './theme';

const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
const rect = { x: 15, y: 10, width: 181, height: 271 };
const STYLES: BorderStyle[] = ['scalloped', 'dotted', 'clouds', 'stars'];

describe('resolveTheme', () => {
  it('uses the sky preset by default, with a coloured background', () => {
    const t = resolveTheme(book, 'colour');
    expect(t.background).toBe(THEME_PRESETS.sky.background);
    expect(t.background).not.toBe('#FFFFFF');
    expect(t.outline).toBe(false);
    expect(t.showTextPanel).toBe(false);
  });

  it('follows the chosen preset and the panel switch', () => {
    const t = resolveTheme(
      { ...book, theme: { ...book.theme, presetId: 'peach', textPanel: true } },
      'colour',
    );
    expect(t.background).toBe(THEME_PRESETS.peach.background);
    expect(t.showTextPanel).toBe(true);
  });

  it('colouring edition is white with black outlines and no panel', () => {
    const t = resolveTheme({ ...book, theme: { ...book.theme, textPanel: true } }, 'colouring');
    expect(t).toMatchObject({
      background: '#FFFFFF',
      outline: true,
      showTextPanel: false,
      textColor: '#000000',
    });
  });

  it('offers the four presets', () => {
    expect(Object.keys(THEME_PRESETS).sort()).toEqual(['lavender', 'mint', 'peach', 'sky']);
  });
});

describe('perimeterPoints', () => {
  it('stays on the outline, includes the corners and is evenly spaced', () => {
    const points = perimeterPoints({ x: 0, y: 0, width: 20, height: 10 }, 5);
    expect(points).toContainEqual({ x: 0, y: 0 });
    expect(points).toContainEqual({ x: 20, y: 0 });
    expect(points).toContainEqual({ x: 20, y: 10 });
    expect(points).toContainEqual({ x: 0, y: 10 });
    for (const p of points) {
      const onEdge = p.x === 0 || p.x === 20 || p.y === 0 || p.y === 10;
      expect(onEdge).toBe(true);
    }
    expect(points).toHaveLength(4 + 2 + 4 + 2);
  });
});

describe.each(STYLES)('buildBorderShapes: %s', (style) => {
  it('produces vector shapes inside the border rectangle', () => {
    const shapes = buildBorderShapes(style, rect, resolveTheme(book, 'colour'));
    expect(shapes.length).toBeGreaterThan(10);
    for (const s of shapes) {
      if (s.kind === 'circle') {
        expect(s.cx - s.r).toBeGreaterThanOrEqual(rect.x - 0.01);
        expect(s.cx + s.r).toBeLessThanOrEqual(rect.x + rect.width + 0.01);
        expect(s.cy - s.r).toBeGreaterThanOrEqual(rect.y - 0.01);
        expect(s.cy + s.r).toBeLessThanOrEqual(rect.y + rect.height + 0.01);
      } else {
        expect(s.d.startsWith('M')).toBe(true);
      }
    }
  });

  it('uses palette colours only in the colour edition', () => {
    const theme = resolveTheme(book, 'colour');
    const allowed = new Set<string>([...theme.accents, theme.panelColor, theme.textColor]);
    for (const s of buildBorderShapes(style, rect, theme)) {
      for (const c of [s.fill, s.stroke]) if (c) expect(allowed.has(c)).toBe(true);
    }
  });

  it('draws only black outlines in the colouring edition', () => {
    for (const s of buildBorderShapes(style, rect, resolveTheme(book, 'colouring'))) {
      expect(s.stroke).toBe('#000000');
      expect(s.strokeWidthMm).toBeGreaterThan(0);
      expect([null, '#FFFFFF']).toContain(s.fill);
    }
  });
});
