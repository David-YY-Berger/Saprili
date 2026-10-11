// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo } from 'react';
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { mmToCss } from '@/shared/units';
import { computePageGeometry, type PageSide } from '../geometry';
import { computePageTextLayout, getPageNumber } from '../pageText';
import { getPrintSpec } from '../specs';
import { getDefaultMeasurer, type TextMeasurer } from '../textFit';
import { resolveTheme, type Edition } from '../theme';
import { BackgroundLayer } from './BackgroundLayer';
import { BorderLayer } from './BorderLayer';
import { ColophonLayer } from './ColophonLayer';
import { IntroPhotoLayer } from './IntroPhotoLayer';
import { PageNumberLayer } from './PageNumberLayer';
import { getPageImageIds } from './pageImages';
import { PictureLayer } from './PictureLayer';
import { TextLayer } from './TextLayer';
import { useBlobUrls, type ResolvedImages } from './useBlobUrl';
import { useFontsReady } from './useFontsReady';

export interface PageSheetProps {
  book: Book;
  pageRef: PageRef;
  /** Which half of the spread the page sits on; decides the spine-side margin. */
  side: PageSide;
  edition: Edition;
  /** Show the bleed band around the trim (the sheet grows by the bleed on every side). */
  showBleed?: boolean;
  /** Pre-resolved image URLs (print). Without it, images are loaded from storage. */
  images?: ResolvedImages;
  measurer?: TextMeasurer;
}

/** One page, in millimetres. The single renderer behind previews and print. */
export function PageSheet({
  book,
  pageRef,
  side,
  edition,
  showBleed = false,
  images,
  measurer,
}: PageSheetProps) {
  const { bleedMm } = getPrintSpec(book);
  const geometry = useMemo(() => computePageGeometry(book, pageRef, side), [book, pageRef, side]);
  const theme = useMemo(() => resolveTheme(book, edition), [book, edition]);
  const fontsReady = useFontsReady([book.typography.hebrewFontId, book.typography.englishFontId]);

  const textLayout = useMemo(
    () => computePageTextLayout(book, pageRef, geometry, measurer ?? getDefaultMeasurer()),
    // `fontsReady` forces a new measurement once the real fonts are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, pageRef, geometry, measurer, fontsReady],
  );

  const imageIds = useMemo(() => getPageImageIds(book, pageRef, edition), [book, pageRef, edition]);
  const urls = useBlobUrls(imageIds, images);

  const canvas = geometry.bleedRect;
  const sheet = showBleed ? canvas : geometry.trimRect;
  const showNumber = book.showPageNumbers && pageRef.kind === 'story';

  return (
    <div
      data-page-sheet=""
      data-edition={edition}
      data-page-kind={pageRef.kind}
      data-side={side}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: mmToCss(sheet.width),
        height: mmToCss(sheet.height),
        // Keeps backgrounds and graphics when printing.
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: showBleed ? 0 : mmToCss(-bleedMm),
          top: showBleed ? 0 : mmToCss(-bleedMm),
          width: mmToCss(canvas.width),
          height: mmToCss(canvas.height),
        }}
      >
        <BackgroundLayer theme={theme} />
        <BorderLayer
          style={book.theme.borderStyle}
          borderRect={geometry.borderRect}
          canvasRect={canvas}
          theme={theme}
        />
        {pageRef.kind === 'intro' && (
          <IntroPhotoLayer
            pictureRect={geometry.pictureRect}
            bleedMm={bleedMm}
            layout={book.intro.photoLayout}
            photoUrls={imageIds.map((id) => urls.get(id) ?? null)}
            theme={theme}
          />
        )}
        {pageRef.kind === 'story' && (
          <PictureLayer
            rect={geometry.pictureRect}
            bleedMm={bleedMm}
            imageUrl={imageIds[0] ? (urls.get(imageIds[0]) ?? null) : null}
            theme={theme}
          />
        )}
        {pageRef.kind === 'colophon' && (
          <ColophonLayer
            colophon={book.colophon}
            bleedMm={bleedMm}
            qrImageUrl={
              book.colophon.qrImageId
                ? (urls.get(book.colophon.qrImageId) ?? null)
                : null
            }
            rect={geometry.contentRect}
          />
        )}
        {textLayout && (
          <TextLayer
            rect={geometry.textRect}
            bleedMm={bleedMm}
            texts={textLayout.texts}
            typography={book.typography}
            theme={theme}
            fit={textLayout.fit}
          />
        )}
        {showNumber && (
          <PageNumberLayer
            rect={geometry.pageNumberRect}
            bleedMm={bleedMm}
            pageNumber={getPageNumber(book, pageRef)}
            typography={book.typography}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
