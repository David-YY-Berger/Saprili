// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { IllustrationState, IntroPhotoLayout, PageRef, PhotoRef } from '@/domain/page';
import { ColouringSection } from './ColouringSection';
import { EnglishTextField } from './EnglishTextField';
import { HebrewTextField } from './HebrewTextField';
import { IllustrationSection } from './IllustrationSection';
import { PageActionsBar } from './PageActionsBar';
import { PhotosSection } from './PhotosSection';
import { PrivateTitleField } from './PrivateTitleField';
import { ProviderResultNotice } from './ProviderResultNotice';
import { useGenerationRun } from './useGenerationRun';

export function PageEditorPanel({
  book,
  pageRef,
  onUpdate,
  onPhotosChange,
  onPhotoRemove,
  onImportPhotos,
  onIllustrationChange,
  beforeGeneration,
  onGenerationComplete,
  importDisabled,
}: {
  book: Book;
  pageRef: PageRef;
  onUpdate: (patch: {
    privateTitle?: string;
    textEn?: string;
    textHe?: string;
    photoLayout?: IntroPhotoLayout;
  }) => void;
  onPhotosChange: (photos: PhotoRef[]) => void;
  onPhotoRemove: (photo: PhotoRef, index: number) => void;
  onImportPhotos: (files: File[]) => void;
  onIllustrationChange: (pageId: string, patch: Partial<IllustrationState>) => void;
  beforeGeneration: () => Promise<unknown>;
  onGenerationComplete: (book: Book) => Promise<unknown> | unknown;
  importDisabled: boolean;
}) {
  const generation = useGenerationRun(book.id, beforeGeneration, onGenerationComplete);
  if (pageRef.kind === 'colophon') {
    return (
      <section aria-labelledby="page-editor-heading" className="page-editor surface-card">
        <h2 id="page-editor-heading">Colophon</h2>
        <p>The colophon is edited separately with the book settings in Phase 6.</p>
        <a
          className="button button--secondary"
          href={`#/book/${encodeURIComponent(book.id)}/colophon`}
        >
          Open colophon editor
        </a>
        <PageActionsBar book={book} pageRef={pageRef} />
      </section>
    );
  }

  const page =
    pageRef.kind === 'intro'
      ? book.intro
      : book.storyPages.find((candidate) => candidate.id === pageRef.id);
  if (!page) return null;
  const storyPage =
    pageRef.kind === 'story'
      ? book.storyPages.find((candidate) => candidate.id === pageRef.id)
      : null;

  return (
    <section aria-labelledby="page-editor-heading" className="page-editor surface-card">
      <h2 id="page-editor-heading">{pageRef.kind === 'intro' ? 'Intro page' : 'Story page'}</h2>
      <PrivateTitleField
        onChange={(privateTitle) => onUpdate({ privateTitle })}
        value={page.privateTitle}
      />
      <HebrewTextField onChange={(textHe) => onUpdate({ textHe })} value={page.textHe} />
      <EnglishTextField onChange={(textEn) => onUpdate({ textEn })} value={page.textEn} />
      <PhotosSection
        disabled={importDisabled}
        isIntro={pageRef.kind === 'intro'}
        onChange={onPhotosChange}
        onFiles={onImportPhotos}
        onLayoutChange={
          pageRef.kind === 'intro' ? (photoLayout) => onUpdate({ photoLayout }) : undefined
        }
        onRemove={onPhotoRemove}
        photoLayout={pageRef.kind === 'intro' ? book.intro.photoLayout : undefined}
        photos={page.photos}
      />
      {storyPage && (
        <>
          <IllustrationSection
            book={book}
            busy={generation.running}
            disabled={!generation.settingsLoaded}
            illustration={storyPage.illustration}
            modelId={generation.settings?.illustrationModelId ?? 'gemini-3-pro-image'}
            onCustomPromptChange={(customPrompt) =>
              onIllustrationChange(storyPage.id, { customPrompt })
            }
            onEditModeChange={(useEditMode) =>
              onIllustrationChange(storyPage.id, { useEditMode })
            }
            onGenerate={() =>
              void generation.run('illustration', storyPage.id, {
                customPrompt: storyPage.illustration.customPrompt,
                useEditMode: storyPage.illustration.useEditMode,
              })
            }
            onRestore={(imageId) => void generation.restoreVersion(storyPage.id, imageId)}
            onUpload={(file) => void generation.runLocal(storyPage.id, file)}
            pageId={storyPage.id}
          />
          <ColouringSection
            busy={generation.running}
            disabled={!generation.settingsLoaded}
            onGenerate={() => void generation.run('colouring', storyPage.id)}
            page={storyPage}
          />
          <ProviderResultNotice
            error={generation.error}
            omittedPhotoCount={generation.omittedPhotoCount}
          />
        </>
      )}
      <PageActionsBar book={book} pageRef={pageRef} />
    </section>
  );
}
