// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';

export function ColophonRow({ book }: { book: Book }) {
  return (
    <a className="book-row book-row--colophon" href={`#/book/${encodeURIComponent(book.id)}/colophon`}>
      <span className="book-row__title">Colophon</span>
      <span className="book-row__summary">The book&apos;s closing page</span>
    </a>
  );
}
