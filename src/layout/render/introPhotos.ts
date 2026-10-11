// bisiyata dishmaya, leharbot ahava biyisral
import type { IntroPhotoLayout } from '@/domain/page';
import type { Rect } from '../geometry';

export const INTRO_COLLAGE_MAX = 4;
export const INTRO_COLLAGE_GAP_MM = 3;

/** How many photos the intro actually prints. */
export function getIntroPhotoCount(photoCount: number, mode: IntroPhotoLayout): number {
  if (photoCount <= 0) return 0;
  return mode === 'firstLarge' ? 1 : Math.min(photoCount, INTRO_COLLAGE_MAX);
}

function split(rect: Rect, direction: 'horizontal' | 'vertical', first: number, gap: number) {
  if (direction === 'horizontal') {
    const firstWidth = (rect.width - gap) * first;
    return [
      { ...rect, width: firstWidth },
      { ...rect, x: rect.x + firstWidth + gap, width: rect.width - firstWidth - gap },
    ] as const;
  }
  const firstHeight = (rect.height - gap) * first;
  return [
    { ...rect, height: firstHeight },
    { ...rect, y: rect.y + firstHeight + gap, height: rect.height - firstHeight - gap },
  ] as const;
}

/**
 * Cells for the intro photos inside the picture rectangle.
 * First large: one photo fills the zone. Collage: 1 to 4 photos in a grid.
 */
export function computeIntroPhotoLayout(
  photoCount: number,
  mode: IntroPhotoLayout,
  pictureRect: Rect,
  gapMm = INTRO_COLLAGE_GAP_MM,
): Rect[] {
  const count = getIntroPhotoCount(photoCount, mode);
  if (count <= 1) return count === 1 ? [pictureRect] : [];
  // Split along the longer side so cells stay close to the photo shapes.
  const direction = pictureRect.width >= pictureRect.height ? 'horizontal' : 'vertical';
  const cross = direction === 'horizontal' ? 'vertical' : 'horizontal';
  if (count === 2) return [...split(pictureRect, direction, 0.5, gapMm)];
  if (count === 3) {
    const [large, rest] = split(pictureRect, cross, 0.5, gapMm);
    return [large, ...split(rest, direction, 0.5, gapMm)];
  }
  const [a, b] = split(pictureRect, cross, 0.5, gapMm);
  return [...split(a, direction, 0.5, gapMm), ...split(b, direction, 0.5, gapMm)];
}
