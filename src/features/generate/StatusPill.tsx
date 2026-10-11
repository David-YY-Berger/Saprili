// bisiyata dishmaya, leharbot ahava biyisral
import type { JobStatus } from '@/domain/job';

const LABELS: Record<JobStatus, string> = {
  queued: 'Waiting',
  running: 'Working',
  succeeded: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

export function StatusPill({ status, prefix }: { status: JobStatus; prefix?: string }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      {prefix ? `${prefix}: ` : ''}
      {LABELS[status]}
    </span>
  );
}
