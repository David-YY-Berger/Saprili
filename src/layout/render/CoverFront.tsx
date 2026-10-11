// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getFontFamilyCss } from '../fontRegistry';
import type { CoverGeometry, CoverTextFits } from '../coverGeometry';
import type { Rect } from '../geometry';
import type { ResolvedTheme } from '../theme';
import { TEXT_LINE_HEIGHT } from '../textFit';
import { BorderLayer } from './BorderLayer';
import { ColouringMarker } from './ColouringMarker';
import { PictureLayer } from './PictureLayer';
import { rectStyle } from './layerStyle';

function CoverText({
  rect,
  bleedMm,
  text,
  fontSizePt,
  fontId,
  weight,
  color,
  overflow,
}: {
  rect: Rect;
  bleedMm: number;
  text: string;
  fontSizePt: number;
  fontId: string;
  weight: number;
  color: string;
  overflow: boolean;
}) {
  if (!text.trim()) return null;
  return (
    <div
      data-layer="cover-text"
      data-overflow={overflow ? 'true' : undefined}
      dir="rtl"
      lang="he"
      style={{
        ...rectStyle(rect, bleedMm),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        fontFamily: getFontFamilyCss(fontId),
        fontWeight: weight,
        fontSize: `${fontSizePt}pt`,
        lineHeight: TEXT_LINE_HEIGHT.rtl,
        color,
        // Overflow is flagged by pre-flight; it must stay visible rather than be cut.
        overflow: 'visible',
      }}
    >
      {text}
    </div>
  );
}

/** Border, title, subtitle, framed picture and (colouring edition) the marker. */
export function CoverFront({
  book,
  geometry,
  bleedMm,
  theme,
  fits,
  imageUrl,
  canvasRect,
  showMarker,
}: {
  book: Book;
  geometry: CoverGeometry;
  bleedMm: number;
  theme: ResolvedTheme;
  fits: CoverTextFits;
  imageUrl: string | null;
  canvasRect: Rect;
  showMarker: boolean;
}) {
  const fontId = book.typography.hebrewFontId;
  return (
    <div data-panel="front" style={{ position: 'absolute', inset: 0 }}>
      <BorderLayer
        borderRect={geometry.safeRects.front}
        canvasRect={canvasRect}
        style={book.theme.borderStyle}
        theme={theme}
      />
      <CoverText
        bleedMm={bleedMm}
        color={theme.textColor}
        fontId={fontId}
        fontSizePt={fits.title.fontSizePt}
        overflow={fits.title.overflow}
        rect={geometry.titleRect}
        text={book.cover.titleHe}
        weight={700}
      />
      <CoverText
        bleedMm={bleedMm}
        color={theme.textColor}
        fontId={fontId}
        fontSizePt={fits.subtitle.fontSizePt}
        overflow={fits.subtitle.overflow}
        rect={geometry.subtitleRect}
        text={book.cover.subtitleHe}
        weight={400}
      />
      <PictureLayer
        bleedMm={bleedMm}
        imageUrl={imageUrl}
        rect={geometry.frontPictureRect}
        theme={theme}
      />
      {showMarker && (
        <ColouringMarker
          bleedMm={bleedMm}
          fit={fits.marker}
          fontId={fontId}
          rect={geometry.colouringMarkerRect}
          text={book.cover.colouringMarkerText}
          theme={theme}
        />
      )}
    </div>
  );
}
