// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useState } from 'react';
import type { JobBatch } from '@/domain/job';
import { toAppError, type AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { JobsClient } from './JobsClient';

/** Shown on app open (and when a batch stops) so paused generation is never forgotten. */
export function ResumePrompt() {
  const [paused, setPaused] = useState<JobBatch[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await JobsClient.getSnapshot();
      setPaused(snapshot.batches.map((entry) => entry.batch).filter((b) => b.state === 'paused'));
    } catch {
      // No host or no batches: nothing to resume.
      setPaused([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return JobsClient.subscribe((event) => {
      if (event.type === 'jobs/batchStateChanged' || event.type === 'jobs/fatalStop') void refresh();
    });
  }, [refresh]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refresh();
    } catch (caught) {
      setError(toAppError(caught));
    } finally {
      setBusy(false);
    }
  };

  const batch = paused[0];
  if (!batch) return null;
  return (
    <div className="resume-prompt">
      <Banner type="warning" title="Generation is paused.">
        {batch.pauseReason ?? 'Resume to continue from where it stopped.'}
      </Banner>
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
      <div className="modal__actions">
        <Button disabled={busy} onClick={() => void act(() => JobsClient.resume(batch.id))}>
          Resume
        </Button>
        <Button
          disabled={busy}
          onClick={() => void act(() => JobsClient.cancelBatch(batch.id))}
          variant="secondary"
        >
          Cancel remaining
        </Button>
      </div>
    </div>
  );
}
