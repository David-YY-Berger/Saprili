// bisiyata dishmaya, leharbot ahava biyisral
import type { PhotoRef } from '@/domain/page';
import { MAX_AI_PHOTOS_INTRO, MAX_AI_PHOTOS_PAGE } from '@/domain/constants';
import { PhotoDropZone } from './PhotoDropZone';
import { PhotoStrip } from './PhotoStrip';
import { IntroPhotoLayoutPicker } from './IntroPhotoLayoutPicker';
import type { IntroPhotoLayout } from '@/domain/page';

export function PhotosSection({
  photos,
  isIntro,
  photoLayout,
  onFiles,
  onChange,
  onRemove,
  onLayoutChange,
  disabled,
}: {
  photos: PhotoRef[];
  isIntro: boolean;
  photoLayout?: IntroPhotoLayout;
  onFiles: (files: File[]) => void;
  onChange: (photos: PhotoRef[]) => void;
  onRemove: (photo: PhotoRef, index: number) => void;
  onLayoutChange?: (layout: IntroPhotoLayout) => void;
  disabled: boolean;
}) {
  return (
    <section aria-labelledby="photos-heading" className="page-editor__section">
      <h3 id="photos-heading">Original pictures</h3>
      <PhotoDropZone disabled={disabled} onFiles={onFiles} />
      <PhotoStrip
        cap={isIntro ? MAX_AI_PHOTOS_INTRO : MAX_AI_PHOTOS_PAGE}
        onChange={onChange}
        onRemove={onRemove}
        photos={photos}
      />
      {isIntro && photoLayout && onLayoutChange && (
        <IntroPhotoLayoutPicker onChange={onLayoutChange} value={photoLayout} />
      )}
    </section>
  );
}
