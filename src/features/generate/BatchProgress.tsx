// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch } from '@/domain/job';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';

export function summarizeJobs(jobs: readonly Job[]) {
  const count = (status: Job['status']) => jobs.filter((job) => job.status === status).length;
  return {
    total: jobs.length,
    done: count('succeeded'),
    failed: count('failed'),
    cancelled: count('cancelled'),
    working: count('running'),
  };
}

export function BatchProgress({
  batch,
  jobs,
  busy,
  onCancel,
  onRetryFailed,
  onResume,
}: {
  batch: JobBatch;
  jobs: readonly Job[];
  busy: boolean;
  onCancel: () => void;
  onRetryFailed: () => void;
  onResume: () => void;
}) {
  const counts = summarizeJobs(jobs);
  const active = batch.state === 'running' || batch.state === 'paused';
  const stateText = {
    running: 'Generating in the background. You can close this window.',
    paused: 'Paused',
    completed: 'Finished',
    cancelled: 'Cancelled',
  }[batch.state];

  return (
    <section aria-label="Batch progress" className="batch-progress">
      <progress aria-label="Batch progress" max={counts.total} value={counts.done + counts.failed + counts.cancelled} />
      <p aria-live="polite">
        {stateText} · {counts.done} of {counts.total} done
        {counts.failed > 0 ? ` · ${counts.failed} failed` : ''}
      </p>
      {batch.state === 'paused' && batch.pauseReason && (
        <Banner type="warning">{batch.pauseReason}</Banner>
      )}
      {jobs
        .filter((job) => job.status === 'failed' && job.errorMessage)
        .slice(0, 3)
        .map((job) => (
          <Banner key={job.id} type="error">
            {job.errorMessage}
          </Banner>
        ))}
      <div className="modal__actions">
        {batch.state === 'paused' && (
          <Button disabled={busy} onClick={onResume}>
            Resume
          </Button>
        )}
        {counts.failed > 0 && batch.state !== 'cancelled' && (
          <Button disabled={busy} onClick={onRetryFailed} variant="secondary">
            Retry failed
          </Button>
        )}
        {active && (
          <Button disabled={busy} onClick={onCancel} variant="danger">
            Cancel remaining
          </Button>
        )}
      </div>
    </section>
  );
}
