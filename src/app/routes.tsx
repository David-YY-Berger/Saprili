// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import type { Book } from '@/domain/book';
import { BookViewPage } from '@/features/bookview/BookViewPage';
import { ImportCsvPage } from '@/features/importcsv/ImportCsvPage';
import { SetupPage } from '@/features/setup/SetupPage';
import { useSetupGuard } from '@/features/setup/useSetupGuard';
import { bookRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Spinner } from '@/ui/Spinner';
import { LibraryPage } from '@/features/library/LibraryPage';
import { MySettingsPage } from '@/features/settings/MySettingsPage';
import { PageViewPage } from '@/features/pageview/PageViewPage';
import { BookSettingsPage } from '@/features/booksettings/BookSettingsPage';
import { ColophonEditorPage } from '@/features/colophon/ColophonEditorPage';
import { ComingSoonPage } from './ComingSoonPage';
import { NotFoundPage } from './NotFoundPage';

function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);
  return route;
}

function BookRoute({ bookId, subroute }: { bookId: string; subroute: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadedRoute, setLoadedRoute] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const currentBook = loadedId === bookId && loadedRoute === subroute ? book : null;
  const isSetup = subroute === '/setup';
  useSetupGuard(bookId, isSetup ? null : currentBook);

  useEffect(() => {
    let active = true;
    setError(null);
    void bookRepository
      .getBook(bookId)
      .then((result) => {
        if (!active) return;
        setBook(result);
        setLoadedId(bookId);
        setLoadedRoute(subroute);
      })
      .catch((loadError: unknown) => {
        if (active) setError(toAppError(loadError));
      });
    return () => {
      active = false;
    };
  }, [bookId, subroute]);

  if (error) {
    return (
      <section aria-labelledby="book-error-heading">
        <h2 id="book-error-heading">This book could not be opened</h2>
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      </section>
    );
  }
  if (loadedId !== bookId || loadedRoute !== subroute) {
    return (
      <div aria-label="Loading book" className="surface-card" role="status">
        <Spinner /> Loading book…
      </div>
    );
  }
  if (!currentBook) return <NotFoundPage />;
  if (isSetup) {
    return (
      <SetupPage
        book={currentBook}
        onConfirmed={(saved) => setBook(saved)}
      />
    );
  }
  if (subroute === '') return <BookViewPage book={currentBook} />;
  if (subroute === '/settings') return <BookSettingsPage initialBook={currentBook} />;
  if (subroute === '/colophon') return <ColophonEditorPage initialBook={currentBook} />;
  if (subroute.startsWith('/page/')) {
    const pageId = decodeRoutePart(subroute.slice('/page/'.length));
    if (pageId === null) return <NotFoundPage />;
    return <PageViewPage book={currentBook} key={pageId} pageId={pageId} />;
  }
  return <ComingSoonPage />;
}

function decodeRoutePart(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function AppRoutes() {
  const route = useHashRoute();
  if (route === '#/' || route === '#') return <LibraryPage />;
  if (route === '#/settings') return <MySettingsPage />;
  if (route === '#/import') return <ImportCsvPage />;

  const bookMatch =
    /^#\/book\/([^/]+)(\/setup|\/settings|\/cover|\/colophon|\/page\/[^/]+)?$/.exec(route);
  if (bookMatch) {
    const bookId = decodeRoutePart(bookMatch[1]!);
    if (bookId === null) return <NotFoundPage />;
    return <BookRoute bookId={bookId} subroute={bookMatch[2] ?? ''} />;
  }
  return <NotFoundPage />;
}
