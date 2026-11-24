// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch } from '@/domain/job';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';

export function summarizeJobs(jobs: readonly Job[]) {
  const count = (status: Job['status']) => jobs.filter((job) => job.status === status).length;
  const done = count('succeeded');
  const failed = count('failed');
  const cancelled = count('cancelled');
  return {
    total: jobs.length,
    done,
    failed,
    cancelled,
    working: count('running'),
    waiting: count('queued') + count('paused'),
    finished: done + failed + cancelled,
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
      <progress
        aria-label="Batch progress"
        aria-valuetext={`${counts.finished} of ${counts.total} finished`}
        max={counts.total}
        value={counts.finished}
      />
      <p aria-live="polite">
        {stateText} · {counts.finished} of {counts.total} finished
        {counts.done > 0 ? ` · ${counts.done} done` : ''}
        {counts.failed > 0 ? ` · ${counts.failed} failed` : ''}
        {counts.cancelled > 0 ? ` · ${counts.cancelled} cancelled` : ''}
        {counts.working > 0 ? ` · ${counts.working} working` : ''}
        {counts.waiting > 0 ? ` · ${counts.waiting} waiting` : ''}
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
