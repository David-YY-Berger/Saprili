// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { LibraryPage } from '@/features/library/LibraryPage';
import { MySettingsPage } from '@/features/settings/MySettingsPage';
import { NotFoundPage } from './NotFoundPage';
import { ComingSoonPage } from './ComingSoonPage';

function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);
  return route;
}

export function AppRoutes() {
  const route = useHashRoute();
  if (route === '#/' || route === '#') return <LibraryPage />;
  if (route === '#/settings') return <MySettingsPage />;
  if (route === '#/import' || /^#\/book\/[^/]+(?:\/(?:setup|settings|cover|colophon|page\/[^/]+))?$/.test(route)) {
    return <ComingSoonPage />;
  }
  return <NotFoundPage />;
}
