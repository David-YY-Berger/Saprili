// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import { listReferencedImageIds } from '@/domain/imageRefs';
import type { Edition } from '@/layout/theme';
import { useAutosave } from '@/shared/useAutosave';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { bookRepository, imageRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import { SavedIndicator } from '@/ui/SavedIndicator';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { PreviewToggleBar } from '@/features/pageview/PreviewToggleBar';
import { BackCoverNote } from './BackCoverNote';
import { CoverFlatPreview } from './CoverFlatPreview';
import { CoverIllustrationControl } from './CoverIllustrationControl';
import { SpineTextField } from './SpineTextField';
import { SubtitleField } from './SubtitleField';
import { TitleField } from './TitleField';

export function CoverEditorPage({ initialBook }: { initialBook: Book }) {
  const [book, setBook] = useState(initialBook);
  const [edition, setEdition] = useState<Edition>('colour');
  const [showGuides, setShowGuides] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const purgeAfterSaveRef = useRef<string | null>(null);
  const pendingImageDeletions = useRef(new Set<string>());
  const saveBook = useCallback(async (next: Book) => {
    await bookRepository.save(next, 'userEdit');
  }, []);
  const autosave = useAutosave(book, saveBook);
  useBeforeUnloadGuard(autosave.status);

  useEffect(() => {
    if (autosave.status !== 'saved' || purgeAfterSaveRef.current === null) return;
    if (autosave.lastSavedAt === purgeAfterSaveRef.current) return;
    purgeAfterSaveRef.current = null;
    const referenced = listReferencedImageIds(book);
    const toDelete = [...pendingImageDeletions.current].filter((id) => !referenced.has(id));
    pendingImageDeletions.current.clear();
    void Promise.all(toDelete.map((id) => imageRepository.deleteImage(id))).catch(
      (purgeError: unknown) => {
        setError(purgeError);
      },
    );
  }, [autosave.lastSavedAt, autosave.status, book]);

  const deleteAfterSave = (ids: (string | null)[]) => {
    const removed = ids.filter((id): id is string => id !== null);
    if (removed.length === 0) return;
    removed.forEach((id) => pendingImageDeletions.current.add(id));
    purgeAfterSaveRef.current = autosave.lastSavedAt ?? '';
  };
  const updateCover = (patch: Partial<Book['cover']>) => {
    setBook((current) => ({ ...current, cover: { ...current.cover, ...patch } }));
  };
  const setOwnImage = (imageId: string | null) => {
    if (imageId !== book.cover.ownImageId) deleteAfterSave([book.cover.ownImageId]);
    updateCover({ ownImageId: imageId });
  };
  const updateBackCover = (patch: Partial<Book['cover']['back']>, purge = false) => {
    if (purge) {
      const previous = book.cover.back;
      const nextReferences = patch.referenceImageIds;
      deleteAfterSave([
        ...(nextReferences
          ? previous.referenceImageIds.filter((id) => !nextReferences.includes(id))
          : []),
        ...(patch.ownImageId !== undefined && patch.ownImageId !== previous.ownImageId
          ? [previous.ownImageId]
          : []),
      ]);
    }
    setBook((current) => ({
      ...current,
      cover: {
        ...current.cover,
        back: { ...current.cover.back, ...patch },
      },
    }));
  };
  const addBackReferences = (imageIds: string[]) => {
    setBook((current) => ({
      ...current,
      cover: {
        ...current.cover,
        back: {
          ...current.cover.back,
          referenceImageIds: [...current.cover.back.referenceImageIds, ...imageIds],
        },
      },
    }));
  };

  return (
    <section aria-labelledby="cover-heading" className="cover-editor-page">
      <header className="page-heading">
        <h2 id="cover-heading">Cover</h2>
        <p>Front, spine and back of the flat hard cover. Text is typeset by Saprili.</p>
      </header>
      <div className="surface-card cover-editor-preview">
        <PreviewToggleBar
          edition={edition}
          onEditionChange={setEdition}
          onGuidesChange={setShowGuides}
          showGuides={showGuides}
        />
        <p className="field__hint">
          Colour shows the book cover; Colouring adds the small colouring marker.
        </p>
        <CoverFlatPreview book={book} edition={edition} showGuides={showGuides} />
      </div>
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
        <TitleField onChange={(titleHe) => updateCover({ titleHe })} value={book.cover.titleHe} />
        <SubtitleField
          onChange={(subtitleHe) => updateCover({ subtitleHe })}
          value={book.cover.subtitleHe}
        />
        <SpineTextField book={book} onChange={(spineTextHe) => updateCover({ spineTextHe })} />
        <CoverIllustrationControl
          beforeGeneration={() => autosave.flush()}
          book={book}
          onBookChange={setBook}
          onOwnImage={setOwnImage}
        />
        <BackCoverNote
          beforeGeneration={() => autosave.flush()}
          book={book}
          onBookChange={(generated) =>
            setBook((current) => ({
              ...current,
              cover: {
                ...current.cover,
                back: {
                  ...current.cover.back,
                  generatedImageId: generated.cover.back.generatedImageId,
                },
              },
            }))
          }
          onAddReferences={addBackReferences}
          onUploadedImage={updateBackCover}
        />
        <div className="modal__actions">
          <Button
            onClick={() => {
              window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
            }}
            variant="secondary"
          >
            Return to book
          </Button>
        </div>
      </div>
    </section>
  );
}
