// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import type { ImageRecord } from '@/domain/image';
import { newId } from '@/shared/ids';
import { formatHebrewDate } from '@/shared/hebrewDate';
import { useAutosave } from '@/shared/useAutosave';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { bookRepository, imageRepository } from '@/storage/repositories';
import { createThumbnail } from '@/storage/thumbnails';
import { toAppError } from '@/shared/errors';
import { SavedIndicator } from '@/ui/SavedIndicator';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { PagePreview } from '@/features/pageview/PagePreview';

function toHebrewDateInputValue(dateIso: string): string {
  return dateIso.slice(0, 10);
}

export function ColophonEditorPage({ initialBook }: { initialBook: Book }) {
  const [book, setBook] = useState(initialBook);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const previousQrRef = useRef<string | null>(null);
  const qrSaveBaselineRef = useRef<string | null>(null);
  const saveBook = useCallback(async (next: Book) => {
    await bookRepository.save(next, 'userEdit');
  }, []);
  const autosave = useAutosave(book, saveBook);
  useBeforeUnloadGuard(autosave.status);

  useEffect(() => {
    const previousId = previousQrRef.current;
    if (
      autosave.status !== 'saved' ||
      !previousId ||
      autosave.lastSavedAt === qrSaveBaselineRef.current
    ) return;
    previousQrRef.current = null;
    qrSaveBaselineRef.current = null;
    void imageRepository.deleteImage(previousId).catch((deleteError: unknown) => {
      setError(deleteError);
    });
  }, [autosave.lastSavedAt, autosave.status, book.colophon.qrImageId]);

  const updateColophon = (patch: Partial<Book['colophon']>) => {
    setBook((current) => ({
      ...current,
      colophon: { ...current.colophon, ...patch },
    }));
  };

  const uploadQr = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(new Error('Choose an image file for the QR code.'));
      return;
    }
    setUploading(true);
    setError(null);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const id = newId();
      const record: ImageRecord = {
        id,
        bookId: book.id,
        kind: 'qr',
        blob: file,
        mime: file.type,
        widthPx: bitmap.width,
        heightPx: bitmap.height,
        byteSize: file.size,
        createdAt: new Date().toISOString(),
        meta: { source: 'uploaded' },
      };
      const thumbnail = await createThumbnail(file);
      await imageRepository.putImage(record, thumbnail);
      previousQrRef.current = book.colophon.qrImageId;
      qrSaveBaselineRef.current = autosave.lastSavedAt;
      updateColophon({ qrImageId: id });
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      bitmap?.close();
      setUploading(false);
    }
  };

  const hebrewDate = formatHebrewDate(
    new Date(`${toHebrewDateInputValue(book.colophon.dateIso)}T12:00:00Z`),
  );
  const side = book.bindingSide === 'right' ? 'right' : 'left';

  return (
    <section aria-labelledby="colophon-heading" className="colophon-editor-page">
      <header className="page-heading">
        <h2 id="colophon-heading">Colophon</h2>
        <p>This closing page is generated from these settings; its text is not entered as story content.</p>
      </header>
      <div className="book-settings-layout">
        <div className="surface-card settings-form">
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
          <label className="field">
            <span>Book date</span>
            <input
              max="9999-12-31"
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (value) updateColophon({ dateIso: `${value}T12:00:00.000Z` });
              }}
              type="date"
              value={toHebrewDateInputValue(book.colophon.dateIso)}
            />
            <span className="field__hint">Hebrew date: <b dir="rtl" lang="he">{hebrewDate}</b></span>
          </label>
          <label className="field">
            <span>Place</span>
            <input
              onChange={(event) => updateColophon({ place: event.currentTarget.value })}
              value={book.colophon.place}
            />
          </label>
          <label className="field">
            <span>Created by (Hebrew)</span>
            <input
              dir="rtl"
              lang="he"
              onChange={(event) => updateColophon({ createdByTextHe: event.currentTarget.value })}
              value={book.colophon.createdByTextHe}
            />
            <span className="field__hint">Current placeholder wording: נוצר בספרילי.</span>
          </label>
          <label className="field">
            <span>QR image</span>
            <input
              accept="image/*"
              disabled={uploading}
              onChange={(event) => void uploadQr(event.currentTarget.files?.[0])}
              type="file"
            />
            <span className="field__hint">The QR is shown with a white square and clear space.</span>
          </label>
          {uploading && <p role="status">Adding QR image…</p>}
          <div className="modal__actions">
            <Button onClick={() => { window.location.hash = `#/book/${encodeURIComponent(book.id)}`; }} variant="secondary">
              Return to book
            </Button>
          </div>
        </div>
        <aside aria-label="Colophon page preview" className="surface-card book-settings-preview">
          <h3>Live preview</h3>
          <PagePreview
            book={book}
            edition="colour"
            label="Colophon live preview"
            pageRef={{ kind: 'colophon', id: 'colophon' }}
            showGuides={false}
            side={side}
          />
        </aside>
      </div>
    </section>
  );
}
