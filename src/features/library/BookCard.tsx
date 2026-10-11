// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { BookSummary } from '@/domain/book';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { BookCardMenu } from './BookCardMenu';
import { BookThumbnail } from './BookThumbnail';

function formatModifiedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export function BookCard({
  book,
  onDuplicate,
  onDelete,
}: {
  book: BookSummary;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <article className="book-card">
      <a
        aria-label={`Open ${book.title}`}
        className="book-card__cover-link"
        href={`#/book/${encodeURIComponent(book.id)}`}
      >
        <BookThumbnail imageId={book.thumbImageId} title={book.title} />
      </a>
      <div className="book-card__body">
        <h3 className="book-card__title">
          <a href={`#/book/${encodeURIComponent(book.id)}`}>{book.title}</a>
        </h3>
        <dl className="book-card__metadata">
          <div>
            <dt className="visually-hidden">Interior pages</dt>
            <dd>{book.pageCount} interior pages</dd>
          </div>
          <div>
            <dt className="visually-hidden">Last modified</dt>
            <dd>
              Updated <time dateTime={book.modifiedAt}>{formatModifiedAt(book.modifiedAt)}</time>
            </dd>
          </div>
        </dl>
        <div className="book-card__actions">
          <Button
            onClick={() => {
              window.location.hash = `#/book/${encodeURIComponent(book.id)}`;
            }}
            variant="secondary"
          >
            Open book
          </Button>
          <BookCardMenu
            bookTitle={book.title}
            onDelete={() => setConfirmingDelete(true)}
            onDuplicate={onDuplicate}
          />
        </div>
      </div>
      <ConfirmDialog
        confirmLabel="Delete book"
        message={`Delete “${book.title}”? You can undo this for a few seconds.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
        open={confirmingDelete}
        title="Delete this book?"
      />
    </article>
  );
}
