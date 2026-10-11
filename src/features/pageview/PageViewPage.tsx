// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import type { PageRef, PhotoRef } from '@/domain/page';
import { COLOPHON_PAGE_ID } from '@/domain/constants';
import { photoImportService } from '@/images/importPhoto';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { imageRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import { undoManager } from '@/ui/UndoManager';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { Banner } from '@/ui/Banner';
import { Spinner } from '@/ui/Spinner';
import { SaveStatusBar } from './SaveStatusBar';
import { PageEditorPanel } from './PageEditorPanel';
import { SpreadEditor } from './SpreadEditor';
import { useBookAutosave } from './useBookAutosave';
import { useBookStore } from './useBookStore';
import { usePasteImages } from './usePasteImages';

function getPageRef(book: Book, pageId: string): PageRef | null {
  if (pageId === book.intro.id) return { kind: 'intro', id: book.intro.id };
  if (pageId === COLOPHON_PAGE_ID) return { kind: 'colophon', id: COLOPHON_PAGE_ID };
  return book.storyPages.some((page) => page.id === pageId)
    ? { kind: 'story', id: pageId }
    : null;
}

function updatePhotos(book: Book, pageRef: PageRef, photos: PhotoRef[]): Book {
  if (pageRef.kind === 'intro') return { ...book, intro: { ...book.intro, photos } };
  if (pageRef.kind === 'story') {
    return {
      ...book,
      storyPages: book.storyPages.map((page) =>
        page.id === pageRef.id ? { ...page, photos } : page,
      ),
    };
  }
  return book;
}

function readPhotos(book: Book, pageRef: PageRef): PhotoRef[] {
  if (pageRef.kind === 'intro') return book.intro.photos;
  if (pageRef.kind === 'story') {
    return book.storyPages.find((page) => page.id === pageRef.id)?.photos ?? [];
  }
  return [];
}

export function PageViewPage({ book: initialBook, pageId }: { book: Book; pageId: string }) {
  const loadedBook = useBookStore((state) => state.book);
  const loadBook = useBookStore((state) => state.loadBook);
  const updateBook = useBookStore((state) => state.updateBook);
  const commit = useBookStore((state) => state.commit);
  const book = loadedBook?.id === initialBook.id ? loadedBook : initialBook;
  const [loadError, setLoadError] = useState<unknown>(null);
  const [storeReady, setStoreReady] = useState(false);
  const autosave = useBookAutosave(
    book,
    commit,
    storeReady && loadedBook?.id === initialBook.id,
  );
  useBeforeUnloadGuard(autosave.status);
  const initialPageRef = getPageRef(book, pageId);
  const [selectedPageRef, setSelectedPageRef] = useState<PageRef | null>(initialPageRef);
  const [immediateError, setImmediateError] = useState<unknown>(null);
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const canEditPhotos = storeReady && selectedPageRef?.kind !== 'colophon';
  const beforeGeneration = useCallback(() => commit('userEdit'), [commit]);
  const afterGeneration = useCallback(
    () => loadBook(initialBook.id),
    [initialBook.id, loadBook],
  );

  useEffect(() => {
    let active = true;
    setLoadError(null);
    setStoreReady(false);
    void loadBook(initialBook.id)
      .then(() => {
        if (active) setStoreReady(true);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error);
      });
    return () => {
      active = false;
    };
  }, [initialBook.id, loadBook]);

  useEffect(() => {
    const routePage = getPageRef(book, pageId);
    setSelectedPageRef((current) =>
      current && getPageRef(book, current.id) ? current : routePage,
    );
  }, [book, pageId]);

  const importPhotos = useCallback(
    async (files: File[]) => {
      const target = selectedPageRef;
      if (!target || target.kind === 'colophon' || importingRef.current) return;
      importingRef.current = true;
      setImporting(true);
      setImmediateError(null);
      let imported: PhotoRef[] = [];
      try {
        imported = await photoImportService.importFiles(book.id, files);
        updateBook((current) =>
          updatePhotos(current, target, [...readPhotos(current, target), ...imported]),
        );
        await commit('userEdit');
      } catch (error) {
        if (imported.length > 0) {
          updateBook((current) =>
            updatePhotos(
              current,
              target,
              readPhotos(current, target).filter(
                (photo) => !imported.some((added) => added.originalImageId === photo.originalImageId),
              ),
            ),
          );
          try {
            await Promise.all(
              imported.flatMap((photo) => [
                imageRepository.deleteImage(photo.originalImageId),
                imageRepository.deleteImage(photo.aiCopyImageId),
              ]),
            );
          } catch (cleanupError) {
            setImmediateError(cleanupError);
            importingRef.current = false;
            setImporting(false);
            return;
          }
        }
        setImmediateError(error);
      } finally {
        importingRef.current = false;
        setImporting(false);
      }
    },
    [book.id, selectedPageRef, updateBook, commit],
  );
  usePasteImages(importPhotos, canEditPhotos);

  const updatePage = (patch: {
    privateTitle?: string;
    textEn?: string;
    textHe?: string;
    photoLayout?: Book['intro']['photoLayout'];
  }) => {
    if (!selectedPageRef) return;
    updateBook((current) => {
      if (selectedPageRef.kind === 'intro') {
        return { ...current, intro: { ...current.intro, ...patch } };
      }
      if (selectedPageRef.kind === 'story') {
        return {
          ...current,
          storyPages: current.storyPages.map((page) =>
            page.id === selectedPageRef.id ? { ...page, ...patch } : page,
          ),
        };
      }
      return current;
    });
  };

  const handlePhotosChange = (photos: PhotoRef[]) => {
    if (selectedPageRef) updateBook((current) => updatePhotos(current, selectedPageRef, photos));
  };

  const updateIllustration = (targetPageId: string, patch: Partial<Book['storyPages'][number]['illustration']>) => {
    updateBook((current) => ({
      ...current,
      storyPages: current.storyPages.map((page) =>
        page.id === targetPageId
          ? { ...page, illustration: { ...page.illustration, ...patch } }
          : page,
      ),
    }));
  };

  const handlePhotoRemove = (photo: PhotoRef, index: number) => {
    const target = selectedPageRef;
    if (!target || target.kind === 'colophon') return;
    const currentPhotos = readPhotos(book, target);
    if (currentPhotos[index]?.originalImageId !== photo.originalImageId) return;
    updateBook((current) =>
      updatePhotos(
        current,
        target,
        readPhotos(current, target).filter((_, currentIndex) => currentIndex !== index),
      ),
    );
    undoManager.registerUndo({
      label: 'Picture removed',
      undo: async () => {
        updateBook((current) => {
          const photos = readPhotos(current, target);
          const restored = [...photos];
          restored.splice(Math.min(index, restored.length), 0, photo);
          return updatePhotos(current, target, restored);
        });
        await commit('userEdit');
      },
      onExpire: async () => {
        const saved = await commit('userEdit');
        await imageRepository.purgeOrphanImages(saved);
      },
    });
  };

  if (loadError !== null) {
    const error = toAppError(loadError);
    return (
      <section aria-labelledby="page-load-error-heading">
        <h2 id="page-load-error-heading">This page could not be opened</h2>
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}{' '}
          <button
            className="button button--secondary"
            onClick={() => {
              setLoadError(null);
              setStoreReady(false);
              void loadBook(book.id)
                .then(() => setStoreReady(true))
                .catch(setLoadError);
            }}
            type="button"
          >
            Try again
          </button>
        </Banner>
      </section>
    );
  }
  if (!storeReady || loadedBook?.id !== initialBook.id) {
    return (
      <div aria-label="Loading page" className="surface-card" role="status">
        <Spinner /> Loading page…
      </div>
    );
  }

  if (!initialPageRef) {
    return (
      <section aria-labelledby="missing-page-heading" className="surface-card">
        <h2 id="missing-page-heading">Page not found</h2>
        <a href={`#/book/${encodeURIComponent(book.id)}`}>Return to the book</a>
      </section>
    );
  }
  const activePage = selectedPageRef ?? initialPageRef;
  const immediateAppError = immediateError === null ? null : toAppError(immediateError);
  return (
    <section aria-labelledby="page-view-heading" className="page-view">
      <header className="page-heading page-view__heading">
        <div>
          <h2 id="page-view-heading">{book.title}</h2>
          <p>Edit text and pictures. Changes are saved automatically.</p>
        </div>
        <a className="button button--secondary" href={`#/book/${encodeURIComponent(book.id)}`}>
          Back to book
        </a>
      </header>
      <SaveStatusBar
        lastSavedAt={autosave.lastSavedAt}
        status={autosave.status}
      />
      {autosave.status === 'failed' && (
        <SaveErrorBanner error={autosave.error} onRetry={() => void autosave.flush()} />
      )}
      {immediateAppError && (
        <Banner type="error" title={immediateAppError.userMessage}>
          {immediateAppError.nextStep}
        </Banner>
      )}
      {importing && <p aria-live="polite" role="status">Preparing pictures…</p>}
      {selectedPageRef && (
        <>
          <SpreadEditor
            book={book}
            onSelectPage={setSelectedPageRef}
            pageId={initialPageRef.id}
            selectedPageId={activePage.id}
          />
          <PageEditorPanel
            book={book}
            importDisabled={importing}
            onImportPhotos={(files) => void importPhotos(files)}
            onIllustrationChange={updateIllustration}
            onPhotoRemove={handlePhotoRemove}
            onPhotosChange={handlePhotosChange}
            onUpdate={updatePage}
            beforeGeneration={beforeGeneration}
            onGenerationComplete={afterGeneration}
            pageRef={activePage}
          />
        </>
      )}
    </section>
  );
}
