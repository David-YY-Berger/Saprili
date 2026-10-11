// bisiyata dishmaya, leharbot ahava biyisral
import type { BorderStyle } from '@/domain/book';
import { BORDER_BAND_MM } from './specs';
import type { Rect } from './geometry';
import type { ResolvedTheme } from './theme';

export type BorderShape =
  | {
      kind: 'path';
      d: string;
      fill: string | null;
      stroke: string | null;
      strokeWidthMm: number;
    }
  | {
      kind: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill: string | null;
      stroke: string | null;
      strokeWidthMm: number;
    };

interface Point {
  x: number;
  y: number;
}

const OUTLINE_STROKE_MM = 0.5;
const SOFT_STROKE_MM = 0.4;

const n = (v: number): number => Number(v.toFixed(3));

/** Evenly spaced points along the rectangle's outline, corners included. */
export function perimeterPoints(rect: Rect, spacingMm: number): Point[] {
  const { x, y, width: w, height: h } = rect;
  const sides: [Point, Point][] = [
    [
      { x, y },
      { x: x + w, y },
    ],
    [
      { x: x + w, y },
      { x: x + w, y: y + h },
    ],
    [
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    [
      { x, y: y + h },
      { x, y },
    ],
  ];
  const points: Point[] = [];
  for (const [a, b] of sides) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.round(length / spacingMm));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return points;
}

function roundedRectPath(rect: Rect, radius: number): string {
  const { x, y, width: w, height: h } = rect;
  const r = Math.min(radius, w / 2, h / 2);
  return [
    `M ${n(x + r)} ${n(y)}`,
    `H ${n(x + w - r)}`,
    `A ${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}`,
    `V ${n(y + h - r)}`,
    `A ${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}`,
    `H ${n(x + r)}`,
    `A ${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}`,
    `V ${n(y + r)}`,
    `A ${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}`,
    'Z',
  ].join(' ');
}

/** Closed half-discs sitting on the outline, bulging inward. */
function scallopPaths(rect: Rect, diameter: number): string[] {
  const { x, y, width: w, height: h } = rect;
  const paths: string[] = [];
  const sides: { from: Point; to: Point; length: number }[] = [
    { from: { x, y }, to: { x: x + w, y }, length: w },
    { from: { x: x + w, y }, to: { x: x + w, y: y + h }, length: h },
    { from: { x: x + w, y: y + h }, to: { x, y: y + h }, length: w },
    { from: { x, y: y + h }, to: { x, y }, length: h },
  ];
  for (const { from, to, length } of sides) {
    const count = Math.max(1, Math.round(length / diameter));
    const r = length / count / 2;
    for (let i = 0; i < count; i++) {
      const a = {
        x: from.x + ((to.x - from.x) * i) / count,
        y: from.y + ((to.y - from.y) * i) / count,
      };
      const b = {
        x: from.x + ((to.x - from.x) * (i + 1)) / count,
        y: from.y + ((to.y - from.y) * (i + 1)) / count,
      };
      // Sweep 0 bulges toward the inside when walking the outline clockwise on screen.
      paths.push(`M ${n(a.x)} ${n(a.y)} A ${n(r)} ${n(r)} 0 0 0 ${n(b.x)} ${n(b.y)} Z`);
    }
  }
  return paths;
}

function starPath(center: Point, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${n(center.x + radius * Math.cos(angle))} ${n(center.y + radius * Math.sin(angle))}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function paint(theme: ResolvedTheme, index: number) {
  if (theme.outline) {
    return { fill: null, stroke: theme.frameColor, strokeWidthMm: OUTLINE_STROKE_MM };
  }
  const colour = theme.accents[index % theme.accents.length] ?? theme.textColor;
  return { fill: colour, stroke: null, strokeWidthMm: 0 };
}

function scalloped(rect: Rect, theme: ResolvedTheme): BorderShape[] {
  const shapes: BorderShape[] = scallopPaths(rect, BORDER_BAND_MM).map((d, i) => ({
    kind: 'path',
    d,
    ...paint(theme, i),
  }));
  shapes.push({
    kind: 'path',
    d: roundedRectPath(inset(rect, BORDER_BAND_MM / 2 + 1.2), 2),
    fill: null,
    stroke: theme.outline ? theme.frameColor : (theme.accents[1] ?? theme.textColor),
    strokeWidthMm: theme.outline ? OUTLINE_STROKE_MM : SOFT_STROKE_MM,
  });
  return shapes;
}

function inset(rect: Rect, by: number): Rect {
  return {
    x: rect.x + by,
    y: rect.y + by,
    width: rect.width - 2 * by,
    height: rect.height - 2 * by,
  };
}

function dotted(rect: Rect, theme: ResolvedTheme): BorderShape[] {
  const centre = inset(rect, BORDER_BAND_MM / 2);
  return perimeterPoints(centre, 4.5).map((p, i) => ({
    kind: 'circle',
    cx: n(p.x),
    cy: n(p.y),
    r: theme.outline ? 1.5 : 1.2,
    ...paint(theme, i),
  }));
}

function clouds(rect: Rect, theme: ResolvedTheme): BorderShape[] {
  const centre = inset(rect, BORDER_BAND_MM / 2);
  const bigR = BORDER_BAND_MM * 0.38;
  const smallR = BORDER_BAND_MM * 0.25;
  const white = theme.outline ? '#FFFFFF' : theme.panelColor;
  const stroke = theme.outline ? theme.frameColor : (theme.accents[0] ?? theme.textColor);
  const strokeWidthMm = theme.outline ? OUTLINE_STROKE_MM : SOFT_STROKE_MM;
  const big = perimeterPoints(centre, bigR * 2.2);
  const small = perimeterPoints(centre, bigR * 2.2).map((p, i, all) => {
    const next = all[(i + 1) % all.length]!;
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
  });
  const circle = (p: Point, r: number): BorderShape => ({
    kind: 'circle',
    cx: n(p.x),
    cy: n(p.y),
    r: n(r),
    fill: white,
    stroke,
    strokeWidthMm,
  });
  return [...small.map((p) => circle(p, smallR)), ...big.map((p) => circle(p, bigR))];
}

function stars(rect: Rect, theme: ResolvedTheme): BorderShape[] {
  const centre = inset(rect, BORDER_BAND_MM / 2);
  return perimeterPoints(centre, 7).map((p, i) => ({
    kind: 'path',
    d: starPath(p, theme.outline ? 3 : 2.6, theme.outline ? 1.3 : 1.1),
    ...paint(theme, i),
  }));
}

/** Vector shapes in page-local mm. No raster images are involved. */
export function buildBorderShapes(
  style: BorderStyle,
  borderRect: Rect,
  theme: ResolvedTheme,
): BorderShape[] {
  switch (style) {
    case 'scalloped':
      return scalloped(borderRect, theme);
    case 'dotted':
      return dotted(borderRect, theme);
    case 'clouds':
      return clouds(borderRect, theme);
    case 'stars':
      return stars(borderRect, theme);
  }
}
