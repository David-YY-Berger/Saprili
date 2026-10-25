// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { computePageGeometry } from '@/layout/geometry';
import { getPrintSpec } from '@/layout/specs';
import { PageSheet } from '@/layout/render/PageSheet';
import { CoverSheet } from '@/layout/render/CoverSheet';
import type { ResolvedImages } from '@/layout/render/useBlobUrl';
import { mmToCss } from '@/shared/units';
import { computeCropMarkSegments, CropMarks } from './CropMarks';
import type { SheetModel } from './printJob';

export function SheetView({
  book,
  sheet,
  images,
  showGuides,
  last,
  pageNumber,
}: {
  book: Book;
  sheet: SheetModel;
  images: ResolvedImages;
  showGuides: boolean;
  last: boolean;
  pageNumber: number;
}) {
  const spec = getPrintSpec(book);
  const bleed = sheet.bleedMm;
  const p = sheet.placementMm;
  const marks = computeCropMarkSegments(
    sheet.trimRect,
    bleed,
    spec.cropMark.offsetMm,
    spec.cropMark.lengthMm,
  );
  const safeRect = sheet.pageRef
    ? computePageGeometry(book, sheet.pageRef, sheet.side).safeRect
    : null;

  return (
    <section
      aria-label={
        sheet.isCover
          ? sheet.coverPanel
            ? `${sheet.coverPanel === 'front' ? 'Front' : 'Back'} cover print sheet`
            : 'Cover print sheet'
          : sheet.pageRef
            ? `${sheet.pageRef.kind} print sheet ${pageNumber}`
            : `Blank fallback print sheet ${pageNumber}`
      }
      className="print-sheet"
      data-page-kind={
        sheet.isCover
          ? sheet.coverPanel
            ? `cover-${sheet.coverPanel}`
            : 'cover'
          : (sheet.pageRef?.kind ?? 'blank')
      }
      style={{
        position: 'relative',
        width: mmToCss(sheet.sheetSizeMm.widthMm),
        height: mmToCss(sheet.sheetSizeMm.heightMm),
        overflow: 'hidden',
        background: '#fff',
        breakAfter: last ? 'auto' : 'page',
        pageBreakAfter: last ? 'auto' : 'always',
      }}
    >
      {(sheet.pageRef || sheet.isCover) && (
        <div
          className="print-page-placement"
          style={{
            position: 'absolute',
            left: mmToCss(p.leftMm),
            top: mmToCss(p.topMm),
            width: mmToCss(p.widthMm),
            height: mmToCss(p.heightMm),
          }}
        >
          {sheet.isCover ? (
            <CoverSheet
              book={book}
              edition={sheet.edition}
              images={images}
              panel={sheet.coverPanel}
            />
          ) : (
            sheet.pageRef && (
              <PageSheet
                book={book}
                edition={sheet.edition}
                images={images}
                pageRef={sheet.pageRef}
                showBleed
                side={sheet.side}
              />
            )
          )}
          {showGuides && (
            <svg
              aria-label="Trim and bleed guides"
              className="print-screen-guides"
              role="img"
              viewBox={`0 0 ${p.widthMm} ${p.heightMm}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <rect
                x="0"
                y="0"
                width={p.widthMm}
                height={p.heightMm}
                fill="none"
                stroke="#1677ff"
                strokeDasharray="2 1"
                strokeWidth="0.25"
              />
              <rect
                x={bleed}
                y={bleed}
                width={sheet.trimRect.width}
                height={sheet.trimRect.height}
                fill="none"
                stroke="#d22"
                strokeDasharray="2 1"
                strokeWidth="0.25"
              />
              {safeRect && (
                <rect
                  x={safeRect.x + bleed}
                  y={safeRect.y + bleed}
                  width={safeRect.width}
                  height={safeRect.height}
                  fill="none"
                  stroke="#159447"
                  strokeDasharray="2 1"
                  strokeWidth="0.25"
                />
              )}
            </svg>
          )}
        </div>
      )}
      {!sheet.isCover && (
        <CropMarks
          bleedMm={bleed}
          lengthMm={spec.cropMark.lengthMm}
          offsetMm={spec.cropMark.offsetMm}
          sheetSizeMm={sheet.sheetSizeMm}
          strokeMm={spec.cropMark.strokeMm}
          trimRect={sheet.trimRect}
        />
      )}
      {showGuides && !sheet.isCover && (
        <svg
          aria-label="Crop mark and sheet bounds guides"
          className="print-screen-guides print-screen-guides--outer"
          role="img"
          viewBox={`0 0 ${sheet.sheetSizeMm.widthMm} ${sheet.sheetSizeMm.heightMm}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <rect
            x="0"
            y="0"
            width={sheet.sheetSizeMm.widthMm}
            height={sheet.sheetSizeMm.heightMm}
            fill="none"
            stroke="#8b5cf6"
            strokeDasharray="2 1"
            strokeWidth="0.25"
          />
          {marks.map((mark, index) => (
            <line key={index} {...mark} stroke="#111" strokeDasharray="1 1" strokeWidth="0.25" />
          ))}
        </svg>
      )}
    </section>
  );
}
