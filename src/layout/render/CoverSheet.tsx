// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo } from 'react';
import type { Book } from '@/domain/book';
import { COVER_BLEED_MM } from '@/domain/constants';
import { mmToCss } from '@/shared/units';
import {
  computeCoverGeometry,
  computeCoverPanelGeometry,
  computeCoverTextFits,
  fitSpineText,
  type CoverPanel,
} from '../coverGeometry';
import { getDefaultMeasurer, type TextMeasurer } from '../textFit';
import { resolveTheme, type Edition } from '../theme';
import { BackgroundLayer } from './BackgroundLayer';
import { CoverBack } from './CoverBack';
import { CoverFront } from './CoverFront';
import { CoverSpine } from './CoverSpine';
import { getBackCoverImageId, getCoverImageIds } from './pageImages';
import { useBlobUrls, type ResolvedImages } from './useBlobUrl';
import { useFontsReady } from './useFontsReady';

export interface CoverSheetProps {
  book: Book;
  /** The colouring edition uses the same cover and adds the small colouring marker. */
  edition: Edition;
  /** Pre-resolved image URLs (print). Without it, images are loaded from storage. */
  images?: ResolvedImages;
  measurer?: TextMeasurer;
  /** Render one standalone panel instead of the complete flat cover. */
  panel?: CoverPanel;
}

/** The flat cover including its bleed band; the single renderer behind the editor and print. */
export function CoverSheet({
  book,
  edition,
  images,
  measurer,
  panel,
}: CoverSheetProps) {
  const fontId = book.typography.hebrewFontId;
  const geometry = useMemo(() => {
    const coverGeometry = computeCoverGeometry(book);
    return panel ? computeCoverPanelGeometry(coverGeometry, panel) : coverGeometry;
  }, [book, panel]);
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
  const frontImageIds = useMemo(() => getCoverImageIds(book), [book]);
  const backImageId = useMemo(() => getBackCoverImageId(book), [book]);
  const imageIds = useMemo(
    () => [...frontImageIds, ...(backImageId ? [backImageId] : [])],
    [backImageId, frontImageIds],
  );
  const urls = useBlobUrls(imageIds, images);
  const canvas = geometry.bleedRect;

  return (
    <div
      data-cover-sheet=""
      data-cover-panel={panel}
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
        {(!panel || panel === 'back') && (
          <CoverBack
            bleedMm={COVER_BLEED_MM}
            book={book}
            canvasRect={canvas}
            geometry={geometry}
            imageUrl={backImageId ? (urls.get(backImageId) ?? null) : null}
            theme={theme}
          />
        )}
        {(!panel || panel === 'front') && (
          <CoverFront
            bleedMm={COVER_BLEED_MM}
            book={book}
            canvasRect={canvas}
            fits={fits}
            geometry={geometry}
            imageUrls={frontImageIds.map((id) => urls.get(id) ?? null)}
            showMarker={edition === 'colouring'}
            theme={theme}
          />
        )}
        {!panel && (
          <CoverSpine
            bleedMm={COVER_BLEED_MM}
            fit={spineFit}
            fontId={fontId}
            geometry={geometry}
            text={book.cover.spineTextHe}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
