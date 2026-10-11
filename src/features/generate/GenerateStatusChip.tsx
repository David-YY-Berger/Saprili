// bisiyata dishmaya, leharbot ahava biyisral
import type { BookJobsState } from './useBookJobs';
import { summarizeJobs } from './BatchProgress';

/** Toolbar chip: shows progress while a batch runs; the dialog can be closed meanwhile. */
export function GenerateStatusChip({
  jobsState,
  onOpen,
}: {
  jobsState: BookJobsState;
  onOpen: () => void;
}) {
  const { batch, jobs } = jobsState;
  if (!batch || (batch.state !== 'running' && batch.state !== 'paused')) return null;
  const counts = summarizeJobs(jobs);
  const label =
    batch.state === 'paused'
      ? `Generation paused · ${counts.done}/${counts.total}`
      : `Generating · ${counts.done}/${counts.total}`;
  return (
    <button
      aria-label={`${label}. Open Generate`}
      className={`generate-chip generate-chip--${batch.state}`}
      onClick={onOpen}
      type="button"
    >
      {label}
    </button>
  );
}
