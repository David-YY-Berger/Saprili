// bisiyata dishmaya, leharbot ahava biyisral
import { mmToCss } from '@/shared/units';
import { getFontFamilyCss } from '../fontRegistry';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';
import type { TextFitResult } from '../textFit';
import { TEXT_LINE_HEIGHT } from '../textFit';
import { rectStyle } from './layerStyle';

/** Small Hebrew label on the front of the colouring-book cover. */
export function ColouringMarker({
  rect,
  bleedMm,
  text,
  fit,
  fontId,
  theme,
}: {
  rect: Rect;
  bleedMm: number;
  text: string;
  fit: TextFitResult;
  fontId: string;
  theme: ResolvedTheme;
}) {
  if (!text.trim()) return null;
  return (
    <div
      data-layer="colouring-marker"
      dir="rtl"
      lang="he"
      style={{
        ...rectStyle(rect, bleedMm),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: mmToCss(rect.height / 2),
        border: `${mmToCss(0.6)} solid ${theme.textColor}`,
        background: 'rgba(255,255,255,0.8)',
        color: theme.textColor,
        fontFamily: getFontFamilyCss(fontId),
        fontWeight: 700,
        fontSize: `${fit.fontSizePt}pt`,
        lineHeight: TEXT_LINE_HEIGHT.rtl,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}
