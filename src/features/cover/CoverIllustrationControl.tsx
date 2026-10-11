// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getCoverPictureZoneSpec } from '@/layout/shape';
import { Button } from '@/ui/Button';
import { Tooltip } from '@/ui/Tooltip';
import { CoverImageUpload } from './CoverImageUpload';

export function CoverIllustrationControl({
  book,
  onOwnImage,
}: {
  book: Book;
  /** Null removes the own image, which lets a generated illustration show again. */
  onOwnImage: (imageId: string | null) => void;
}) {
  const hasOwn = book.cover.ownImageId !== null;
  const hasGenerated = book.cover.illustration.currentImageId !== null;
  const zone = getCoverPictureZoneSpec(book);
  const reason = 'Available in Phase 9';
  return (
    <section aria-label="Cover illustration" className="page-editor__section">
      <h3>Cover illustration</h3>
      <p>
        {hasOwn
          ? 'Using your own image.'
          : hasGenerated
            ? 'Using a generated illustration.'
            : 'No cover illustration yet.'}
      </p>
      <p className="field__hint">
        Picture shape: {zone.widthMm.toFixed(0)} × {zone.heightMm.toFixed(0)} mm.
      </p>
      <div className="modal__actions">
        <Tooltip content={reason}>
          <span>
            <Button disabled title={`Generate — ${reason}`} variant="secondary">
              Generate
            </Button>
          </span>
        </Tooltip>
        <Tooltip content={reason}>
          <span>
            <Button disabled title={`Retry — ${reason}`} variant="secondary">
              Retry
            </Button>
          </span>
        </Tooltip>
        {hasOwn && (
          <Button onClick={() => onOwnImage(null)} variant="secondary">
            Remove own image
          </Button>
        )}
      </div>
      <CoverImageUpload bookId={book.id} onUploaded={onOwnImage} />
    </section>
  );
}
