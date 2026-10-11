// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useState } from 'react';
import type { Book, BorderStyle, ThemePresetId } from '@/domain/book';
import { SAFE_MARGIN_FLOOR_MM } from '@/domain/constants';
import { FONT_REGISTRY } from '@/layout/fontRegistry';
import { clampLayoutSettings } from '@/layout/geometry';
import { recomputeBookShape } from '@/layout/shape';
import { useAutosave } from '@/shared/useAutosave';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { bookRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { SavedIndicator } from '@/ui/SavedIndicator';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { PagePreview } from '@/features/pageview/PagePreview';
import { PreviewToggleBar } from '@/features/pageview/PreviewToggleBar';
import { useEdition } from '@/features/pageview/useEdition';
import { RecomputeShapeButton } from './RecomputeShapeButton';

const THEMES: { id: ThemePresetId; label: string }[] = [
  { id: 'sky', label: 'Sky' },
  { id: 'mint', label: 'Mint' },
  { id: 'peach', label: 'Peach' },
  { id: 'lavender', label: 'Lavender' },
];

const BORDERS: { id: BorderStyle; label: string }[] = [
  { id: 'scalloped', label: 'Scalloped' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'stars', label: 'Stars' },
];

const MARGIN_FIELDS = [
  ['marginTopMm', 'Top margin'],
  ['marginBottomMm', 'Bottom margin'],
  ['marginOuterMm', 'Outer margin'],
  ['gutterMm', 'Spine-side margin'],
] as const;

export function BookSettingsPage({ initialBook }: { initialBook: Book }) {
  const [book, setBook] = useState(initialBook);
  const saveBook = useCallback(async (next: Book) => {
    await bookRepository.save(next, 'userEdit');
  }, []);
  const autosave = useAutosave(book, saveBook);
  useBeforeUnloadGuard(autosave.status);
  const { edition, setEdition } = useEdition();
  const [showGuides, setShowGuides] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const side = book.bindingSide === 'right' ? 'right' : 'left';

  const updateLayout = (field: (typeof MARGIN_FIELDS)[number][0], value: number) => {
    setBook((current) => ({
      ...current,
      layout: clampLayoutSettings({ ...current.layout, [field]: value }).settings,
    }));
  };

  const recomputeShape = () => {
    setBook((current) => recomputeBookShape(current));
  };

  const saveNow = async () => {
    setError(null);
    try {
      await autosave.flush();
      await bookRepository.save(book, 'userEdit');
      window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
    } catch (saveError) {
      setError(saveError);
    }
  };

  return (
    <section aria-labelledby="book-settings-heading" className="book-settings-page">
      <header className="page-heading">
        <h2 id="book-settings-heading">Book settings</h2>
        <p>Changes save automatically. Your illustrations stay attached when you change settings.</p>
      </header>
      <div className="book-settings-layout">
        <div className="surface-card book-settings-form">
          <div className="library-toolbar">
            <SavedIndicator status={autosave.status} />
            {autosave.lastSavedAt && (
              <time dateTime={autosave.lastSavedAt}>
                Last saved {new Date(autosave.lastSavedAt).toLocaleTimeString()}
              </time>
            )}
          </div>
          {autosave.status === 'failed' && (
            <SaveErrorBanner error={autosave.error} onRetry={() => void autosave.flush()} />
          )}
          {error !== null && (
            <Banner type="error" title={toAppError(error).userMessage}>
              {toAppError(error).nextStep}
            </Banner>
          )}
          <form className="settings-form" onSubmit={(event) => event.preventDefault()}>
            <section className="page-editor__section">
              <h3>Book</h3>
              <label className="field">
                <span>Title</span>
                <input
                  onChange={(event) => setBook((current) => ({ ...current, title: event.currentTarget.value }))}
                  value={book.title}
                />
              </label>
              <label className="field">
                <span>Page format (locked)</span>
                <input
                  readOnly
                  value={`${book.format.trimWidthMm} × ${book.format.trimHeightMm} mm, portrait`}
                />
                <span className="field__hint">
                  The page format is locked because illustrations are drawn for this exact shape.
                </span>
              </label>
              <RecomputeShapeButton onConfirm={recomputeShape} />
              <a href={`#/book/${encodeURIComponent(book.id)}/colophon`}>Edit the colophon page</a>
            </section>

            <section className="page-editor__section">
              <h3>Binding and theme</h3>
              <label className="field">
                <span>Binding side</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      bindingSide: event.currentTarget.value as Book['bindingSide'],
                    }))
                  }
                  value={book.bindingSide}
                >
                  <option value="right">Right (Hebrew style)</option>
                  <option value="left">Left</option>
                </select>
              </label>
              <label className="field">
                <span>Theme</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      theme: { ...current.theme, presetId: event.currentTarget.value as ThemePresetId },
                    }))
                  }
                  value={book.theme.presetId}
                >
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Border style</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      theme: { ...current.theme, borderStyle: event.currentTarget.value as BorderStyle },
                    }))
                  }
                  value={book.theme.borderStyle}
                >
                  {BORDERS.map((border) => (
                    <option key={border.id} value={border.id}>
                      {border.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--checkbox">
                <input
                  checked={book.theme.textPanel}
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      theme: { ...current.theme, textPanel: event.currentTarget.checked },
                    }))
                  }
                  type="checkbox"
                />
                <span>Show a soft panel behind text</span>
              </label>
            </section>

            <section className="page-editor__section">
              <h3>Margins</h3>
              {MARGIN_FIELDS.map(([field, label]) => (
                <label className="field" key={field}>
                  <span>{label} (mm)</span>
                  <input
                    min={SAFE_MARGIN_FLOOR_MM}
                    onChange={(event) => updateLayout(field, Number(event.currentTarget.value))}
                    type="number"
                    value={book.layout[field]}
                  />
                </label>
              ))}
              <p className="field__hint">
                Every margin is clamped to at least {SAFE_MARGIN_FLOOR_MM} mm to protect the safe print area.
              </p>
            </section>

            <section className="page-editor__section">
              <h3>Type and text</h3>
              <label className="field">
                <span>Hebrew font</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      typography: { ...current.typography, hebrewFontId: event.currentTarget.value },
                    }))
                  }
                  value={book.typography.hebrewFontId}
                >
                  {FONT_REGISTRY.filter((font) => font.script === 'hebrew').map((font) => (
                    <option key={font.id} value={font.id}>{font.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>English font</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      typography: { ...current.typography, englishFontId: event.currentTarget.value },
                    }))
                  }
                  value={book.typography.englishFontId}
                >
                  {FONT_REGISTRY.filter((font) => font.script === 'latin').map((font) => (
                    <option key={font.id} value={font.id}>{font.label}</option>
                  ))}
                </select>
              </label>
              <fieldset className="field">
                <legend>Text size steps (pt)</legend>
                {book.typography.sizeStepsPt.map((size, index) => (
                  <label key={index}>
                    {['Large', 'Medium', 'Small'][index]}
                    <input
                      min={book.typography.minFontSizePt}
                      onChange={(event) =>
                        setBook((current) => {
                          const steps = [...current.typography.sizeStepsPt] as Book['typography']['sizeStepsPt'];
                          steps[index] = Number(event.currentTarget.value);
                          return { ...current, typography: { ...current.typography, sizeStepsPt: steps } };
                        })
                      }
                      type="number"
                      value={size}
                    />
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span>Text alignment</span>
                <select
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      typography: {
                        ...current.typography,
                        alignment: event.currentTarget.value as Book['typography']['alignment'],
                      },
                    }))
                  }
                  value={book.typography.alignment}
                >
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                </select>
              </label>
              <label className="field">
                <span>Hebrew / English spacing (mm)</span>
                <input
                  min={0}
                  onChange={(event) =>
                    setBook((current) => ({
                      ...current,
                      typography: {
                        ...current.typography,
                        hebrewEnglishSpacingMm: Math.max(0, Number(event.currentTarget.value)),
                      },
                    }))
                  }
                  type="number"
                  value={book.typography.hebrewEnglishSpacingMm}
                />
              </label>
              <label className="field field--checkbox">
                <input
                  checked={book.showPageNumbers}
                  onChange={(event) => setBook((current) => ({ ...current, showPageNumbers: event.currentTarget.checked }))}
                  type="checkbox"
                />
                <span>Show page numbers</span>
              </label>
              <label className="field">
                <span>Art style</span>
                <textarea
                  onChange={(event) => setBook((current) => ({ ...current, artStyleText: event.currentTarget.value }))}
                  rows={4}
                  value={book.artStyleText}
                />
              </label>
            </section>
            <div className="modal__actions">
              <Button onClick={() => void saveNow()} type="button">
                Save and return
              </Button>
              <Button
                onClick={() => {
                  window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
                }}
                type="button"
                variant="secondary"
              >
                Return to book
              </Button>
            </div>
          </form>
        </div>
        <aside aria-label="Live page preview" className="surface-card book-settings-preview">
          <h3>Live preview</h3>
          <PreviewToggleBar
            edition={edition}
            onEditionChange={setEdition}
            onGuidesChange={setShowGuides}
            showGuides={showGuides}
          />
          <PagePreview
            book={book}
            edition={edition}
            label="Book settings live preview"
            pageRef={{ kind: 'story', id: book.storyPages[0]?.id ?? '' }}
            showGuides={showGuides}
            side={side}
          />
        </aside>
      </div>
    </section>
  );
}
