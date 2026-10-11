// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { getPrintSpec } from '@/layout/specs';
import type { Edition } from '@/layout/theme';
import { PageSheet } from '@/layout/render/PageSheet';
import { mmToCss } from '@/shared/units';
import { GuideOverlay } from './GuideOverlay';

const PREVIEW_SCALE = 0.3;

export function PagePreview({
  book,
  pageRef,
  side,
  edition,
  showGuides,
  label,
}: {
  book: Book;
  pageRef: PageRef;
  side: 'left' | 'right';
  edition: Edition;
  showGuides: boolean;
  label: string;
}) {
  const { bleedMm } = getPrintSpec(book);
  const widthMm = book.format.trimWidthMm + bleedMm * 2;
  const heightMm = book.format.trimHeightMm + bleedMm * 2;
  return (
    <div
      aria-label={label}
      className="page-preview"
      role="img"
      style={{
        width: mmToCss(widthMm * PREVIEW_SCALE),
        height: mmToCss(heightMm * PREVIEW_SCALE),
      }}
    >
      <div
        className="page-preview__scaled"
        style={{
          width: mmToCss(widthMm),
          height: mmToCss(heightMm),
          transform: `scale(${PREVIEW_SCALE})`,
        }}
      >
        <PageSheet book={book} edition={edition} pageRef={pageRef} showBleed side={side} />
        {showGuides && <GuideOverlay book={book} pageRef={pageRef} side={side} />}
      </div>
    </div>
  );
}
