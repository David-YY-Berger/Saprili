// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { CoverGeometry } from '../coverGeometry';
import type { Rect } from '../geometry';
import { insetRect } from '../geometry';
import { CONTENT_INSET_MM } from '../specs';
import type { ResolvedTheme } from '../theme';
import { BorderLayer } from './BorderLayer';
import { PictureLayer } from './PictureLayer';

/**
 * The back-cover artwork is framed inside the themed border and safe area.
 */
export function CoverBack({
  book,
  geometry,
  bleedMm,
  theme,
  canvasRect,
  imageUrl,
}: {
  book: Book;
  geometry: CoverGeometry;
  bleedMm: number;
  theme: ResolvedTheme;
  canvasRect: Rect;
  imageUrl: string | null;
}) {
  return (
    <div data-panel="back" style={{ position: 'absolute', inset: 0 }}>
      <BorderLayer
        borderRect={geometry.safeRects.back}
        canvasRect={canvasRect}
        style={book.theme.borderStyle}
        theme={theme}
      />
      {imageUrl && (
        <PictureLayer
          bleedMm={bleedMm}
          imageUrl={imageUrl}
          rect={insetRect(geometry.safeRects.back, CONTENT_INSET_MM)}
          theme={theme}
        />
      )}
    </div>
  );
}
