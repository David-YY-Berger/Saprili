// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import type { Book, TrimPresetId } from '@/domain/book';
import { toAppError } from '@/shared/errors';
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { FormatLockNotice } from './FormatLockNotice';
import { OrientationPicker } from './OrientationPicker';
import { TextPositionPicker } from './TextPositionPicker';
import { TrimSizePicker } from './TrimSizePicker';
import { confirmSetup } from './confirmSetup';

export function SetupPage({
  book,
  onConfirmed,
}: {
  book: Book;
  onConfirmed?: (book: Book) => void;
}) {
  const [presetId, setPresetId] = useState<TrimPresetId>(book.format.presetId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (book.format.lockedAt !== null) {
      window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
    }
  }, [book]);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await confirmSetup(book.id, { presetId });
      if (onConfirmed) onConfirmed(saved);
      window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
    } catch (setupError) {
      setError(toAppError(setupError));
    } finally {
      setBusy(false);
    }
  };

  if (book.format.lockedAt !== null) return null;
  return (
    <section aria-labelledby="setup-heading">
      <header className="page-heading">
        <h2 id="setup-heading">Set up your book</h2>
        <p>Choose the page shape before you start editing your story.</p>
      </header>
      <form
        className="surface-card settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleConfirm();
        }}
      >
        <TrimSizePicker onChange={setPresetId} value={presetId} />
        <OrientationPicker />
        <TextPositionPicker />
        <FormatLockNotice />
        {error && (
          <Banner type="error" title={error.userMessage}>
            {error.nextStep}
          </Banner>
        )}
        <div className="modal__actions">
          <Button
            onClick={() => {
              window.location.hash = '#/';
            }}
            type="button"
            variant="secondary"
          >
            Back to library
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Confirm book setup'}
          </Button>
        </div>
      </form>
    </section>
  );
}
