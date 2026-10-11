// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect } from 'react';
import { useBookStore } from '@/features/pageview/useBookStore';
import { JobsClient } from './JobsClient';

/** Keeps the page editor's open book in step with images the job host saved. */
export function useGeneratedResultSync(): void {
  useEffect(
    () =>
      JobsClient.subscribe((event) => {
        if (event.type === 'jobs/progress' && event.status === 'succeeded') {
          void useBookStore.getState().mergeGenerated(event.bookId);
        }
      }),
    [],
  );
}
