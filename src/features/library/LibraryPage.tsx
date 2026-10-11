// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { BookSummary } from '@/domain/book';
import { bookRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Spinner } from '@/ui/Spinner';
import { undoManager } from '@/ui/UndoManager';
import { useToast } from '@/ui/ToastHost';
import { BookCard } from './BookCard';
import { EmptyLibraryState } from './EmptyLibraryState';
import { useBookSummaries } from './useBookSummaries';

export function LibraryPage() {
  const { books, setBooks, loading, error, refresh } = useBookSummaries();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const { showToast } = useToast();
  const visibleBooks = books.filter((book) => !hiddenIds.has(book.id));

  const duplicate = async (book: BookSummary) => {
    try {
      const copy = await bookRepository.duplicateBook(book.id);
      setBooks((current) =>
        [
          ...current,
          {
            id: copy.id,
            title: copy.title,
            pageCount: book.pageCount,
            modifiedAt: copy.modifiedAt,
            thumbImageId:
              copy.cover.illustration.currentImageId ??
              copy.cover.ownImageId ??
              copy.intro.photos[0]?.originalImageId ??
              null,
          },
        ].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
      );
      showToast(`Created “${copy.title}”.`);
    } catch (duplicateError) {
      const appError = toAppError(duplicateError);
      showToast(`${appError.userMessage} ${appError.nextStep}`, 'error');
    }
  };

  const remove = (book: BookSummary) => {
    setHiddenIds((current) => new Set(current).add(book.id));
    undoManager.registerUndo({
      label: `“${book.title}” is ready to be deleted`,
      undo: () => {
        setHiddenIds((current) => {
          const next = new Set(current);
          next.delete(book.id);
          return next;
        });
      },
      onExpire: async () => {
        try {
          await bookRepository.deleteBook(book.id);
          await refresh();
        } catch (deleteError) {
          setHiddenIds((current) => {
            const next = new Set(current);
            next.delete(book.id);
            return next;
          });
          throw deleteError;
        }
      },
    });
  };

  if (loading) {
    return (
      <div aria-label="Loading your library" className="surface-card" role="status">
        <Spinner /> Loading your books…
      </div>
    );
  }

  if (error !== null) {
    const appError = toAppError(error);
    return (
      <section aria-labelledby="library-heading">
        <header className="page-heading">
          <h2 id="library-heading">Your library</h2>
        </header>
        <Banner type="error" title={appError.userMessage}>
          {appError.nextStep}
        </Banner>
        <Button onClick={() => void refresh()} variant="secondary">
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="library-heading">
      <header className="page-heading">
        <h2 id="library-heading">Your library</h2>
        <p>Your family’s stories, ready to grow.</p>
      </header>
      {visibleBooks.length === 0 ? (
        <EmptyLibraryState allowImport={books.length === 0} />
      ) : (
        <>
          <div className="library-toolbar">
            <p>
              {visibleBooks.length} {visibleBooks.length === 1 ? 'book' : 'books'}
            </p>
          </div>
          <div className="book-grid">
            {visibleBooks.map((book) => (
              <BookCard
                book={book}
                key={book.id}
                onDelete={() => remove(book)}
                onDuplicate={() => void duplicate(book)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
