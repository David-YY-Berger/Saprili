// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo } from 'react';
import type { Book } from '@/domain/book';
import { COVER_BLEED_MM } from '@/domain/constants';
import { CoverSheet } from '@/layout/render/CoverSheet';
import { getPrintSpec } from '@/layout/specs';
import { computeCoverGeometry } from '@/layout/coverGeometry';
import type { Edition } from '@/layout/theme';
import { computeSheetLayout } from '@/print/printJob';
import { mmToCss } from '@/shared/units';
import { CoverGuides } from './CoverGuides';

const PREVIEW_SCALE = 0.4;

/** The flat cover (back, spine, front) on a sheet with room for crop marks. */
export function CoverFlatPreview({
  book,
  edition,
  showGuides,
}: {
  book: Book;
  edition: Edition;
  showGuides: boolean;
}) {
  const layout = useMemo(() => {
    const { cutRect } = computeCoverGeometry(book);
    return computeSheetLayout(
      {
        trim: { widthMm: cutRect.width, heightMm: cutRect.height },
        bleedMm: COVER_BLEED_MM,
        cropMark: getPrintSpec(book).cropMark,
      },
      'exact',
    );
  }, [book]);
  const { widthMm, heightMm } = layout.sheetSizeMm;
  const p = layout.placementMm;
  return (
    <div
      aria-label="Flat cover preview"
      className="page-preview cover-flat-preview"
      role="img"
      style={{ width: mmToCss(widthMm * PREVIEW_SCALE), height: mmToCss(heightMm * PREVIEW_SCALE) }}
    >
      <div
        className="page-preview__scaled"
        style={{
          width: mmToCss(widthMm),
          height: mmToCss(heightMm),
          transform: `scale(${PREVIEW_SCALE})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: mmToCss(p.leftMm),
            top: mmToCss(p.topMm),
            width: mmToCss(p.widthMm),
            height: mmToCss(p.heightMm),
          }}
        >
          <CoverSheet book={book} edition={edition} />
        </div>
        {showGuides && <CoverGuides book={book} layout={layout} />}
      </div>
    </div>
  );
}
