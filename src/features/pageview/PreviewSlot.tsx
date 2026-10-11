// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { useThumb } from '@/images/useThumb';

export function PreviewSlot({
  book,
  pageRef,
  edition,
}: {
  book: Book;
  pageRef: PageRef;
  edition: 'colour' | 'colouring';
}) {
  let imageId: string | null = null;
  let label: string;
  if (pageRef.kind === 'intro') {
    imageId = book.intro.photos[0]?.originalImageId ?? null;
    label = 'Intro page preview';
  } else if (pageRef.kind === 'story') {
    const page = book.storyPages.find((candidate) => candidate.id === pageRef.id);
    imageId =
      edition === 'colour'
        ? (page?.illustration.currentImageId ?? null)
        : (page?.colouring.imageId ?? null);
    label = page?.privateTitle || 'Story page preview';
  } else {
    label = 'Colophon page preview';
  }
  return <PagePreviewPlaceholder imageId={imageId} label={label} />;
}

export function PagePreviewPlaceholder({
  imageId,
  label,
}: {
  imageId: string | null;
  label: string;
}) {
  const { url: thumbnail, error } = useThumb(imageId);
  return (
    <div aria-label={label} className="page-preview-placeholder" role="img">
      {thumbnail ? (
        <img alt="" src={thumbnail} />
      ) : error ? (
        <span>Picture preview unavailable</span>
      ) : (
        <span>Preview arrives in Phase 6</span>
      )}
    </div>
  );
}
