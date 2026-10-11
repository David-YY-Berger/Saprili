// bisiyata dishmaya, leharbot ahava biyisral
import type { TypographySettings } from '@/domain/book';
import { getFontFamilyCss } from '../fontRegistry';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';
import { rectStyle } from './layerStyle';

interface PageNumberLayerProps {
  rect: Rect;
  bleedMm: number;
  pageNumber: number;
  typography: TypographySettings;
  theme: ResolvedTheme;
}

export function PageNumberLayer({
  rect,
  bleedMm,
  pageNumber,
  typography,
  theme,
}: PageNumberLayerProps) {
  return (
    <div
      data-layer="page-number"
      style={{
        ...rectStyle(rect, bleedMm),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: getFontFamilyCss(typography.englishFontId),
        fontSize: '10pt',
        fontWeight: 700,
        color: theme.textColor,
      }}
    >
      {pageNumber}
    </div>
  );
}
