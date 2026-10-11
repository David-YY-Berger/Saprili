// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo } from 'react';
import type { Book } from '@/domain/book';
import { COVER_BLEED_MM } from '@/domain/constants';
import { mmToCss } from '@/shared/units';
import { computeCoverGeometry, computeCoverTextFits, fitSpineText } from '../coverGeometry';
import { getDefaultMeasurer, type TextMeasurer } from '../textFit';
import { resolveTheme, type Edition } from '../theme';
import { BackgroundLayer } from './BackgroundLayer';
import { CoverBack } from './CoverBack';
import { CoverFront } from './CoverFront';
import { CoverSpine } from './CoverSpine';
import { getCoverImageIds } from './pageImages';
import { useBlobUrls, type ResolvedImages } from './useBlobUrl';
import { useFontsReady } from './useFontsReady';

export interface CoverSheetProps {
  book: Book;
  /** The colouring edition uses the same cover and adds the small colouring marker. */
  edition: Edition;
  /** Pre-resolved image URLs (print). Without it, images are loaded from storage. */
  images?: ResolvedImages;
  measurer?: TextMeasurer;
  /** Editor only: a reminder on the back panel. Never set for print. */
  showTodoNote?: boolean;
}

/** The flat cover including its bleed band; the single renderer behind the editor and print. */
export function CoverSheet({
  book,
  edition,
  images,
  measurer,
  showTodoNote = false,
}: CoverSheetProps) {
  const fontId = book.typography.hebrewFontId;
  const geometry = useMemo(() => computeCoverGeometry(book), [book]);
  // The cover is never an outline page, so the colour theme is used for both editions.
  const theme = useMemo(() => resolveTheme(book, 'colour'), [book]);
  const fontsReady = useFontsReady([fontId]);
  const fits = useMemo(
    () => computeCoverTextFits(book, geometry, measurer ?? getDefaultMeasurer()),
    // `fontsReady` forces a new measurement once the real fonts are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, geometry, measurer, fontsReady],
  );
  const spineFit = useMemo(
    () =>
      fitSpineText(book.cover.spineTextHe, geometry.spineWidthMm, fontId, {
        measurer: measurer ?? getDefaultMeasurer(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.cover.spineTextHe, geometry.spineWidthMm, fontId, measurer, fontsReady],
  );
  const imageIds = useMemo(() => getCoverImageIds(book), [book]);
  const urls = useBlobUrls(imageIds, images);
  const canvas = geometry.bleedRect;

  return (
    <div
      data-cover-sheet=""
      data-edition={edition}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: mmToCss(canvas.width),
        height: mmToCss(canvas.height),
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <BackgroundLayer theme={theme} />
        <CoverBack
          bleedMm={COVER_BLEED_MM}
          book={book}
          canvasRect={canvas}
          geometry={geometry}
          showTodoNote={showTodoNote}
          theme={theme}
        />
        <CoverFront
          bleedMm={COVER_BLEED_MM}
          book={book}
          canvasRect={canvas}
          fits={fits}
          geometry={geometry}
          imageUrl={imageIds[0] ? (urls.get(imageIds[0]) ?? null) : null}
          showMarker={edition === 'colouring'}
          theme={theme}
        />
        <CoverSpine
          bleedMm={COVER_BLEED_MM}
          fit={spineFit}
          fontId={fontId}
          geometry={geometry}
          text={book.cover.spineTextHe}
          theme={theme}
        />
      </div>
    </div>
  );
}
