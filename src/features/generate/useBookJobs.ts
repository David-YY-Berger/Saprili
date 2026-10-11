// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Job, JobBatch } from '@/domain/job';
import { toAppError, type AppError } from '@/shared/errors';
import { JobsClient } from './JobsClient';

const POLL_MS = 5000;

export interface BookJobsState {
  batch: JobBatch | null;
  jobs: Job[];
  error: AppError | null;
  refresh: () => Promise<void>;
}

export function isActiveBatch(batch: JobBatch | null): boolean {
  return batch?.state === 'running' || batch?.state === 'paused';
}

/**
 * The latest batch of a book and its jobs, kept current by worker events. The tab only displays
 * this; the queue itself runs in the job host.
 */
export function useBookJobs(bookId: string, onResultSaved?: () => void): BookJobsState {
  const [batch, setBatch] = useState<JobBatch | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const savedRef = useRef(onResultSaved);
  savedRef.current = onResultSaved;

  const refresh = useCallback(async () => {
    try {
      const snapshot = await JobsClient.getSnapshot(bookId);
      const latest = snapshot.batches[snapshot.batches.length - 1];
      setBatch(latest?.batch ?? null);
      setJobs(latest?.jobs ?? []);
      setError(null);
    } catch (caught) {
      setError(toAppError(caught));
    }
  }, [bookId]);

  useEffect(() => {
    void refresh();
    return JobsClient.subscribe((event) => {
      if (event.bookId !== bookId) return;
      if (event.type === 'jobs/progress' && event.status === 'succeeded') savedRef.current?.();
      void refresh();
    });
  }, [bookId, refresh]);

  const active = isActiveBatch(batch);
  useEffect(() => {
    if (!active) return undefined;
    // Events can be missed while the service worker restarts, so a running batch is re-read.
    const handle = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(handle);
  }, [active, refresh]);

  return { batch, jobs, error, refresh };
}
