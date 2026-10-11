// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getCoverPictureZoneSpec } from '@/layout/shape';
import { CoverImageUpload } from './CoverImageUpload';
import { GenerateButton } from '@/features/pageview/GenerateButton';
import { GeneratedImage } from '@/features/pageview/GeneratedImage';
import { ProviderResultNotice } from '@/features/pageview/ProviderResultNotice';
import { VersionHistoryStrip } from '@/features/pageview/VersionHistoryStrip';
import { useGenerationRun } from '@/features/pageview/useGenerationRun';

export function CoverIllustrationControl({
  book,
  onOwnImage,
  onBookChange,
  beforeGeneration,
}: {
  book: Book;
  /** Null removes the own image, which lets a generated illustration show again. */
  onOwnImage: (imageId: string | null) => void;
  onBookChange: (book: Book) => void;
  beforeGeneration: () => Promise<unknown>;
}) {
  const generation = useGenerationRun(book.id, beforeGeneration, onBookChange);
  const hasOwn = book.cover.ownImageId !== null;
  const hasGenerated = book.cover.illustration.currentImageId !== null;
  const zone = getCoverPictureZoneSpec(book);
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
      {book.cover.illustration.currentImageId && (
        <GeneratedImage
          alt="Current cover illustration"
          imageId={book.cover.illustration.currentImageId}
        />
      )}
      <label className="field" htmlFor="cover-custom-prompt">
        <span>Optional retry instruction</span>
        <textarea
          id="cover-custom-prompt"
          onChange={(event) =>
            onBookChange({
              ...book,
              cover: {
                ...book.cover,
                illustration: {
                  ...book.cover.illustration,
                  customPrompt: event.target.value,
                },
              },
            })
          }
          rows={3}
          value={book.cover.illustration.customPrompt}
        />
      </label>
      <div className="modal__actions">
        <GenerateButton
          busy={generation.running}
          disabled={hasOwn || !generation.settingsLoaded}
          label={hasGenerated ? 'Retry cover illustration' : 'Generate cover illustration'}
          onClick={() =>
            void generation.run('cover', undefined, {
              customPrompt: book.cover.illustration.customPrompt,
            })
          }
        />
        {hasOwn && (
          <button className="button button--secondary" onClick={() => onOwnImage(null)} type="button">
            Remove own image
          </button>
        )}
      </div>
      <VersionHistoryStrip
        busy={generation.running}
        history={book.cover.illustration.history}
        onRestore={(imageId) => void generation.restoreCoverVersion(imageId)}
      />
      <ProviderResultNotice
        error={generation.error}
        omittedPhotoCount={generation.omittedPhotoCount}
      />
      <CoverImageUpload bookId={book.id} onUploaded={onOwnImage} />
    </section>
  );
}
