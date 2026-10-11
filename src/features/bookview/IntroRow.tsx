// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { RowIndicators } from './RowIndicators';
import { getRowStatus } from './rowStatus';

export function IntroRow({ book }: { book: Book }) {
  return (
    <a
      className="book-row book-row--intro"
      href={`#/book/${encodeURIComponent(book.id)}/page/${encodeURIComponent(book.intro.id)}`}
    >
      <span className="book-row__title">Intro</span>
      <span className="book-row__summary">{book.intro.privateTitle || 'Character introduction'}</span>
      <RowIndicators status={getRowStatus(book.intro)} />
    </a>
  );
}
