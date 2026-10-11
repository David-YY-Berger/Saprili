// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { IntroPhotoLayout, PageRef, PhotoRef } from '@/domain/page';
import { ColouringSection } from './ColouringSection';
import { EnglishTextField } from './EnglishTextField';
import { HebrewTextField } from './HebrewTextField';
import { IllustrationSection } from './IllustrationSection';
import { PageActionsBar } from './PageActionsBar';
import { PhotosSection } from './PhotosSection';
import { PrivateTitleField } from './PrivateTitleField';

export function PageEditorPanel({
  book,
  pageRef,
  onUpdate,
  onPhotosChange,
  onPhotoRemove,
  onImportPhotos,
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
  importDisabled: boolean;
}) {
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
      {pageRef.kind === 'story' && (
        <>
          <IllustrationSection />
          <ColouringSection />
        </>
      )}
      <PageActionsBar book={book} pageRef={pageRef} />
    </section>
  );
}
