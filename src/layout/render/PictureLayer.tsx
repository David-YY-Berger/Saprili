// bisiyata dishmaya, leharbot ahava biyisral
import { mmToCss } from '@/shared/units';
import type { Rect } from '../geometry';
import { PICTURE_CORNER_RADIUS_MM, PICTURE_FRAME_STROKE_MM } from '../specs';
import type { ResolvedTheme } from '../theme';
import { rectStyle } from './layerStyle';

interface PictureLayerProps {
  rect: Rect;
  bleedMm: number;
  imageUrl: string | null;
  theme: ResolvedTheme;
  /** Photos are never cropped; illustrations already have the exact shape. */
  fit?: 'contain' | 'cover';
}

/** Rounded, thinly framed picture. A missing image prints as an empty frame. */
export function PictureLayer({
  rect,
  bleedMm,
  imageUrl,
  theme,
  fit = 'contain',
}: PictureLayerProps) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return (
    <div
      data-layer="picture"
      data-empty={imageUrl ? undefined : 'true'}
      style={{
        ...rectStyle(rect, bleedMm),
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: mmToCss(PICTURE_CORNER_RADIUS_MM),
        border: `${mmToCss(PICTURE_FRAME_STROKE_MM)} solid ${theme.frameColor}`,
        background: theme.outline ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{ display: 'block', width: '100%', height: '100%', objectFit: fit }}
        />
      )}
    </div>
  );
}
