// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { computeCoverGeometry, fitSpineText } from '@/layout/coverGeometry';

export function SpineTextField({
  book,
  onChange,
}: {
  book: Book;
  onChange: (value: string) => void;
}) {
  const { spineWidthMm } = computeCoverGeometry(book);
  const fit = fitSpineText(book.cover.spineTextHe, spineWidthMm, book.typography.hebrewFontId);
  return (
    <label className="field">
      <span>Spine text (Hebrew)</span>
      <input
        dir="rtl"
        lang="he"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={book.cover.spineTextHe}
      />
      <span className="field__hint">
        The spine is {spineWidthMm} mm wide; the text is one rotated line.
        {!fit.fits && ' This text is too long for the spine. Please shorten it.'}
      </span>
    </label>
  );
}
