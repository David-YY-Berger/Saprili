// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef } from 'react';
import { useFullImage } from '@/images/useFullImage';
import { toAppError } from '@/shared/errors';
import { Button } from './Button';

export function ImageOverlay({
  imageId,
  title,
  onClose,
}: {
  imageId: string | null;
  title: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { url, loading, error } = useFullImage(imageId);

  useEffect(() => {
    if (!imageId) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [imageId]);

  if (!imageId) return null;
  const appError = error === null ? null : toAppError(error);
  return (
    <div
      className="image-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="image-overlay__dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="image-overlay__toolbar">
          <h2>{title}</h2>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
        {loading && <p role="status">Loading picture…</p>}
        {appError && (
          <p role="alert">
            {appError.userMessage} {appError.nextStep}
          </p>
        )}
        {url && <img alt={title} className="image-overlay__image" src={url} />}
      </div>
    </div>
  );
}
