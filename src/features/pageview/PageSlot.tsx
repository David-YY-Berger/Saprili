// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { PreviewSlot } from './PreviewSlot';

export function PageSlot({
  book,
  pageRef,
  side,
  selected,
  onSelect,
  edition = 'colour',
  showGuides = false,
}: {
  book: Book;
  pageRef: PageRef | null;
  side: 'left' | 'right';
  selected: boolean;
  onSelect: (ref: PageRef) => void;
  edition?: 'colour' | 'colouring';
  showGuides?: boolean;
}) {
  if (!pageRef) return <div aria-hidden="true" className="page-slot page-slot--empty" />;
  return (
    <button
      aria-pressed={selected}
      className={`page-slot${selected ? ' page-slot--selected' : ''}`}
      onClick={() => onSelect(pageRef)}
      type="button"
    >
      <span className="page-slot__side">{side}</span>
      <PreviewSlot book={book} edition={edition} pageRef={pageRef} showGuides={showGuides} side={side} />
    </button>
  );
}
