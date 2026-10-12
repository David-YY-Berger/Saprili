// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { CoverImageUpload } from './CoverImageUpload';
import { GenerateButton } from '@/features/pageview/GenerateButton';
import { GeneratedImage } from '@/features/pageview/GeneratedImage';
import { ProviderResultNotice } from '@/features/pageview/ProviderResultNotice';
import { useGenerationRun } from '@/features/pageview/useGenerationRun';

export function BackCoverNote({
  book,
  onBookChange,
  beforeGeneration,
  onUploadedImage,
}: {
  book: Book;
  onBookChange: (book: Book) => void;
  beforeGeneration: () => Promise<unknown>;
  onUploadedImage: (patch: Partial<Book['cover']['back']>) => void;
}) {
  const back = book.cover.back;
  const generation = useGenerationRun(book.id, beforeGeneration, onBookChange);
  const updateMode = (artworkMode: Book['cover']['back']['artworkMode']) =>
    onBookChange({
      ...book,
      cover: { ...book.cover, back: { ...back, artworkMode } },
    });

  return (
    <section aria-label="Back cover" className="page-editor__section">
      <h3>Back cover</h3>
      <label className="field" htmlFor="back-cover-artwork-mode">
        <span>Back-cover artwork</span>
        <select
          id="back-cover-artwork-mode"
          onChange={(event) =>
            updateMode(event.currentTarget.value as Book['cover']['back']['artworkMode'])
          }
          value={back.artworkMode}
        >
          <option value="generate">Generate from an original photo</option>
          <option value="upload">Use an uploaded picture as-is</option>
        </select>
      </label>
      {back.artworkMode === 'generate' ? (
        <>
          <p className="field__hint">
            Upload an original photo as a private AI reference. Saprili sends it to Google to create
            a new back-cover illustration; the original is not printed.
          </p>
          <CoverImageUpload
            bookId={book.id}
            hint="This original photo is sent to AI as a reference and is not printed."
            label="Original photo for AI reference"
            onUploaded={(imageId) =>
              onUploadedImage({ referenceImageId: imageId, generatedImageId: null })
            }
          />
          {back.referenceImageId && (
            <>
              <p className="field__hint">Original reference photo uploaded.</p>
              <button
                className="button button--secondary"
                onClick={() =>
                  onUploadedImage({ referenceImageId: null, generatedImageId: null })
                }
                type="button"
              >
                Remove reference photo
              </button>
            </>
          )}
          <div className="modal__actions">
            <GenerateButton
              busy={generation.running}
              disabled={!generation.settingsLoaded || !back.referenceImageId}
              label={
                back.generatedImageId
                  ? 'Regenerate back-cover artwork'
                  : 'Generate back-cover artwork'
              }
              onClick={() => {
                if (back.referenceImageId) {
                  void generation.run('backCover', undefined, {
                    referenceImageId: back.referenceImageId,
                  });
                }
              }}
            />
          </div>
          {back.generatedImageId && (
            <GeneratedImage alt="Generated back-cover artwork" imageId={back.generatedImageId} />
          )}
          <ProviderResultNotice
            error={generation.error}
            omittedReferenceLabel="photo"
            omittedPhotoCount={generation.omittedPhotoCount}
          />
        </>
      ) : (
        <>
          <p className="field__hint">
            This picture is used directly on the back cover and is not sent to AI.
          </p>
          <CoverImageUpload
            bookId={book.id}
            hint="The picture is shown whole inside the back-cover frame; it is never cropped."
            label="Upload back-cover picture"
            onUploaded={(imageId) => onUploadedImage({ ownImageId: imageId })}
          />
          {back.ownImageId && (
            <>
              <GeneratedImage alt="Uploaded back-cover picture" imageId={back.ownImageId} />
              <button
                className="button button--secondary"
                onClick={() => onUploadedImage({ ownImageId: null })}
                type="button"
              >
                Remove back-cover picture
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
