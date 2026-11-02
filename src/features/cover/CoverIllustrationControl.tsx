// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getCheckedCharacters, isDefinedCharacter } from '@/domain/characters';
import { CharacterChecklist } from '@/features/characters/CharacterChecklist';
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
  const hasCharacterPortraits = book.cover.characterPortraits.length > 0;
  const characterCallCount = getCheckedCharacters(book, book.cover.characterIds).filter(
    isDefinedCharacter,
  ).length;
  const zone = getCoverPictureZoneSpec(book);
  return (
    <section aria-label="Cover artwork" className="page-editor__section">
      <h3>Cover artwork</h3>
      <p>
        {hasOwn
          ? 'Using your own image.'
          : book.cover.artworkMode === 'introCollage'
            ? 'Using the intro page photos in the same collage arrangement.'
            : book.cover.artworkMode === 'characterPortraits' && hasCharacterPortraits
              ? `Using ${book.cover.characterPortraits.length} AI-generated character portraits.`
              : hasGenerated && book.cover.artworkMode === 'single'
                ? 'Using a generated illustration.'
                : 'No cover artwork yet.'}
      </p>
      <p className="field__hint">
        Picture shape: {zone.widthMm.toFixed(0)} × {zone.heightMm.toFixed(0)} mm.
      </p>
      <label className="field" htmlFor="cover-artwork-mode">
        <span>Cover artwork</span>
        <select
          id="cover-artwork-mode"
          onChange={(event) =>
            onBookChange({
              ...book,
              cover: {
                ...book.cover,
                artworkMode: event.currentTarget.value as Book['cover']['artworkMode'],
              },
            })
          }
          value={book.cover.artworkMode}
        >
          <option value="single">Single AI cover illustration</option>
          <option value="introCollage">Use intro photo collage</option>
          <option value="characterPortraits">AI portraits, one per character</option>
        </select>
        <span className="field__hint">
          The intro collage uses the same photos and layout as the intro page.
        </span>
        {book.cover.artworkMode === 'characterPortraits' && (
          <span className="field__hint">
            {characterCallCount === 0
              ? 'Check a character below to generate cover portraits.'
              : `Generates one portrait per checked character (${characterCallCount} AI call${characterCallCount === 1 ? '' : 's'}).`}
          </span>
        )}
      </label>
      {book.cover.artworkMode !== 'introCollage' && (
        <section aria-label="Characters on the cover">
          <h4>Characters on the cover</h4>
          <CharacterChecklist
            bookId={book.id}
            characters={book.characters}
            checkedIds={book.cover.characterIds}
            onChange={(characterIds) =>
              onBookChange({ ...book, cover: { ...book.cover, characterIds } })
            }
          />
        </section>
      )}
      {book.cover.artworkMode === 'single' && book.cover.illustration.currentImageId && (
        <GeneratedImage
          alt="Current cover illustration"
          imageId={book.cover.illustration.currentImageId}
        />
      )}
      {book.cover.artworkMode !== 'introCollage' && (
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
      )}
      <div className="modal__actions">
        {book.cover.artworkMode !== 'introCollage' && (
          <GenerateButton
            busy={generation.running}
            disabled={
              hasOwn ||
              !generation.settingsLoaded ||
              (book.cover.artworkMode === 'characterPortraits' && characterCallCount === 0)
            }
            label={
              book.cover.artworkMode === 'characterPortraits'
                ? hasCharacterPortraits
                  ? `Regenerate character portraits (${characterCallCount} AI calls)`
                  : `Generate character portraits (${characterCallCount} AI calls)`
                : hasGenerated
                  ? 'Retry cover illustration'
                  : 'Generate cover illustration'
            }
            onClick={() =>
              void generation.run(
                book.cover.artworkMode === 'characterPortraits' ? 'coverCharacters' : 'cover',
                undefined,
                { customPrompt: book.cover.illustration.customPrompt },
              )
            }
          />
        )}
        {hasOwn && (
          <button
            className="button button--secondary"
            onClick={() => onOwnImage(null)}
            type="button"
          >
            Remove own image
          </button>
        )}
      </div>
      {book.cover.artworkMode === 'single' && (
        <VersionHistoryStrip
          busy={generation.running}
          history={book.cover.illustration.history}
          onRestore={(imageId) => void generation.restoreCoverVersion(imageId)}
        />
      )}
      <ProviderResultNotice
        error={generation.error}
        omittedReferenceLabel={
          book.characters.some(isDefinedCharacter)
            ? 'character'
            : 'photo'
        }
        omittedPhotoCount={generation.omittedPhotoCount}
      />
      <CoverImageUpload bookId={book.id} onUploaded={onOwnImage} />
    </section>
  );
}
