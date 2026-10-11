// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect } from 'react';
import type { SavedStatus } from '@/shared/useAutosave';

export function useBeforeUnloadGuard(status: SavedStatus): void {
  useEffect(() => {
    if (status !== 'saving' && status !== 'failed') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [status]);
}
