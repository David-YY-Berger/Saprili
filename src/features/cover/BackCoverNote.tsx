// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
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
  onAddReferences,
  onUploadedImage,
}: {
  book: Book;
  onBookChange: (book: Book) => void;
  beforeGeneration: () => Promise<unknown>;
  onAddReferences: (imageIds: string[]) => void;
  onUploadedImage: (patch: Partial<Book['cover']['back']>, purge?: boolean) => void;
}) {
  const back = book.cover.back;
  const [uploading, setUploading] = useState(false);
  const generation = useGenerationRun(book.id, beforeGeneration, onBookChange);
  const busy = generation.running || uploading;

  return (
    <section aria-label="Back cover" className="page-editor__section">
      <h3>Back cover</h3>
      <label className="field" htmlFor="back-cover-artwork-mode">
        <span>Back-cover artwork</span>
        <select
          disabled={busy}
          id="back-cover-artwork-mode"
          onChange={(event) =>
            onUploadedImage({
              artworkMode: event.currentTarget.value as Book['cover']['back']['artworkMode'],
            })
          }
          value={back.artworkMode}
        >
          <option value="generate">Generate from original photos</option>
          <option value="upload">Use an uploaded picture as-is</option>
        </select>
      </label>
      {back.artworkMode === 'generate' ? (
        <>
          <p className="field__hint">
            Upload original photos as private AI references. Saprili sends them to Google to create
            a new back-cover illustration; the originals are not printed.
          </p>
          <CoverImageUpload
            bookId={book.id}
            disabled={generation.running}
            hint="All selected original photos are sent to AI and are not printed."
            label="Original photos for AI reference"
            multiple
            onBusyChange={setUploading}
            onUploaded={onAddReferences}
          />
          {back.referenceImageIds.length > 0 && (
            <ul aria-label="Original reference photos" className="photo-strip">
              {back.referenceImageIds.map((imageId, index) => (
                <li className="photo-tile" key={imageId}>
                  <GeneratedImage
                    alt={`Original reference photo ${index + 1}`}
                    className="back-cover-reference-image"
                    imageId={imageId}
                  />
                  <button
                    className="button button--secondary"
                    disabled={busy}
                    onClick={() =>
                      onUploadedImage(
                        { referenceImageIds: back.referenceImageIds.filter((id) => id !== imageId) },
                        true,
                      )
                    }
                    type="button"
                  >
                    Remove reference photo {index + 1}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="field" htmlFor="back-cover-custom-prompt">
            <span>Optional back-cover image instruction</span>
            <textarea
              aria-describedby="back-cover-custom-prompt-hint"
              disabled={generation.running}
              id="back-cover-custom-prompt"
              onChange={(event) => onUploadedImage({ customPrompt: event.currentTarget.value })}
              rows={3}
              value={back.customPrompt}
            />
          </label>
          <p className="field__hint" id="back-cover-custom-prompt-hint">
            Describe the picture in English. This instruction is saved and sent to AI, not printed.
            The generated artwork should contain no text.
          </p>
          <div className="modal__actions">
            <GenerateButton
              busy={generation.running}
              disabled={
                !generation.settingsLoaded || uploading || back.referenceImageIds.length === 0
              }
              label={
                back.generatedImageId
                  ? 'Regenerate back-cover artwork'
                  : 'Generate back-cover artwork'
              }
              onClick={() => {
                if (back.referenceImageIds.length > 0) {
                  void generation.run('backCover', undefined, {
                    referenceImageIds: back.referenceImageIds,
                    customPrompt: back.customPrompt,
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
            disabled={generation.running}
            onBusyChange={setUploading}
            hint="The picture is shown whole inside the back-cover frame; it is never cropped."
            label="Upload back-cover picture"
            onUploaded={(imageIds) => onUploadedImage({ ownImageId: imageIds[0]! }, true)}
          />
          {back.ownImageId && (
            <>
              <GeneratedImage alt="Uploaded back-cover picture" imageId={back.ownImageId} />
              <button
                className="button button--secondary"
                disabled={busy}
                onClick={() => onUploadedImage({ ownImageId: null }, true)}
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
