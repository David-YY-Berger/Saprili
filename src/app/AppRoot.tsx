// bisiyata dishmaya, leharbot ahava biyisral
import { lazy, Suspense } from 'react';
import { AppHeader } from './AppHeader';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastHost } from '@/ui/ToastHost';
import { ResumePrompt } from '@/features/generate/ResumePrompt';
import { useGeneratedResultSync } from '@/features/generate/useGeneratedResultSync';

// Developer-only layout review page; dropped from production builds.
const LayoutDevPage =
  import.meta.env.MODE === 'production'
    ? null
    : lazy(() =>
        import('@/features/devlayout/LayoutDevPage').then((m) => ({ default: m.LayoutDevPage })),
      );

export function AppRoot() {
  useGeneratedResultSync();
  if (LayoutDevPage && window.location.hash === '#/dev/layout') {
    return (
      <Suspense fallback={null}>
        <LayoutDevPage />
      </Suspense>
    );
  }

  return (
    <ToastHost>
      <ErrorBoundary>
        <div className="app-shell">
          <AppHeader />
          <main className="app-content">
            <ResumePrompt />
            <AppRoutes />
          </main>
        </div>
      </ErrorBoundary>
    </ToastHost>
  );
}
