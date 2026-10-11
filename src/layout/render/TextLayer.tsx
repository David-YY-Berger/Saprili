// bisiyata dishmaya, leharbot ahava biyisral
import type { TypographySettings } from '@/domain/book';
import { mmToCss } from '@/shared/units';
import { getFontFamilyCss } from '../fontRegistry';
import type { Rect } from '../geometry';
import { TEXT_ZONE_PADDING_MM } from '../specs';
import type { ResolvedTheme } from '../theme';
import { TEXT_LINE_HEIGHT, type PageTexts, type TextFitResult } from '../textFit';
import { rectStyle } from './layerStyle';

interface TextLayerProps {
  rect: Rect;
  bleedMm: number;
  texts: PageTexts;
  typography: TypographySettings;
  theme: ResolvedTheme;
  fit: TextFitResult;
}

/** Hebrew block above the English block, each in its own font. Text is never cut. */
export function TextLayer({ rect, bleedMm, texts, typography, theme, fit }: TextLayerProps) {
  const he = texts.textHe.trim();
  const en = texts.textEn.trim();
  if (rect.width <= 0 || rect.height <= 0 || (!he && !en)) return null;

  const common = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    fontSize: `${fit.fontSizePt}pt`,
    textAlign: typography.alignment === 'center' ? 'center' : 'start',
    color: theme.textColor,
  } as const;

  return (
    <div
      data-layer="text"
      data-overflow={fit.overflow ? 'true' : undefined}
      data-font-size-pt={fit.fontSizePt}
      style={{
        ...rectStyle(rect, bleedMm),
        boxSizing: 'border-box',
        padding: mmToCss(TEXT_ZONE_PADDING_MM),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: mmToCss(he && en ? typography.hebrewEnglishSpacingMm : 0),
        borderRadius: mmToCss(4),
        background: theme.showTextPanel ? theme.panelColor : 'transparent',
        // Overflow is flagged by pre-flight; it must stay visible rather than be cut.
        overflow: 'visible',
      }}
    >
      {he && (
        <div
          dir="rtl"
          lang="he"
          style={{
            ...common,
            fontFamily: getFontFamilyCss(typography.hebrewFontId),
            lineHeight: TEXT_LINE_HEIGHT.rtl,
          }}
        >
          {he}
        </div>
      )}
      {en && (
        <div
          dir="ltr"
          lang="en"
          style={{
            ...common,
            fontFamily: getFontFamilyCss(typography.englishFontId),
            lineHeight: TEXT_LINE_HEIGHT.ltr,
          }}
        >
          {en}
        </div>
      )}
    </div>
  );
}
