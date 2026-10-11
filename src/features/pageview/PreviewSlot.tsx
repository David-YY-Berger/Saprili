// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { PagePreview } from './PagePreview';

export function PreviewSlot({
  book,
  pageRef,
  edition,
  showGuides = false,
  side = 'right',
}: {
  book: Book;
  pageRef: PageRef;
  edition: 'colour' | 'colouring';
  showGuides?: boolean;
  side?: 'left' | 'right';
}) {
  let label: string;
  if (pageRef.kind === 'intro') {
    label = 'Intro page preview';
  } else if (pageRef.kind === 'story') {
    const page = book.storyPages.find((candidate) => candidate.id === pageRef.id);
    label = page?.privateTitle || 'Story page preview';
  } else {
    label = 'Colophon page preview';
  }
  return (
    <PagePreview
      book={book}
      edition={edition}
      label={label}
      pageRef={pageRef}
      showGuides={showGuides}
      side={side}
    />
  );
}
