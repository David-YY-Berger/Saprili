// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { computePageGeometry } from '@/layout/geometry';
import { getPrintSpec } from '@/layout/specs';
import { mmToCss } from '@/shared/units';

export function GuideOverlay({
  book,
  pageRef,
  side,
}: {
  book: Book;
  pageRef: PageRef;
  side: 'left' | 'right';
}) {
  const geometry = computePageGeometry(book, pageRef, side);
  const { bleedMm } = getPrintSpec(book);
  const width = geometry.trimRect.width + bleedMm * 2;
  const height = geometry.trimRect.height + bleedMm * 2;
  const rect = (x: number, y: number, w: number, h: number) =>
    `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
  const trimPath = rect(bleedMm, bleedMm, geometry.trimRect.width, geometry.trimRect.height);
  const safe = geometry.safeRect;
  const safePath = rect(safe.x + bleedMm, safe.y + bleedMm, safe.width, safe.height);
  const spineX = side === 'left' ? bleedMm + geometry.trimRect.width : bleedMm;
  return (
    <svg
      aria-label="Trim, bleed, safe-area, and spine-side guides"
      className="page-guide-overlay"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: mmToCss(width), height: mmToCss(height) }}
    >
      <path d={rect(0, 0, width, height)} data-guide="bleed" />
      <path d={trimPath} data-guide="trim" />
      <path d={safePath} data-guide="safe" />
      <path d={`M ${spineX} ${bleedMm} V ${bleedMm + geometry.trimRect.height}`} data-guide="spine" />
    </svg>
  );
}
