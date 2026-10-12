// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getCoverImageIds } from '@/layout/render/pageImages';
import { Tooltip } from '@/ui/Tooltip';

export function CoverRow({ book }: { book: Book }) {
  const hasIllustration = getCoverImageIds(book).length > 0;
  return (
    <a className="book-row book-row--cover" href={`#/book/${encodeURIComponent(book.id)}/cover`}>
      <span className="book-row__title">Cover</span>
      <span className="book-row__summary">
        {hasIllustration ? 'Cover artwork ready' : 'No cover artwork yet'}
      </span>
      <Tooltip content={hasIllustration ? 'Cover artwork ready' : 'No cover artwork'}>
        <span aria-hidden="true" className={`row-indicator${hasIllustration ? ' is-present' : ''}`}>
          {hasIllustration ? '✓' : '–'}
        </span>
      </Tooltip>
    </a>
  );
}
