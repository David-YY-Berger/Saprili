// bisiyata dishmaya, leharbot ahava biyisral
import { mmToCss } from '@/shared/units';
import type { RectMm } from './printJob';

export interface CropMarkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function computeCropMarkSegments(
  trimRect: RectMm,
  bleedMm: number,
  offsetMm: number,
  lengthMm: number,
): CropMarkSegment[] {
  const { x, y, width, height } = trimRect;
  const gap = bleedMm + offsetMm;
  const far = gap + lengthMm;
  return [
    { x1: x - far, y1: y, x2: x - gap, y2: y },
    { x1: x, y1: y - far, x2: x, y2: y - gap },
    { x1: x + width + gap, y1: y, x2: x + width + far, y2: y },
    { x1: x + width, y1: y - far, x2: x + width, y2: y - gap },
    { x1: x - far, y1: y + height, x2: x - gap, y2: y + height },
    { x1: x, y1: y + height + gap, x2: x, y2: y + height + far },
    { x1: x + width + gap, y1: y + height, x2: x + width + far, y2: y + height },
    { x1: x + width, y1: y + height + gap, x2: x + width, y2: y + height + far },
  ];
}

export function CropMarks({
  trimRect,
  bleedMm,
  offsetMm,
  lengthMm,
  strokeMm,
  sheetSizeMm,
}: {
  trimRect: RectMm;
  bleedMm: number;
  offsetMm: number;
  lengthMm: number;
  strokeMm: number;
  sheetSizeMm: { widthMm: number; heightMm: number };
}) {
  const segments = computeCropMarkSegments(trimRect, bleedMm, offsetMm, lengthMm);
  return (
    <svg
      aria-hidden="true"
      className="print-crop-marks"
      viewBox={`0 0 ${sheetSizeMm.widthMm} ${sheetSizeMm.heightMm}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: mmToCss(sheetSizeMm.widthMm),
        height: mmToCss(sheetSizeMm.heightMm),
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {segments.map((segment, index) => (
        <line
          key={index}
          x1={segment.x1}
          x2={segment.x2}
          y1={segment.y1}
          y2={segment.y2}
          stroke="#000"
          strokeWidth={strokeMm}
        />
      ))}
    </svg>
  );
}
