// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { CoverGeometry } from '../coverGeometry';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';
import { BorderLayer } from './BorderLayer';
import { rectStyle } from './layerStyle';

/**
 * Themed background and border only (v1). The note is a reminder for the editor
 * and is never rendered when `showTodoNote` is false, which is always the case in print.
 */
export function CoverBack({
  book,
  geometry,
  bleedMm,
  theme,
  canvasRect,
  showTodoNote,
}: {
  book: Book;
  geometry: CoverGeometry;
  bleedMm: number;
  theme: ResolvedTheme;
  canvasRect: Rect;
  showTodoNote: boolean;
}) {
  return (
    <div data-panel="back" style={{ position: 'absolute', inset: 0 }}>
      <BorderLayer
        borderRect={geometry.safeRects.back}
        canvasRect={canvasRect}
        style={book.theme.borderStyle}
        theme={theme}
      />
      {showTodoNote && (
        <div
          data-editor-only="true"
          style={{
            ...rectStyle(geometry.safeRects.back, bleedMm),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textColor,
            fontFamily: 'sans-serif',
            fontSize: '14pt',
            opacity: 0.6,
            textAlign: 'center',
          }}
        >
          TODO: back cover design
        </div>
      )}
    </div>
  );
}
