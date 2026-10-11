// bisiyata dishmaya, leharbot ahava biyisral
import type { BorderStyle } from '@/domain/book';
import { mmToCss } from '@/shared/units';
import { buildBorderShapes } from '../borders';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';

interface BorderLayerProps {
  style: BorderStyle;
  borderRect: Rect;
  /** The canvas (bleed) rectangle in page-local mm; becomes the SVG view box. */
  canvasRect: Rect;
  theme: ResolvedTheme;
}

/** Vector border, sharp at any size. */
export function BorderLayer({ style, borderRect, canvasRect, theme }: BorderLayerProps) {
  const shapes = buildBorderShapes(style, borderRect, theme);
  return (
    <svg
      data-layer="border"
      aria-hidden="true"
      viewBox={`${canvasRect.x} ${canvasRect.y} ${canvasRect.width} ${canvasRect.height}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: mmToCss(canvasRect.width),
        height: mmToCss(canvasRect.height),
      }}
    >
      {shapes.map((shape, i) =>
        shape.kind === 'circle' ? (
          <circle
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={shape.fill ?? 'none'}
            stroke={shape.stroke ?? 'none'}
            strokeWidth={shape.strokeWidthMm}
          />
        ) : (
          <path
            key={i}
            d={shape.d}
            fill={shape.fill ?? 'none'}
            stroke={shape.stroke ?? 'none'}
            strokeWidth={shape.strokeWidthMm}
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
