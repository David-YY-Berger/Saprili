// bisiyata dishmaya, leharbot ahava biyisral
import type { Job } from '@/domain/job';
import type { JobQueue } from './JobQueue';
import type { JobRunner } from './JobRunner';

/**
 * `'continue'`: the host woke up mid-session (Chrome stopped an idle worker), so work carries on.
 * `'pause'`: the browser or extension restarted, so batches wait for the user to resume.
 */
export type ResumeMode = 'continue' | 'pause';

export async function resumeOnStartup(deps: {
  queue: JobQueue;
  runner: JobRunner;
  mode: ResumeMode;
  hasOutputSince: (job: Job) => Promise<boolean>;
}): Promise<void> {
  await deps.queue.recoverInterrupted(deps.mode, deps.hasOutputSince);
  await deps.runner.pump();
}
