// bisiyata dishmaya, leharbot ahava biyisral
import type { CSSProperties } from 'react';
import { mmToCss } from '@/shared/units';
import type { Rect } from '../geometry';

/** Absolute position for a page-local rectangle; the sheet's canvas origin is the bleed corner. */
export function rectStyle(rect: Rect, bleedMm: number): CSSProperties {
  return {
    position: 'absolute',
    left: mmToCss(rect.x + bleedMm),
    top: mmToCss(rect.y + bleedMm),
    width: mmToCss(rect.width),
    height: mmToCss(rect.height),
  };
}
