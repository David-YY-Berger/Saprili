// bisiyata dishmaya, leharbot ahava biyisral
import { lazy, Suspense, useEffect, useState } from 'react';
import { t } from '@/i18n';
import { toAppError } from '@/shared/errors';
import { bookRepository } from '@/storage/repositories';

// Developer-only layout review page; dropped from production builds.
const LayoutDevPage =
  import.meta.env.MODE === 'production'
    ? null
    : lazy(() =>
        import('@/features/devlayout/LayoutDevPage').then((m) => ({ default: m.LayoutDevPage })),
      );

// Placeholder shell; the real header, routes and pages arrive in Phase 2.
export function AppRoot() {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    bookRepository
      .listBookSummaries()
      .then((books) => setStatus(t('app.storage.ready', { count: books.length })))
      .catch((error) => {
        const appError = toAppError(error);
        setStatus(`${t('app.storage.failed')} ${appError.userMessage} ${appError.nextStep}`);
      });
  }, []);

  if (LayoutDevPage && window.location.hash === '#/dev/layout') {
    return (
      <Suspense fallback={null}>
        <LayoutDevPage />
      </Suspense>
    );
  }

  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
      <p role="status">{status}</p>
    </main>
  );
}
