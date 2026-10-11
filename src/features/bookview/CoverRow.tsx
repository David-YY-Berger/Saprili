// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { Tooltip } from '@/ui/Tooltip';

export function CoverRow({ book }: { book: Book }) {
  const hasIllustration =
    book.cover.illustration.currentImageId !== null || book.cover.ownImageId !== null;
  return (
    <a className="book-row book-row--cover" href={`#/book/${encodeURIComponent(book.id)}/cover`}>
      <span className="book-row__title">Cover</span>
      <span className="book-row__summary">
        {hasIllustration ? 'Cover illustration ready' : 'No cover illustration yet'}
      </span>
      <Tooltip content={hasIllustration ? 'Cover illustration ready' : 'No cover illustration'}>
        <span aria-hidden="true" className={`row-indicator${hasIllustration ? ' is-present' : ''}`}>
          {hasIllustration ? '✓' : '–'}
        </span>
      </Tooltip>
    </a>
  );
}
