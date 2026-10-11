// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useMemo, useState } from 'react';
import type { Book, BindingSide, BorderStyle, ThemePresetId } from '@/domain/book';
import { buildSpreads } from '@/domain/spreads';
import { PageSheet } from '@/layout/render/PageSheet';
import { ensureBookShape } from '@/layout/shape';
import { createBookMeasurer } from '@/layout/textFit';
import type { Edition } from '@/layout/theme';
import { createSampleBook } from './sampleBook';

const BORDERS: BorderStyle[] = ['scalloped', 'dotted', 'clouds', 'stars'];
const THEMES: ThemePresetId[] = ['sky', 'mint', 'peach', 'lavender'];

/** Developer page (`#/dev/layout`) for reviewing rendered sample pages. Not part of the product UI. */
export function LayoutDevPage() {
  const [book, setBook] = useState<Book>(() => createSampleBook());
  const [edition, setEdition] = useState<Edition>('colour');
  const [showBleed, setShowBleed] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void createBookMeasurer(book).then((measurer) => {
      if (cancelled) return;
      setBook((current) => ensureBookShape(current, measurer));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // The shape is computed once, for the sample book as first loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spreads = useMemo(() => buildSpreads(book), [book]);
  const spread = spreads[Math.min(spreadIndex, spreads.length - 1)]!;

  const update = (patch: (b: Book) => Book) => setBook(patch);

  return (
    <main style={{ padding: '12px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Layout review</h1>
      <p>
        Shape:{' '}
        {book.shape
          ? `text zone ${book.shape.textZoneHeightMm.toFixed(1)} mm, picture aspect ${book.shape.pictureAspect.toFixed(3)}`
          : 'computing…'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBlockEnd: '12px' }}>
        <label>
          Edition{' '}
          <select value={edition} onChange={(e) => setEdition(e.target.value as Edition)}>
            <option value="colour">colour</option>
            <option value="colouring">colouring</option>
          </select>
        </label>
        <label>
          Theme{' '}
          <select
            value={book.theme.presetId}
            onChange={(e) =>
              update((b) => ({
                ...b,
                theme: { ...b.theme, presetId: e.target.value as ThemePresetId },
              }))
            }
          >
            {THEMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Border{' '}
          <select
            value={book.theme.borderStyle}
            onChange={(e) =>
              update((b) => ({
                ...b,
                theme: { ...b.theme, borderStyle: e.target.value as BorderStyle },
              }))
            }
          >
            {BORDERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Binding{' '}
          <select
            value={book.bindingSide}
            onChange={(e) => update((b) => ({ ...b, bindingSide: e.target.value as BindingSide }))}
          >
            <option>right</option>
            <option>left</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={book.theme.textPanel}
            onChange={(e) =>
              update((b) => ({ ...b, theme: { ...b.theme, textPanel: e.target.checked } }))
            }
          />{' '}
          Text panel
        </label>
        <label>
          <input
            type="checkbox"
            checked={book.showPageNumbers}
            onChange={(e) => update((b) => ({ ...b, showPageNumbers: e.target.checked }))}
          />{' '}
          Page numbers
        </label>
        <label>
          <input
            type="checkbox"
            checked={showBleed}
            onChange={(e) => setShowBleed(e.target.checked)}
          />{' '}
          Show bleed
        </label>
        <label>
          Min font (pt){' '}
          <input
            type="number"
            min={8}
            max={24}
            value={book.typography.minFontSizePt}
            onChange={(e) =>
              update((b) => ({
                ...b,
                typography: { ...b.typography, minFontSizePt: Number(e.target.value) },
              }))
            }
          />
        </label>
        <label>
          Spread{' '}
          <select value={spread.index} onChange={(e) => setSpreadIndex(Number(e.target.value))}>
            {spreads.map((s) => (
              <option key={s.index} value={s.index}>
                {s.index + 1}: {s.kind}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ready && (
        <div
          style={{
            display: 'flex',
            gap: '4mm',
            alignItems: 'flex-start',
            background: '#888',
            padding: '4mm',
            width: 'fit-content',
          }}
        >
          {(['left', 'right'] as const).map((side) => {
            const ref = spread[side];
            return ref ? (
              <PageSheet
                key={`${side}-${ref.id}`}
                book={book}
                pageRef={ref}
                side={side}
                edition={edition}
                showBleed={showBleed}
              />
            ) : (
              <div key={side} style={{ width: `${book.format.trimWidthMm}mm` }} />
            );
          })}
        </div>
      )}
    </main>
  );
}
