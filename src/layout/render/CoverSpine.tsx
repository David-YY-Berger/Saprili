// bisiyata dishmaya, leharbot ahava biyisral
import { mmToCss } from '@/shared/units';
import { getFontFamilyCss } from '../fontRegistry';
import { SPINE_TEXT_ROTATION_DEG, type CoverGeometry, type SpineTextFit } from '../coverGeometry';
import type { ResolvedTheme } from '../theme';
import { TEXT_LINE_HEIGHT } from '../textFit';
import { rectStyle } from './layerStyle';

/** Single line of Hebrew rotated along the spine. */
export function CoverSpine({
  geometry,
  bleedMm,
  text,
  fit,
  fontId,
  theme,
}: {
  geometry: CoverGeometry;
  bleedMm: number;
  text: string;
  fit: SpineTextFit;
  fontId: string;
  theme: ResolvedTheme;
}) {
  const rect = geometry.spineTextRect;
  if (!text.trim() || rect.width <= 0 || rect.height <= 0) return null;
  return (
    <div
      data-layer="spine"
      data-overflow={fit.fits ? undefined : 'true'}
      style={{ ...rectStyle(rect, bleedMm), overflow: 'visible' }}
    >
      <div
        dir="rtl"
        lang="he"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: mmToCss(rect.height),
          height: mmToCss(rect.width),
          transform: `translate(-50%, -50%) rotate(${SPINE_TEXT_ROTATION_DEG}deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          fontFamily: getFontFamilyCss(fontId),
          fontWeight: 700,
          fontSize: `${fit.fontSizePt}pt`,
          lineHeight: TEXT_LINE_HEIGHT.rtl,
          color: theme.textColor,
        }}
      >
        {text}
      </div>
    </div>
  );
}
