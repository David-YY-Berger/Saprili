// bisiyata dishmaya, leharbot ahava biyisral
import type { IntroPhotoLayout } from '@/domain/page';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';
import { computeIntroPhotoLayout } from './introPhotos';
import { PictureLayer } from './PictureLayer';

export { computeIntroPhotoLayout } from './introPhotos';

interface IntroPhotoLayerProps {
  pictureRect: Rect;
  bleedMm: number;
  layout: IntroPhotoLayout;
  /** One URL per original photo, in order; null while still loading. */
  photoUrls: (string | null)[];
  theme: ResolvedTheme;
}

/** The intro prints the original photos as they are, in both editions. */
export function IntroPhotoLayer({
  pictureRect,
  bleedMm,
  layout,
  photoUrls,
  theme,
}: IntroPhotoLayerProps) {
  const cells = computeIntroPhotoLayout(photoUrls.length, layout, pictureRect);
  if (cells.length === 0) {
    return <PictureLayer rect={pictureRect} bleedMm={bleedMm} imageUrl={null} theme={theme} />;
  }
  return (
    <>
      {cells.map((rect, i) => (
        <PictureLayer
          key={i}
          rect={rect}
          bleedMm={bleedMm}
          imageUrl={photoUrls[i] ?? null}
          theme={theme}
        />
      ))}
    </>
  );
}
