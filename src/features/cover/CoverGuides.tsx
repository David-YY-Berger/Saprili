// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { computeCoverGeometry } from '@/layout/coverGeometry';
import type { Rect } from '@/layout/geometry';
import { computeCropMarkSegments } from '@/print/CropMarks';
import type { SheetLayout } from '@/print/printJob';
import { getPrintSpec } from '@/layout/specs';
import { COVER_BLEED_MM } from '@/domain/constants';

/** Editor only: cut, bleed, hinges, safe areas and crop marks, in sheet millimetres. */
export function CoverGuides({ book, layout }: { book: Book; layout: SheetLayout }) {
  const geometry = computeCoverGeometry(book);
  const { cropMark } = getPrintSpec(book);
  const { widthMm, heightMm } = layout.sheetSizeMm;
  const ox = layout.trimRect.x;
  const oy = layout.trimRect.y;
  const shift = (rect: Rect): Rect => ({ ...rect, x: rect.x + ox, y: rect.y + oy });
  const rectProps = (rect: Rect) => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  });
  const marks = computeCropMarkSegments(
    layout.trimRect,
    COVER_BLEED_MM,
    cropMark.offsetMm,
    cropMark.lengthMm,
  );
  return (
    <svg
      aria-label="Cover trim, bleed, hinge, safe-area, and crop-mark guides"
      className="cover-guides"
      role="img"
      viewBox={`0 0 ${widthMm} ${heightMm}`}
    >
      <rect {...rectProps(shift(geometry.bleedRect))} data-guide="bleed" />
      <rect {...rectProps(shift(geometry.cutRect))} data-guide="trim" />
      {geometry.hingeRects.map((hinge, index) => (
        <rect key={index} {...rectProps(shift(hinge))} data-guide="hinge" />
      ))}
      {Object.entries(geometry.safeRects).map(([name, rect]) => (
        <rect key={name} {...rectProps(shift(rect))} data-guide="safe" />
      ))}
      {marks.map((mark, index) => (
        <line key={index} {...mark} data-guide="mark" />
      ))}
    </svg>
  );
}
